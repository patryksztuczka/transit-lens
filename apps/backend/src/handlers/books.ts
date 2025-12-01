import { Hono } from "hono";

const app = new Hono();

app.get("/", (c) => c.json("books"));

export default app;
