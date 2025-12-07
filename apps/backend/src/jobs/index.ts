import unzipper from 'unzipper';
import csv from 'csv-parser';
import { Readable } from 'node:stream';
import { format, parse, subDays } from 'date-fns';
import fs from 'node:fs/promises';

import {
  agencySchema,
  feedInfoSchema,
  type Agency,
  type FeedInfo,
  type FeedVersion,
  calendarSchema,
  type Calendar,
  calendarDateSchema,
  type CalendarDate,
  routeSchema,
  type Route,
  shapeSchema,
  type Shape,
  stopSchema,
  type Stop,
  stopTimeSchema,
  type StopTime,
  tripSchema,
  type Trip,
} from '../schemas/gtfs-static';
import { stripBOM } from '../lib/utils';
import z from 'zod';
import { prisma } from '../db';

function parseCsvStream<T extends z.ZodType>(
  stream: Readable,
  schema: T,
): Promise<z.infer<T>[]> {
  return new Promise<z.infer<T>[]>((resolve, reject) => {
    const results: z.infer<typeof schema>[] = [];
    stream
      .pipe(stripBOM())
      .pipe(csv())
      .on('data', (data) => {
        const parsedResult = schema.safeParse(data);
        if (!parsedResult.success) {
          reject(parsedResult.error);
          return;
        }
        results.push(parsedResult.data);
      })
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

async function fetchStaticFeed(): Promise<string | null> {
  try {
    const response = await fetch(
      'https://www.ztm.poznan.pl/pl/dla-deweloperow/getGTFSFile',
      {
        headers: {
          Accept: 'application/octet-stream',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );

    const arrayBuffer = await response.arrayBuffer();

    const dir = await unzipper.Open.buffer(Buffer.from(arrayBuffer));

    const path = `tmp/${Date.now()}`;

    await dir.extract({
      path,
    });

    return path;
  } catch (err) {
    console.error('Failed to fetch static feed:', err);
    return null;
  }
}

async function parseFile<T extends z.ZodType>(
  file: string,
  schema: T,
): Promise<z.infer<T>[]> {
  const content = await fs.readFile(file);
  const buf = Buffer.from(content.buffer);
  const results: z.infer<T>[] = await parseCsvStream(
    Readable.from(buf),
    schema,
  );

  return results;
}

async function isFetchedNewFeed(path: string): Promise<FeedInfo | null> {
  try {
    const files = await fs.readdir(path);
    let feedInfoItems: FeedInfo[] = [];
    for (const file of files) {
      if (file === 'feed_info.txt') {
        feedInfoItems = await parseFile(`${path}/${file}`, feedInfoSchema);
      }
    }

    if (feedInfoItems.length === 0) return null;

    const feedInfo = feedInfoItems[0];

    const feedStartDate = parse(
      feedInfo.feed_start_date,
      'yyyyMMdd',
      new Date(),
    );

    const existingVersion = await prisma.feedVersion.findFirst({
      where: {
        feedSourceId: 1,
        feedStartDate: feedStartDate,
      },
    });

    return existingVersion === null ? feedInfo : null;
  } catch (err) {
    console.error(err);
    return null;
  }
}

async function createNewFeedVersion(feedInfo: FeedInfo) {
  try {
    const validFrom = parse(feedInfo.feed_start_date, 'yyyyMMdd', new Date());
    const validTo = parse(feedInfo.feed_end_date, 'yyyyMMdd', new Date());

    const feedVersion = await prisma.$transaction(async (tx) => {
      await tx.feedVersion.updateMany({
        where: {
          feedSourceId: 1,
          feedEndDate: {
            gt: validFrom,
          },
        },
        data: {
          feedEndDate: subDays(validFrom, 1),
        },
      });

      const feedVersion = await tx.feedVersion.create({
        data: {
          feedSourceId: 1,
          feedStartDate: validFrom,
          feedEndDate: validTo,
        },
      });

      return feedVersion;
    });

    return {
      feed_version_id: feedVersion.id,
      feed_source_id: feedVersion.feedSourceId,
      feed_start_date: format(feedVersion.feedStartDate!, 'yyyyMMdd'),
      feed_end_date: format(feedVersion.feedEndDate!, 'yyyyMMdd'),
      fetched_at: feedVersion.fetchedAt,
    };
  } catch (err) {
    console.error(err);
    throw err;
  }
}

async function processFeedFiles(files: string[], feedVersion: number) {
  try {
    const promises = files.map(async (f) => {
      const fileName = f.split('/').at(-1);
      if (fileName === 'agency.txt') {
        const data = await parseFile(f, agencySchema);
        await saveAgencies(data, feedVersion);
      } else if (fileName === 'calendar.txt') {
        const data = await parseFile(f, calendarSchema);
        await saveCalendars(data, feedVersion);
      } else if (fileName === 'calendar_dates.txt') {
        const data = await parseFile(f, calendarDateSchema);
        await saveCalendarDates(data, feedVersion);
      } else if (fileName === 'routes.txt') {
        const data = await parseFile(f, routeSchema);
        await saveRoutes(data, feedVersion);
      } else if (fileName === 'shapes.txt') {
        // error
        const data = await parseFile(f, shapeSchema);
        await saveShapes(data, feedVersion);
      } else if (fileName === 'stops.txt') {
        const data = await parseFile(f, stopSchema);
        await saveStops(data, feedVersion);
      } else if (fileName === 'trips.txt') {
        // error
        const data = await parseFile(f, tripSchema);
        await saveTrips(data, feedVersion);
      }
    });
    await Promise.all(promises);
  } catch (err) {
    console.error(err);
  }
}

async function saveAgencies(agencies: Agency[], feedVersion: number) {
  const records = agencies.map((a) => ({
    agencyId: a.agency_id,
    feedVersionId: feedVersion,
    agencyName: a.agency_name,
    agencyUrl: a.agency_url,
    agencyTimezone: a.agency_timezone,
    agencyPhone: a.agency_phone ?? null,
    agencyLang: a.agency_lang ?? null,
    agencyFareUrl: a.agency_fare_url ?? null,
    agencyEmail: a.agency_email ?? null,
    cemvSupport: a.cemv_support ? parseInt(a.cemv_support) : 0,
  }));

  await prisma.agency.createMany({
    data: records,
    skipDuplicates: true,
  });
}

async function saveCalendars(calendars: Calendar[], feedVersion: number) {
  const records = calendars.map((c) => ({
    serviceId: c.service_id,
    feedVersionId: feedVersion,
    monday: parseInt(c.monday),
    tuesday: parseInt(c.tuesday),
    wednesday: parseInt(c.wednesday),
    thursday: parseInt(c.thursday),
    friday: parseInt(c.friday),
    saturday: parseInt(c.saturday),
    sunday: parseInt(c.sunday),
    startDate: c.start_date,
    endDate: c.end_date,
  }));

  await prisma.calendar.createMany({
    data: records,
    skipDuplicates: true,
  });
}

async function saveCalendarDates(
  calendarDates: CalendarDate[],
  feedVersion: number,
) {
  if (calendarDates.length === 0) return;

  const records = calendarDates.map((c) => ({
    serviceId: c.service_id,
    feedVersionId: feedVersion,
    date: c.date,
    exceptionType: parseInt(c.exception_type),
  }));

  await prisma.calendarDate.createMany({
    data: records,
    skipDuplicates: true,
  });
}

async function saveRoutes(routes: Route[], feedVersion: number) {
  const records = routes.map((r) => ({
    routeId: r.route_id,
    feedVersionId: feedVersion,
    agencyId: r.agency_id,
    routeShortName: r.route_short_name,
    routeLongName: r.route_long_name,
    routeDesc: r.route_desc ?? null,
    routeType: parseInt(r.route_type),
    routeColor: r.route_color ?? null,
    routeTextColor: r.route_text_color ?? null,
  }));

  await prisma.route.createMany({
    data: records,
    skipDuplicates: true,
  });
}

async function saveShapes(shapes: Shape[], feedVersion: number) {
  const records = shapes.map((s) => ({
    shapeId: s.shape_id,
    feedVersionId: feedVersion,
    shapePtLat: parseFloat(s.shape_pt_lat),
    shapePtLon: parseFloat(s.shape_pt_lon),
    shapePtSequence: parseInt(s.shape_pt_sequence),
  }));

  if (records.length > 1000) {
    const batchesCount =
      Math.floor(records.length / 1000) + (records.length % 1000 > 0 ? 1 : 0);
    console.log(batchesCount);

    for (let i = 0; i < batchesCount; i++) {
      console.log('Uploading batch number:', i);
      await prisma.shape.createMany({
        data: records.slice(i * 1000, i * 1000 + 1000),
        skipDuplicates: true,
      });
    }
  } else {
    await prisma.shape.createMany({
      data: records,
      skipDuplicates: true,
    });
  }
}

async function saveStops(stops: Stop[], feedVersion: number) {
  const records = stops.map((s) => ({
    stopId: s.stop_id,
    feedVersionId: feedVersion,
    stopCode: s.stop_code ?? null,
    stopName: s.stop_name,
    stopLat: parseFloat(s.stop_lat),
    stopLon: parseFloat(s.stop_lon),
    zoneId: s.zone_id ?? null,
  }));

  await prisma.stop.createMany({
    data: records,
    skipDuplicates: true,
  });
}

async function saveStopTimes(stopTimes: StopTime[], feedVersion: number) {
  const records = stopTimes.map((s) => ({
    tripId: s.trip_id,
    feedVersionId: feedVersion,
    arrivalTime: s.arrival_time,
    departureTime: s.departure_time,
    stopId: s.stop_id,
    stopSequence: parseInt(s.stop_sequence),
    stopHeadsign: s.stop_headsign ?? null,
    pickupType: s.pickup_type ? parseInt(s.pickup_type) : null,
    dropOffType: s.drop_off_type ? parseInt(s.drop_off_type) : null,
  }));

  if (records.length > 1000) {
    const batchesCount =
      Math.floor(records.length / 1000) + (records.length % 1000 > 0 ? 1 : 0);
    console.log(batchesCount);

    for (let i = 0; i < batchesCount; i++) {
      console.log('Uploading stop_times:', i);
      await prisma.stopTime.createMany({
        data: records.slice(i * 1000, i * 1000 + 1000),
        skipDuplicates: true,
      });
    }
  } else {
    await prisma.stopTime.createMany({
      data: records,
      skipDuplicates: true,
    });
  }
}

async function saveTrips(trips: Trip[], feedVersion: number) {
  const records = trips.map((t) => ({
    tripId: t.trip_id,
    feedVersionId: feedVersion,
    routeId: t.route_id,
    serviceId: t.service_id,
    tripHeadsign: t.trip_headsign ?? null,
    directionId: t.direction_id ? parseInt(t.direction_id) : null,
    shapeId: t.shape_id ?? null,
    wheelchairAccessible: t.wheelchair_accessible
      ? parseInt(t.wheelchair_accessible)
      : null,
    brigade: t.brigade ?? null,
  }));

  if (records.length > 1000) {
    const batchesCount =
      Math.floor(records.length / 1000) + (records.length % 1000 > 0 ? 1 : 0);
    console.log(batchesCount);

    for (let i = 0; i < batchesCount; i++) {
      console.log('Uploading trips:', i);
      await prisma.trip.createMany({
        data: records.slice(i * 1000, i * 1000 + 1000),
        skipDuplicates: true,
      });
    }
  } else {
    await prisma.trip.createMany({
      data: records,
      skipDuplicates: true,
    });
  }
}

async function cleanUp(path: string) {
  await fs.rm(path, {
    recursive: true,
  });
}

export async function syncFeed() {
  const feedPath = await fetchStaticFeed();

  if (!feedPath) return;

  const feedInfo = await isFetchedNewFeed(feedPath);

  if (feedInfo == null) return;

  const version = await createNewFeedVersion(feedInfo);

  const files = (await fs.readdir(feedPath))
    .filter((f) => f !== 'feed_info.txt' && f !== 'stop_times.txt')
    .map((f) => `${feedPath}/${f}`);

  await processFeedFiles(files, version.feed_version_id);

  const data = await parseFile(`${feedPath}/stop_times.txt`, stopTimeSchema);
  await saveStopTimes(data, version.feed_version_id);

  await cleanUp(feedPath);

  console.log('Feed synced');
}
