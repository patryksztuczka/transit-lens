import { useQuery } from '@tanstack/react-query';
import { Map, Marker as MapMarker, Popup } from 'mapbox-gl';
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type RefObject,
} from 'react';
import z from 'zod';

import { stopSchema } from '../schemas/gtfs';
import 'mapbox-gl/dist/mapbox-gl.css';
import { cn } from '../lib/utils';
import { BusFront } from 'lucide-react';

const Marker = ({
  stop,
  mapRef,
  active = false,
  onClick,
}: {
  stop: z.infer<typeof stopSchema>;
  mapRef: RefObject<Map>;
  active?: boolean;
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
      .setLngLat([stop.stop_lon, stop.stop_lat])
      .addTo(mapRef.current);

    markerRef.current = marker;

    const popup = new Popup({
      anchor: 'top',
      offset: 20,
      closeButton: false,
      closeOnClick: false,
    })
      .setLngLat([stop.stop_lon, stop.stop_lat])
      .setText(stop.stop_name);

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

  const handlePickStops = (stopId: string) => {
    if (startStopId == null) {
      setStartStopId(stopId);
    } else if (endStopId == null && stopId !== startStopId) {
      setEndStopId(stopId);
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
            key={s.stop_id}
            stop={s}
            mapRef={mapRef}
            active={s.stop_id === startStopId || s.stop_id === endStopId}
            onClick={() => handlePickStops(s.stop_id)}
          />
        ))}
    </div>
  );
};
