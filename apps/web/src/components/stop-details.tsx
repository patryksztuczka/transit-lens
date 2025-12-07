import { useAtom } from 'jotai';
import { selectedRouteIdAtom, selectedStopAtom } from '../jotai/map';
import { useQuery } from '@tanstack/react-query';
import z from 'zod';
import { routeSchema } from '../schemas/gtfs';
import { getRouteStops } from '../data-access-layer/routes';
import { BusFront, TramFront } from 'lucide-react';

export const StopDetails = () => {
  const [selectedStop] = useAtom(selectedStopAtom);
  const [selectedRouteId, setSelectedRouteId] = useAtom(selectedRouteIdAtom);

  const { data: routes, isLoading } = useQuery({
    queryKey: ['stopDetails'],
    initialData: [],
    enabled: selectedStop?.stopId != null,
    queryFn: async () => {
      const res = await fetch(
        `http://localhost:3000/api/stops/${selectedStop?.stopId}/routes`,
      );

      const data = await res.json();

      const parsedData = z.array(routeSchema).parse(data);

      return parsedData;
    },
  });

  useQuery({
    queryKey: ['routeStops', selectedRouteId],
    queryFn: () => getRouteStops(selectedRouteId!),
    enabled: selectedRouteId != null,
    initialData: [],
  });

  const groupedRoutes = Object.groupBy(routes, ({ routeType }) => {
    if (routeType === 0) {
      return 'trams';
    } else if (routeType === 3) {
      return 'buses';
    }
    return 'others';
  });

  return (
    <div className="absolute top-4 left-4 z-50 max-w-2xs rounded-md border border-gray-700 bg-slate-900 p-4 text-white">
      <span className="text-2xl font-bold">{selectedStop?.stopName}</span>
      {isLoading ? (
        <div>Ładowanie...</div>
      ) : (
        <div className="flex flex-col gap-4">
          {Object.keys(groupedRoutes).map((g) => (
            <div>
              <span className="font-medium capitalize">{g}</span>
              <div className="flex flex-wrap gap-2">
                {groupedRoutes[g as keyof typeof groupedRoutes]?.map((r) => (
                  <button
                    key={r.routeId}
                    className="cursor-pointer rounded-md px-2 py-1 hover:bg-green-700"
                    onClick={() => setSelectedRouteId(r.routeId)}
                    style={{
                      backgroundColor: `#${r.routeColor}`,
                      color: `#${r.routeTextColor}`,
                    }}
                  >
                    <div>
                      {r.routeType === 0 && <TramFront />}
                      {r.routeType === 3 && <BusFront />}
                    </div>
                    <span>{r.routeShortName}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
