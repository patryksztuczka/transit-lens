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
import { sql } from '../database/db';

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

    const result = await sql`
      SELECT * FROM feed_versions WHERE feed_source_id = 1 AND feed_start_date = ${format(
        feedStartDate,
        'yyyyMMdd',
      )}
      `;

    const feedVersionSchema = z.object({
      feed_version_id: z.number(),
      feed_source_id: z.number(),
      feed_start_date: z.string(),
      feed_end_date: z.string(),
      fetched_at: z.date(),
    });

    const parsedResult = z.array(feedVersionSchema).parse(result);

    return parsedResult.length === 0 ? feedInfo : null;
  } catch (err) {
    console.error(err);
    return null;
  }
}

async function createNewFeedVersion(feedInfo: FeedInfo): Promise<FeedVersion> {
  try {
    const validFrom = parse(feedInfo.feed_start_date, 'yyyyMMdd', new Date());
    const validTo = parse(feedInfo.feed_end_date, 'yyyyMMdd', new Date());

    const feedVersion = await sql.transaction(async (sql) => {
      await sql`
        UPDATE feed_versions SET feed_end_date = ${format(
          subDays(validFrom, 1),
          'yyyyMMdd',
        )} WHERE feed_source_id = 1 AND feed_end_date > ${format(
          validFrom,
          'yyyyMMdd',
        )}
        `;

      const [feedVersion] = await sql`
        INSERT INTO feed_versions ("feed_source_id", "feed_start_date", "feed_end_date") VALUES (1, ${format(
          validFrom,
          'yyyyMMdd',
        )}, ${format(validTo, 'yyyyMMdd')}) RETURNING *
        `;

      return feedVersion;
    });

    return feedVersion;
  } catch (err) {
    console.error(err);
  }
}

async function processFeedFiles(path: string, feedVersion: number) {
  try {
    const files = await fs.readdir(path);
    const promises = files.map(async (f) => {
      if (f !== 'feed_info.txt') {
        if (f === 'agency.txt') {
          const data = await parseFile(`${path}/${f}`, agencySchema);
          saveAgencies(data, feedVersion);
        } else if (f === 'calendar.txt') {
          const data = await parseFile(`${path}/${f}`, calendarSchema);
          saveCalendars(data, feedVersion);
        } else if (f === 'calendar_dates.txt') {
          const data = await parseFile(`${path}/${f}`, calendarDateSchema);
          saveCalendarDates(data, feedVersion);
        } else if (f === 'routes.txt') {
          const data = await parseFile(`${path}/${f}`, routeSchema);
          saveRoutes(data, feedVersion);
        } else if (f === 'shapes.txt') {
          // error
          const data = await parseFile(`${path}/${f}`, shapeSchema);
          saveShapes(data, feedVersion);
        } else if (f === 'stops.txt') {
          const data = await parseFile(`${path}/${f}`, stopSchema);
          saveStops(data, feedVersion);
        } else if (f === 'stop_times.txt') {
          // error
          const data = await parseFile(`${path}/${f}`, stopTimeSchema);
          saveStopTimes(data, feedVersion);
        } else if (f === 'trips.txt') {
          // error
          const data = await parseFile(`${path}/${f}`, tripSchema);
          saveTrips(data, feedVersion);
        }
      }
    });
    await Promise.all(promises);
  } catch (err) {
    console.error(err);
  }
}

async function saveAgencies(agencies: Agency[], feedVersion: number) {
  const records = agencies.map((a) => {
    const {
      agency_id,
      agency_name,
      agency_url,
      agency_timezone,
      agency_phone,
      agency_lang,
      agency_fare_url,
      agency_email,
      cemv_support,
    } = a;
    return {
      agency_id,
      feed_version_id: feedVersion,
      agency_name,
      agency_url,
      agency_timezone,
      agency_phone,
      agency_lang,
      agency_fare_url,
      agency_email,
      cemv_support,
    };
  });
  await sql`
    INSERT INTO agencies ${sql(records)}
    `;
}

async function saveCalendars(calendars: Calendar[], feedVersion: number) {
  const records = calendars.map((c) => {
    const {
      service_id,
      monday,
      tuesday,
      wednesday,
      thursday,
      friday,
      saturday,
      sunday,
      start_date,
      end_date,
    } = c;
    return {
      service_id,
      feed_version_id: feedVersion,
      monday,
      tuesday,
      wednesday,
      thursday,
      friday,
      saturday,
      sunday,
      start_date,
      end_date,
    };
  });
  await sql`
    INSERT INTO calendars ${sql(records)}
    `;
}

async function saveCalendarDates(
  calendarDates: CalendarDate[],
  feedVersion: number,
) {
  const records = calendarDates.map((c) => {
    const { service_id, date, exception_type } = c;
    return {
      service_id,
      feed_version_id: feedVersion,
      date,
      exception_type,
    };
  });
  if (records.length === 0) return;
  await sql`
    INSERT INTO calendar_dates ${sql(records)}
    `;
}

