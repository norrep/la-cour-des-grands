/**
 * Adresse du serveur du jeu en ligne (projet Supabase) et sa clé publique.
 * Ces deux valeurs sont faites pour être publiques : la sécurité vient des règles de la base
 * (chacun ne lit que ses vues) et de la fonction arbitre, pas du secret de la clé.
 * Vides : le jeu en ligne est masqué.
 */
export const SUPABASE_URL = '';
export const SUPABASE_CLE_PUBLIQUE = '';

export const enLigneDisponible = (): boolean => SUPABASE_URL !== '' && SUPABASE_CLE_PUBLIQUE !== '';
