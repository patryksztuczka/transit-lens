import { Hono } from 'hono';

import { prisma } from '../db';

const app = new Hono();

app.get('/', async (c) => {
  try {
    const stops = await prisma.stop.findMany({
      where: {
        zoneId: 'A',
      },
      take: 1500,
    });
    return c.json(stops);
  } catch (err) {
    console.error(err);
    return c.text(String(err), 500);
  }
});

app.get('/:stopId/routes', async (c) => {
  try {
    const stopId = c.req.param('stopId');

    const routes = await prisma.route.findMany({
      where: {
        trips: {
          some: {
            stopTimes: {
              some: {
                stopId,
              },
            },
          },
        },
      },
      distinct: ['routeShortName', 'routeLongName', 'routeType'],
    });

    return c.json(routes);
  } catch (err) {
    console.error(err);
    return c.text(String(err), 500);
  }
});

export default app;
