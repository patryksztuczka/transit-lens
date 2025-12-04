import { Hono } from 'hono';
import { sql } from '../database/db';

const app = new Hono();

app.get('/', async (c) => {
  try {
    const stops = await sql`
      select * from stops where zone_id = 'A' limit 100
      `;
    return c.json(stops);
  } catch (err) {
    console.error(err);
  }
});

export default app;
