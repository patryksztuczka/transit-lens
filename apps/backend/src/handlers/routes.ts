import { Hono } from 'hono';
import { prisma } from '../db';

const app = new Hono();

app.get('/:routeId/stops', async (c) => {
  try {
    const routeId = c.req.param('routeId');

    const tripId = await prisma.trip.groupBy({
      by: 'tripId',
      where: {
        routeId,
        AND: {
          directionId: 0,
        },
      },
      take: 1,
      orderBy: {
        _count: {
          tripId: 'desc',
        },
      },
    });

    if (!tripId[0].tripId) {
      return c.json(null);
    }

    const stops = await prisma.stopTime.findMany({
      where: {
        tripId: tripId[0].tripId,
      },
      select: {
        stopSequence: true,
        stop: {
          select: {
            stopId: true,
            stopName: true,
          },
        },
      },
      orderBy: {
        stopSequence: 'asc',
      },
    });

    return c.json(stops);
  } catch (err) {
    console.error(err);
    return c.text(String(err), 500);
  }
});

export default app;
