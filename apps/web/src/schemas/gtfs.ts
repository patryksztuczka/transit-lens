import z from 'zod';

export const stopSchema = z.object({
  stopId: z.string(),
  feedVersionId: z.number(),
  stopCode: z.string(),
  stopName: z.string(),
  stopLat: z.number(),
  stopLon: z.number(),
  zoneId: z.string(),
});

export type Stop = z.infer<typeof stopSchema>;

export const routeSchema = z.object({
  routeId: z.string(),
  agencyId: z.string(),
  feedVersionId: z.number(),
  routeShortName: z.string(),
  routeLongName: z.string(),
  routeDesc: z.string(),
  routeType: z.number(),
  routeColor: z.string(),
  routeTextColor: z.string(),
});

export const routeStopSchema = z.object({
  stopSequence: z.number(),
  stop: z.object({
    stopId: z.string(),
    stopName: z.string(),
  }),
});
