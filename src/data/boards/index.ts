import type { CourData } from '../../engine/types';
import campScout from './camp-scout.json';
import courPremierJour from './cour-premier-jour.json';
import piscine from './piscine.json';

/** Les cours disponibles, décrites en données. */
export const COURS: Record<string, CourData> = {
  'cour-premier-jour': courPremierJour as CourData,
  piscine: piscine as CourData,
  'camp-scout': campScout as CourData,
};
