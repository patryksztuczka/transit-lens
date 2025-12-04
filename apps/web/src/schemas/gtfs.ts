import z from 'zod';

export const stopSchema = z.object({
  stop_id: z.string(),
  feed_version_id: z.number(),
  stop_code: z.string(),
  stop_name: z.string(),
  stop_lat: z.number(),
  stop_lon: z.number(),
  zone_id: z.string(),
});
