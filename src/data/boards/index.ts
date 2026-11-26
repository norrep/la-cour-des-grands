import type { CourData } from '../../engine/types';
import courPremierJour from './cour-premier-jour.json';

/** Les cours disponibles, décrites en données. */
export const COURS: Record<string, CourData> = {
  'cour-premier-jour': courPremierJour as CourData,
};
