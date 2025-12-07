import { Cron } from 'croner';
import { mkdir, rename } from 'node:fs/promises';
import GtfsRt from 'gtfs-realtime-bindings';

import { tryCatch } from '../lib/try-catch';

const TRIPS_URL =
  'https://www.ztm.poznan.pl/pl/dla-deweloperow/getGtfsRtFile?file=trip_updates.pb';
const POSITIONS_URL =
  'https://www.ztm.poznan.pl/pl/dla-deweloperow/getGtfsRtFile?file=vehicle_positions.pb';
const STORAGE_PATH = 'data/gtfs_rt';

const fetchBuf = async (url: string) => {
  const response = await fetch(url);

  const arrayBuf = await response.arrayBuffer();

  return Buffer.from(arrayBuf);
};

const prepareDir = async (dirName: 'trip_updates' | 'vehicle_positions') => {
  const path = `${STORAGE_PATH}/${dirName}`;
  await mkdir(path, { recursive: true });
  return path;
};

function* readTripUpdate(buf: Buffer, ts: number) {
  const feed = GtfsRt.transit_realtime.FeedMessage.decode(buf);
  const headerTs = Number(feed.header?.timestamp ?? ts);

  for (const e of feed.entity) {
    if (!e.tripUpdate) continue;
    const tu = e.tripUpdate;
    if (!tu.stopTimeUpdate) continue;
    for (const stu of tu.stopTimeUpdate) {
      yield {
        feed_ts: ts,
        header_ts: headerTs,
        trip_id: tu.trip?.tripId ?? null,
        route_id: tu.trip?.routeId ?? null,
        stop_id: stu.stopId ?? null,
        stop_sequence: stu.stopSequence ?? null,
        arr_time: stu.arrival?.time ?? null,
        dep_time: stu.departure?.time ?? null,
        delay: stu.arrival?.delay ?? stu.departure?.delay ?? null,
        schedule_rel: tu.trip?.scheduleRelationship ?? 0,
        vehicle_id: tu.vehicle?.id ?? null,
      };
    }
  }
}

function* readVehiclePosition(buf: Buffer, ts: number) {
  const feed = GtfsRt.transit_realtime.FeedMessage.decode(buf);

  const headerTs = Number(feed.header?.timestamp ?? ts);

  for (const e of feed.entity) {
    if (!e.vehicle) continue;
    const v = e.vehicle;
    const pos = v.position;

    yield {
      feed_ts: ts,
      header_ts: headerTs,
      veh_ts: v.timestamp != null ? Number(v.timestamp) : null,

      vehicle_id: v.vehicle?.id ?? null,
      trip_id: v.trip?.tripId ?? null,
      route_id: v.trip?.routeId ?? null,
      direction_id: v.trip?.directionId ?? null,

      lat: pos?.latitude ?? null,
      lon: pos?.longitude ?? null,
      bearing: pos?.bearing ?? null,
      speed: pos?.speed ?? null,
      odometer: pos?.odometer ?? null,

      current_status: v.currentStatus ?? null,
      current_stop_sequence: v.currentStopSequence ?? null,
      stop_id: v.stopId ?? null,

      congestion_level: v.congestionLevel ?? null,
      occupancy_status: v.occupancyStatus ?? null,
      occupancy_percentage: v.occupancyPercentage ?? null,
    };
  }
}

async function dumpNdjson(filePath: string, it: Iterable<any>) {
  const tmpPath = filePath + '.part';
  console.log(filePath, tmpPath);

  const tmpFile = Bun.file(tmpPath);
  const writer = tmpFile.writer();
  for (const row of it) {
    writer.write(JSON.stringify(row) + '\n');
  }
  await writer.end();
  await rename(tmpPath, filePath);
}

const realtimeDataIngest = async () => {
  console.log(new Date().toISOString());

  const [tripsBuf, positionsBuf] = await Promise.all([
    tryCatch(fetchBuf(TRIPS_URL)),
    tryCatch(fetchBuf(POSITIONS_URL)),
  ]);

  const ts = Date.now();

  if (tripsBuf.error) {
    console.error(tripsBuf.error);
    return;
  }
  const tripsDir = await prepareDir('trip_updates');
  const tripsFilePath = `${tripsDir}/${ts}.ndjson`;

  const tripsSavingResult = await tryCatch(
    dumpNdjson(tripsFilePath, readTripUpdate(tripsBuf.data, ts)),
  );

  if (tripsSavingResult.error) {
    console.error(tripsSavingResult.error);
    return;
  }

  if (positionsBuf.error) {
    console.error(positionsBuf.error);
    return;
  }
  const positionsDir = await prepareDir('vehicle_positions');
  const positionsFilePath = `${positionsDir}/${ts}.ndjson`;

  const positionsSavingResult = await tryCatch(
    dumpNdjson(positionsFilePath, readVehiclePosition(positionsBuf.data, ts)),
  );

  if (positionsSavingResult.error) {
    console.error(positionsSavingResult.error);
    return;
  }
};

new Cron(
  '* * * * * *',
  () => {
    realtimeDataIngest();
  },
  {
    interval: 10,
  },
);
