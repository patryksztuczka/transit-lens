import { Hono } from "hono";

import { Cron } from "croner";
import { sql } from "./database/db";
import { syncFeed } from "./jobs";
import { timeout } from "hono/timeout";

import books from "./handlers/books";
import stops from "./handlers/stops";
import { cors } from "hono/cors";

const app = new Hono().basePath("/api");

app.use("/*", cors());

app.get("/", async (c) => {
  await syncFeed();
  return c.text("DONE!");
});

app.route("/books", books);
app.route("/stops", stops);

// new Cron(
//   "* * * * * *",
//   () => {
//     console.log(new Date().toISOString());
//   },
//   {
//     interval: 10,
//   },
// );

export default app;
