import z from 'zod';

export const agencySchema = z.object({
  agency_id: z.string(),
  agency_name: z.string(),
  agency_url: z.string(),
  agency_timezone: z.string(),
  agency_phone: z
    .string()
    .optional()
    .transform((x) => (x == undefined ? null : x)),
  agency_lang: z
    .string()
    .optional()
    .transform((x) => (x == undefined ? null : x)),
  agency_fare_url: z
    .string()
    .optional()
    .transform((x) => (x == undefined ? null : x)),
  agency_email: z
    .string()
    .optional()
    .transform((x) => (x == undefined ? null : x)),
  cemv_support: z
    .string()
    .optional()
    .transform((x) => (x == undefined ? null : x)),
});

export type Agency = z.infer<typeof agencySchema>;

export const feedInfoSchema = z.object({
  feed_publisher_name: z.string(),
  feed_publisher_url: z.string(),
  feed_lang: z.string(),
  feed_start_date: z.string(),
  feed_end_date: z.string(),
  default_lang: z.string().optional(),
  feed_version: z.string().optional(),
  feed_contact_email: z.string().optional(),
  feed_contact_url: z.string().optional(),
});

export type FeedInfo = z.infer<typeof feedInfoSchema>;

export const feedVersionSchema = z.object({
  feed_version_id: z.number(),
  feed_source_id: z.number(),
  feed_start_date: z.string(),
  feed_end_date: z.string(),
  fetched_at: z.date(),
});

export type FeedVersion = z.infer<typeof feedVersionSchema>;

export const tripSchema = z.object({
  route_id: z.string(),
  service_id: z.string(),
  trip_id: z.string(),
  trip_headsign: z.string(),
  direction_id: z.string(),
  shape_id: z.string(),
  wheelchair_accessible: z.string(),
  brigade: z.string(),
});

export type Trip = z.infer<typeof tripSchema>;

export const stopSchema = z.object({
  stop_id: z.string(),
  stop_code: z.string(),
  stop_name: z.string(),
  stop_lat: z.string(),
  stop_lon: z.string(),
  zone_id: z.string(),
});

export type Stop = z.infer<typeof stopSchema>;

export const stopTimeSchema = z.object({
  trip_id: z.string(),
  arrival_time: z.string(),
  departure_time: z.string(),
  stop_id: z.string(),
  stop_sequence: z.string(),
  stop_headsign: z.string(),
  pickup_type: z.string(),
  drop_off_type: z.string(),
});

export type StopTime = z.infer<typeof stopTimeSchema>;

export const shapeSchema = z.object({
  shape_id: z.string(),
  shape_pt_lat: z.string(),
  shape_pt_lon: z.string(),
  shape_pt_sequence: z.string(),
});

export type Shape = z.infer<typeof shapeSchema>;

export const routeSchema = z.object({
  route_id: z.string(),
  agency_id: z.string(),
  route_short_name: z.string(),
  route_long_name: z.string(),
  route_desc: z.string(),
  route_type: z.string(),
  route_color: z.string(),
  route_text_color: z.string(),
});

export type Route = z.infer<typeof routeSchema>;

export const calendarDateSchema = z.object({
  service_id: z.string(),
  date: z.string(),
  exception_type: z.string(),
});

export type CalendarDate = z.infer<typeof calendarDateSchema>;

export const calendarSchema = z.object({
  service_id: z.string(),
  monday: z.string(),
  tuesday: z.string(),
  wednesday: z.string(),
  thursday: z.string(),
  friday: z.string(),
  saturday: z.string(),
  sunday: z.string(),
  start_date: z.string(),
  end_date: z.string(),
});

export type Calendar = z.infer<typeof calendarSchema>;
