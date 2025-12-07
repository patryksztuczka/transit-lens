import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { CityMap } from './components/city-map';
import { StopDetails } from './components/stop-details';

const queryClient = new QueryClient();

export const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <main>
        <CityMap />
        <StopDetails />
      </main>
    </QueryClientProvider>
  );
};
