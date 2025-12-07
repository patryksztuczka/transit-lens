import { useQuery } from '@tanstack/react-query';
import { Map, Marker as MapMarker, Popup } from 'mapbox-gl';
import { useEffect, useRef, useState, type RefObject } from 'react';
import z from 'zod';
import { BusFront } from 'lucide-react';
import { useAtom } from 'jotai';
import 'mapbox-gl/dist/mapbox-gl.css';

import { stopSchema, type Stop } from '../schemas/gtfs';
import { cn } from '../lib/utils';
import { selectedRouteIdAtom, selectedStopAtom } from '../jotai/map';
import { getRouteStops } from '../data-access-layer/routes';

const Marker = ({
  stop,
  mapRef,
  active = false,
  className,
  onClick,
}: {
  stop: z.infer<typeof stopSchema>;
  mapRef: RefObject<Map>;
  active?: boolean;
  className?: string;
  onClick?: () => void;
}) => {
  const markerRef = useRef<MapMarker>(null);
  const markerContainerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<Popup>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    if (!mapRef.current || !markerContainerRef.current) return;

    const marker = new MapMarker({
      anchor: 'center',
      element: markerContainerRef.current,
    })
      .setLngLat([stop.stopLon, stop.stopLat])
      .addTo(mapRef.current);

    markerRef.current = marker;

    const popup = new Popup({
      anchor: 'top',
      offset: 20,
      closeButton: false,
      closeOnClick: false,
    })
      .setLngLat([stop.stopLon, stop.stopLat])
      .setText(stop.stopName);

    popupRef.current = popup;

    return () => {
      marker.remove();
      popup.remove();
    };
  }, []);

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current != null) clearTimeout(hoverTimeoutRef.current);

    hoverTimeoutRef.current = setTimeout(() => {
      if (mapRef.current && popupRef.current) {
        popupRef.current.addTo(mapRef.current);
      }
    }, 300);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    if (!active) {
      popupRef.current?.remove();
    }
  };

  useEffect(() => {
    if (active) {
      popupRef.current?.addClassName('mapboxgl-popup-active');
    }
  }, [active]);

  return (
    <div ref={markerContainerRef} className="marker-mapbox-anchor">
      <div
        className={cn(
          'group relative flex cursor-pointer items-center justify-center rounded-full border-2 transition-all duration-200',
          active
            ? 'h-8 w-8 border-yellow-500 bg-yellow-500 shadow-lg shadow-yellow-400/50 hover:bg-yellow-500'
            : 'h-4 w-4 border-yellow-700 bg-amber-900 hover:border-yellow-500 hover:bg-red-800',
          className,
        )}
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <BusFront
          size={20}
          className={cn(active ? 'visible scale-100' : 'invisible scale-75')}
        />
      </div>
    </div>
  );
};

export const CityMap = () => {
  const mapRef = useRef<Map>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [startStopId, setStartStopId] = useState<string | null>();
  const [endStopId, setEndStopId] = useState<string | null>();
  const [selectedStop, setSelectedStop] = useAtom(selectedStopAtom);
  const [selectedRouteId] = useAtom(selectedRouteIdAtom);

  const { data: routeStops } = useQuery({
    queryKey: ['routeStops', selectedRouteId],
    queryFn: () => getRouteStops(selectedRouteId!),
    enabled: selectedRouteId != null,
    initialData: [],
  });

  const routeStopsIds = routeStops.map((rs) => rs.stop.stopId);

  console.log(routeStops);

  const { data: stops } = useQuery({
    queryKey: ['stops'],
    initialData: [],
    queryFn: async () => {
      const res = await fetch('http://localhost:3000/api/stops');
      const data = await res.json();

      const chunks = Array.isArray(data[0]) ? data : [data];

      const flattened = chunks.flat();

      const parsedData = z.array(stopSchema).parse(flattened);

      return parsedData;
    },
  });

  const handlePickStops = (stop: Stop) => {
    if (startStopId == null) {
      setStartStopId(stop.stopId);
      setSelectedStop(stop);
    } else if (endStopId == null && stop.stopId !== startStopId) {
      setEndStopId(stop.stopId);
    }
  };

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
        stops.map((s) => (
          <Marker
            key={s.stopId}
            stop={s}
            mapRef={mapRef}
            active={s.stopId === startStopId || s.stopId === endStopId}
            onClick={() => handlePickStops(s)}
            className={cn(
              selectedRouteId == null || routeStopsIds.includes(s.stopId)
                ? 'opacity-100'
                : 'pointer-events-none opacity-10',
            )}
          />
        ))}
    </div>
  );
};
