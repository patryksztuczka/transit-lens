import { SQL } from "bun";

export const sql = new SQL({
  url: "postgres://transit_lens_app:example@localhost:5432/transit_lens",

  max: 20,
  idleTimeout: 30,
  maxLifetime: 0,
  connectionTimeout: 30,
});
