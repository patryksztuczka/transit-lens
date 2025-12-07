-- CreateTable
CREATE TABLE "feed_sources" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "gtfs_static_url" TEXT NOT NULL,
    "gtfs_rt_url" TEXT NOT NULL,

    CONSTRAINT "feed_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feed_versions" (
    "id" SERIAL NOT NULL,
    "feed_source_id" INTEGER NOT NULL,
    "feed_start_date" DATE,
    "feed_end_date" DATE,
    "fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feed_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agencies" (
    "agency_id" VARCHAR(10) NOT NULL,
    "feed_version_id" INTEGER NOT NULL,
    "agency_name" VARCHAR(255) NOT NULL,
    "agency_url" TEXT NOT NULL,
    "agency_timezone" VARCHAR(50) NOT NULL,
    "agency_phone" VARCHAR(50),
    "agency_lang" VARCHAR(10),
    "agency_fare_url" TEXT,
    "agency_email" VARCHAR(255),
    "cemv_support" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "agencies_pkey" PRIMARY KEY ("agency_id","feed_version_id")
);

-- CreateTable
CREATE TABLE "calendars" (
    "service_id" VARCHAR(50) NOT NULL,
    "feed_version_id" INTEGER NOT NULL,
    "monday" INTEGER NOT NULL,
    "tuesday" INTEGER NOT NULL,
    "wednesday" INTEGER NOT NULL,
    "thursday" INTEGER NOT NULL,
    "friday" INTEGER NOT NULL,
    "saturday" INTEGER NOT NULL,
    "sunday" INTEGER NOT NULL,
    "start_date" VARCHAR(8) NOT NULL,
    "end_date" VARCHAR(8) NOT NULL,

    CONSTRAINT "calendars_pkey" PRIMARY KEY ("service_id","feed_version_id")
);

-- CreateTable
CREATE TABLE "calendar_dates" (
    "service_id" VARCHAR(50) NOT NULL,
    "feed_version_id" INTEGER NOT NULL,
    "date" VARCHAR(8) NOT NULL,
    "exception_type" INTEGER NOT NULL,

    CONSTRAINT "calendar_dates_pkey" PRIMARY KEY ("service_id","feed_version_id","date")
);

-- CreateTable
CREATE TABLE "routes" (
    "route_id" VARCHAR(50) NOT NULL,
    "feed_version_id" INTEGER NOT NULL,
    "agency_id" VARCHAR(10) NOT NULL,
    "route_short_name" VARCHAR(50) NOT NULL,
    "route_long_name" TEXT NOT NULL,
    "route_desc" TEXT,
    "route_type" INTEGER NOT NULL,
    "route_color" VARCHAR(6),
    "route_text_color" VARCHAR(6),

    CONSTRAINT "routes_pkey" PRIMARY KEY ("route_id","feed_version_id")
);

-- CreateTable
CREATE TABLE "shapes" (
    "shape_id" VARCHAR(50) NOT NULL,
    "feed_version_id" INTEGER NOT NULL,
    "shape_pt_lat" DOUBLE PRECISION NOT NULL,
    "shape_pt_lon" DOUBLE PRECISION NOT NULL,
    "shape_pt_sequence" INTEGER NOT NULL,

    CONSTRAINT "shapes_pkey" PRIMARY KEY ("shape_id","feed_version_id","shape_pt_sequence")
);

-- CreateTable
CREATE TABLE "stops" (
    "stop_id" VARCHAR(50) NOT NULL,
    "feed_version_id" INTEGER NOT NULL,
    "stop_code" VARCHAR(50),
    "stop_name" VARCHAR(255) NOT NULL,
    "stop_lat" DOUBLE PRECISION NOT NULL,
    "stop_lon" DOUBLE PRECISION NOT NULL,
    "zone_id" VARCHAR(10),

    CONSTRAINT "stops_pkey" PRIMARY KEY ("stop_id","feed_version_id")
);

-- CreateTable
CREATE TABLE "trips" (
    "trip_id" VARCHAR(100) NOT NULL,
    "feed_version_id" INTEGER NOT NULL,
    "route_id" VARCHAR(50) NOT NULL,
    "service_id" VARCHAR(50) NOT NULL,
    "trip_headsign" VARCHAR(255),
    "direction_id" INTEGER,
    "shape_id" VARCHAR(50),
    "wheelchair_accessible" INTEGER,
    "brigade" VARCHAR(50),

    CONSTRAINT "trips_pkey" PRIMARY KEY ("trip_id","feed_version_id")
);

-- CreateTable
CREATE TABLE "stop_times" (
    "trip_id" VARCHAR(100) NOT NULL,
    "feed_version_id" INTEGER NOT NULL,
    "arrival_time" VARCHAR(8) NOT NULL,
    "departure_time" VARCHAR(8) NOT NULL,
    "stop_id" VARCHAR(50) NOT NULL,
    "stop_sequence" INTEGER NOT NULL,
    "stop_headsign" VARCHAR(255),
    "pickup_type" INTEGER,
    "drop_off_type" INTEGER,

    CONSTRAINT "stop_times_pkey" PRIMARY KEY ("trip_id","feed_version_id","stop_sequence")
);

-- AddForeignKey
ALTER TABLE "feed_versions" ADD CONSTRAINT "feed_versions_feed_source_id_fkey" FOREIGN KEY ("feed_source_id") REFERENCES "feed_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agencies" ADD CONSTRAINT "agencies_feed_version_id_fkey" FOREIGN KEY ("feed_version_id") REFERENCES "feed_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendars" ADD CONSTRAINT "calendars_feed_version_id_fkey" FOREIGN KEY ("feed_version_id") REFERENCES "feed_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_dates" ADD CONSTRAINT "calendar_dates_feed_version_id_fkey" FOREIGN KEY ("feed_version_id") REFERENCES "feed_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routes" ADD CONSTRAINT "routes_feed_version_id_fkey" FOREIGN KEY ("feed_version_id") REFERENCES "feed_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routes" ADD CONSTRAINT "routes_agency_id_feed_version_id_fkey" FOREIGN KEY ("agency_id", "feed_version_id") REFERENCES "agencies"("agency_id", "feed_version_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shapes" ADD CONSTRAINT "shapes_feed_version_id_fkey" FOREIGN KEY ("feed_version_id") REFERENCES "feed_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stops" ADD CONSTRAINT "stops_feed_version_id_fkey" FOREIGN KEY ("feed_version_id") REFERENCES "feed_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_feed_version_id_fkey" FOREIGN KEY ("feed_version_id") REFERENCES "feed_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_route_id_feed_version_id_fkey" FOREIGN KEY ("route_id", "feed_version_id") REFERENCES "routes"("route_id", "feed_version_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stop_times" ADD CONSTRAINT "stop_times_feed_version_id_fkey" FOREIGN KEY ("feed_version_id") REFERENCES "feed_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stop_times" ADD CONSTRAINT "stop_times_trip_id_feed_version_id_fkey" FOREIGN KEY ("trip_id", "feed_version_id") REFERENCES "trips"("trip_id", "feed_version_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stop_times" ADD CONSTRAINT "stop_times_stop_id_feed_version_id_fkey" FOREIGN KEY ("stop_id", "feed_version_id") REFERENCES "stops"("stop_id", "feed_version_id") ON DELETE RESTRICT ON UPDATE CASCADE;
