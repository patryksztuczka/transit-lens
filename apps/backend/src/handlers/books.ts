import { Hono } from 'hono';

const app = new Hono();

app.get('/', async (c) => {
  return c.json('books');
});

export default app;