async function saveRoutes(routes: Route[], feedVersion: number) {
  const records = routes.map((r) => {
    const {
      route_id,
      agency_id,
      route_short_name,
      route_long_name,
      route_desc,
      route_type,
      route_color,
      route_text_color,
    } = r;
    return {
      route_id,
      feed_version_id: feedVersion,
      agency_id,
      route_short_name,
      route_long_name,
      route_desc: route_desc === undefined ? null : route_desc,
      route_type,
      route_color: route_color === undefined ? null : route_color,
      route_text_color:
        route_text_color === undefined ? null : route_text_color,
    };
  });
  await sql`
    INSERT INTO routes ${sql(records)}
    `;
}

async function saveShapes(shapes: Shape[], feedVersion: number) {
  const records = shapes.map((s) => {
    const { shape_id, shape_pt_lat, shape_pt_lon, shape_pt_sequence } = s;
    return {
      shape_id,
      feed_version_id: feedVersion,
      shape_pt_lat,
      shape_pt_lon,
      shape_pt_sequence,
    };
  });

  if (records.length > 1000) {
    const batchesCount =
      Math.floor(records.length / 1000) + (records.length % 1000 > 0 ? 1 : 0);
    console.log(batchesCount);

    for (let i = 0; i < batchesCount; i++) {
      console.log('Uploading batch number:', i);
      await sql`
        INSERT INTO shapes ${sql(records.slice(i * 1000, i * 1000 + 1000))}
        `;
    }
  } else {
    await sql`
      INSERT INTO shapes ${sql(records)}
      `;
  }
}

async function saveStops(stops: Stop[], feedVersion: number) {
  const records = stops.map((s) => {
    const { stop_id, stop_code, stop_name, stop_lat, stop_lon, zone_id } = s;
    return {
      stop_id,
      feed_version_id: feedVersion,
      stop_code: stop_code === undefined ? null : stop_code,
      stop_name,
      stop_lat,
      stop_lon,
      zone_id: zone_id === undefined ? null : zone_id,
    };
  });
  await sql`
    INSERT INTO stops ${sql(records)}
    `;
}

async function saveStopTimes(stopTimes: StopTime[], feedVersion: number) {
  const records = stopTimes.map((s) => {
    const {
      trip_id,
      arrival_time,
      departure_time,
      stop_id,
      stop_sequence,
      stop_headsign,
      pickup_type,
      drop_off_type,
    } = s;
    return {
      trip_id,
      feed_version_id: feedVersion,
      arrival_time,
      departure_time,
      stop_id,
      stop_sequence,
      stop_headsign: stop_headsign === undefined ? null : stop_headsign,
      pickup_type: pickup_type === undefined ? null : pickup_type,
      drop_off_type: drop_off_type === undefined ? null : drop_off_type,
    };
  });

  if (records.length > 1000) {
    const batchesCount =
      Math.floor(records.length / 1000) + (records.length % 1000 > 0 ? 1 : 0);
    console.log(batchesCount);

    for (let i = 0; i < batchesCount; i++) {
      console.log('Uploading batch number:', i);
      await sql`
        INSERT INTO stop_times ${sql(records.slice(i * 1000, i * 1000 + 1000))}
        `;
    }
  } else {
    await sql`
      INSERT INTO stop_times ${sql(records)}
      `;
  }
}

async function saveTrips(trips: Trip[], feedVersion: number) {
  const records = trips.map((t) => {
    const {
      trip_id,
      route_id,
      service_id,
      trip_headsign,
      direction_id,
      shape_id,
      wheelchair_accessible,
      brigade,
    } = t;
    return {
      trip_id,
      feed_version_id: feedVersion,
      route_id,
      service_id,
      trip_headsign: trip_headsign === undefined ? null : trip_headsign,
      direction_id: direction_id === undefined ? null : direction_id,
      shape_id: shape_id === undefined ? null : shape_id,
      wheelchair_accessible:
        wheelchair_accessible === undefined ? null : wheelchair_accessible,
      brigade: brigade === undefined ? null : brigade,
    };
  });

  if (records.length > 1000) {
    const batchesCount =
      Math.floor(records.length / 1000) + (records.length % 1000 > 0 ? 1 : 0);
    console.log(batchesCount);

    for (let i = 0; i < batchesCount; i++) {
      console.log('Uploading batch number:', i);
      await sql`
        INSERT INTO trips ${sql(records.slice(i * 1000, i * 1000 + 1000))}
        `;
    }
  } else {
    await sql`
      INSERT INTO trips ${sql(records)}
      `;
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

  await processFeedFiles(feedPath, version.feed_version_id);

  await cleanUp(feedPath);

  console.log('Feed synced');
}
