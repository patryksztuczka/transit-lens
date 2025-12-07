import { atom } from 'jotai';

import type { Stop } from '../schemas/gtfs';

export const selectedStopAtom = atom<Stop | null>(null);
export const selectedRouteIdAtom = atom<string | null>(null);
