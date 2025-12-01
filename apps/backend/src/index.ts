import { Hono } from "hono";

import books from "./handlers/books";
import { Cron } from "croner";
import { sql } from "./database/db";
import { syncFeed } from "./jobs";
import { timeout } from "hono/timeout";

console.log("Hello via Bun!");

const app = new Hono().basePath("/api");

app.use("/api", timeout(30_000));

app.get("/", async (c) => {
  await syncFeed();
  return c.text("DONE!");
});

app.route("/books", books);

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
