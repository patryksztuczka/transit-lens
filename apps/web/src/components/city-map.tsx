import { useQuery } from '@tanstack/react-query';
import { Map, Marker as MapMarker } from 'mapbox-gl';
import { useEffect, useRef, useState, type RefObject } from 'react';
import z from 'zod';

import { stopSchema } from '../schemas/gtfs';
import 'mapbox-gl/dist/mapbox-gl.css';

const Marker = ({
  stop,
  mapRef,
}: {
  stop: z.infer<typeof stopSchema>;
  mapRef: RefObject<Map>;
}) => {
  const markerRef = useRef<MapMarker>();
  const el = useRef<HTMLDivElement>();

  useEffect(() => {
    markerRef.current = new MapMarker(el.current)
      .setLngLat({
        lon: stop.stop_lon,
        lat: stop.stop_lat,
      })
      .addTo(mapRef.current);
  }, []);

  return (
    <div
      ref={el}
      className="group relative h-4 w-4 cursor-pointer rounded-full border-2 border-yellow-700 bg-red-900 transition-colors hover:border-yellow-500 hover:bg-red-800"
    >
      <span className="invisible absolute top-5 left-1/2 -translate-x-1/2 rounded-sm bg-black/30 p-1 text-xs font-medium text-white transition-all delay-200 group-hover:visible">
        {stop.stop_name}
      </span>
    </div>
  );
};

export const CityMap = () => {
  const mapRef = useRef<Map>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [activeStopId, setActiveStopId] = useState<string | null>();

  const { data: stops } = useQuery({
    queryKey: ['stops'],
    initialData: [],
    queryFn: async () => {
      const res = await fetch('http://localhost:3000/api/stops');
      const data = await res.json();
      const parsedData = z.array(stopSchema).parse(data);

      return parsedData;
    },
  });

  useEffect(() => {
    if (!mapContainerRef.current) return;

    mapRef.current = new Map({
      accessToken: import.meta.env.VITE_MAPBOX_ACCESS_TOKEN,
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: {
        lng: 16.931992,
        lat: 52.409538,
      },
      maxBounds: [
        [16.7464, 52.3403],
        [17.1191, 52.467],
      ],
      zoom: 13,
    });

    return () => {
      mapRef.current?.remove();
    };
  }, []);

  return (
    <div
      id="map-container"
      className="absolute top-0 left-0 h-dvh w-full overflow-hidden"
      ref={mapContainerRef}
    >
      {mapRef.current &&
        stops.map((s) => <Marker key={s.stop_id} stop={s} mapRef={mapRef} />)}
    </div>
  );
};
