CREATE TABLE IF NOT EXISTS feed_sources (
  feed_source_id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  gtfs_static_url TEXT NOT NULL,
  gtfs_rt_url TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS feed_versions (
  feed_version_id SERIAL PRIMARY KEY,
  feed_source_id INTEGER REFERENCES feed_sources (feed_source_id) ON DELETE CASCADE,
  feed_start_date DATE,
  feed_end_date DATE,
  fetched_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agencies (
  agency_id VARCHAR(10) NOT NULL,
  feed_version_id INTEGER REFERENCES feed_versions (feed_version_id) ON DELETE CASCADE,
  agency_name VARCHAR(255) NOT NULL,
  agency_url TEXT NOT NULL,
  agency_timezone VARCHAR(50) NOT NULL,
  agency_phone VARCHAR(50),
  agency_lang VARCHAR(10),
  agency_fare_url TEXT,
  agency_email VARCHAR(255),
  cemv_support SMALLINT DEFAULT 0 CHECK (cemv_support IN (0, 1, 2)),
  PRIMARY KEY (agency_id, feed_version_id)
);

CREATE TABLE IF NOT EXISTS calendars (
  service_id VARCHAR(50) NOT NULL,
  feed_version_id INTEGER REFERENCES feed_versions (feed_version_id) ON DELETE CASCADE,
  monday SMALLINT NOT NULL CHECK (monday IN (0, 1)),
  tuesday SMALLINT NOT NULL CHECK (tuesday IN (0, 1)),
  wednesday SMALLINT NOT NULL CHECK (wednesday IN (0, 1)),
  thursday SMALLINT NOT NULL CHECK (thursday IN (0, 1)),
  friday SMALLINT NOT NULL CHECK (friday IN (0, 1)),
  saturday SMALLINT NOT NULL CHECK (saturday IN (0, 1)),
  sunday SMALLINT NOT NULL CHECK (sunday IN (0, 1)),
  start_date VARCHAR(8) NOT NULL,
  end_date VARCHAR(8) NOT NULL,
  PRIMARY KEY (service_id, feed_version_id)
);

CREATE TABLE IF NOT EXISTS calendar_dates (
  service_id VARCHAR(50) NOT NULL,
  feed_version_id INTEGER REFERENCES feed_versions (feed_version_id) ON DELETE CASCADE,
  date VARCHAR(8) NOT NULL,
  exception_type SMALLINT NOT NULL CHECK (exception_type IN (1, 2)),
  PRIMARY KEY (service_id, feed_version_id, date)
);

CREATE TABLE IF NOT EXISTS routes (
  route_id VARCHAR(50) NOT NULL,
  feed_version_id INTEGER REFERENCES feed_versions (feed_version_id) ON DELETE CASCADE,
  agency_id VARCHAR(10) NOT NULL,
  route_short_name VARCHAR(50) NOT NULL,
  route_long_name TEXT NOT NULL,
  route_desc TEXT,
  route_type SMALLINT NOT NULL,
  route_color VARCHAR(6),
  route_text_color VARCHAR(6),
  PRIMARY KEY (route_id, feed_version_id)
);

CREATE TABLE IF NOT EXISTS shapes (
  shape_id VARCHAR(50) NOT NULL,
  feed_version_id INTEGER REFERENCES feed_versions (feed_version_id) ON DELETE CASCADE,
  shape_pt_lat DOUBLE PRECISION NOT NULL,
  shape_pt_lon DOUBLE PRECISION NOT NULL,
  shape_pt_sequence INTEGER NOT NULL,
  PRIMARY KEY (shape_id, feed_version_id, shape_pt_sequence)
);

CREATE TABLE IF NOT EXISTS stops (
  stop_id VARCHAR(50) NOT NULL,
  feed_version_id INTEGER REFERENCES feed_versions (feed_version_id) ON DELETE CASCADE,
  stop_code VARCHAR(50),
  stop_name VARCHAR(255) NOT NULL,
  stop_lat DOUBLE PRECISION NOT NULL,
  stop_lon DOUBLE PRECISION NOT NULL,
  zone_id VARCHAR(10),
  PRIMARY KEY (stop_id, feed_version_id)
);

CREATE TABLE IF NOT EXISTS trips (
  trip_id VARCHAR(100) NOT NULL,
  feed_version_id INTEGER REFERENCES feed_versions (feed_version_id) ON DELETE CASCADE,
  route_id VARCHAR(50) NOT NULL,
  service_id VARCHAR(50) NOT NULL,
  trip_headsign VARCHAR(255),
  direction_id SMALLINT CHECK (direction_id IN (0, 1)),
  shape_id VARCHAR(50),
  wheelchair_accessible SMALLINT CHECK (wheelchair_accessible IN (0, 1, 2)),
  brigade VARCHAR(50),
  PRIMARY KEY (trip_id, feed_version_id)
);

CREATE TABLE IF NOT EXISTS stop_times (
  trip_id VARCHAR(100) NOT NULL,
  feed_version_id INTEGER REFERENCES feed_versions (feed_version_id) ON DELETE CASCADE,
  arrival_time VARCHAR(8) NOT NULL,
  departure_time VARCHAR(8) NOT NULL,
  stop_id VARCHAR(50) NOT NULL,
  stop_sequence INTEGER NOT NULL,
  stop_headsign VARCHAR(255),
  pickup_type SMALLINT CHECK (pickup_type IN (0, 1, 2, 3)),
  drop_off_type SMALLINT CHECK (drop_off_type IN (0, 1, 2, 3)),
  PRIMARY KEY (trip_id, feed_version_id, stop_sequence)
);
