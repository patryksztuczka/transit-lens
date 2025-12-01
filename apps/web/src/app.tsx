import { Map } from "mapbox-gl";
import { useEffect, useRef } from "react";

export const App = () => {
  const mapRef = useRef<Map>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    mapRef.current = new Map({
      accessToken: import.meta.env.VITE_MAPBOX_ACCESS_TOKEN,
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
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
      className="absolute left-0 top-0 overflow-hidden w-full h-full"
      ref={mapContainerRef}
    ></div>
  );
};
