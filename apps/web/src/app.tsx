import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { CityMap } from './components/city-map';

const queryClient = new QueryClient();

export const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <CityMap />
    </QueryClientProvider>
  );
};
