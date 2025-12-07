import { Hono } from 'hono';

import { syncFeed } from './jobs';

import stops from './handlers/stops';
import routes from './handlers/routes';
import { cors } from 'hono/cors';

const app = new Hono().basePath('/api');

app.use('/*', cors());

app.get('/', async (c) => {
  await syncFeed();
  return c.text('DONE!');
});

app.route('/stops', stops);
app.route('/routes', routes);

// new Cron(
//   "* * * * * *",
//   () => {
//     console.log(new Date().toISOString());
//   },
//   {
//     interval: 10,
//   },
// );

export default {
  fetch: app.fetch,
  idleTimeout: 60,
};
