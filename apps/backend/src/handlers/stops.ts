import { Hono } from "hono";
import { sql } from "../database/db";

const app = new Hono();

app.get("/", async (c) => {
  const stops = await sql`
    select * from stops where zone_id = 'A' limit 100
    `;
  return c.json(stops);
});

export default app;
