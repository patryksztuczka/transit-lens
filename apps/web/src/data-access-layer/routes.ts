import z from 'zod';
import { routeStopSchema } from '../schemas/gtfs';

export const getRouteStops = async (routeId: string) => {
  const res = await fetch(`http://localhost:3000/api/routes/${routeId}/stops`);

  const data = await res.json();

  const parsedData = z.array(routeStopSchema).parse(data);

  return parsedData;
};
