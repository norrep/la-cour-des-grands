/**
 * Adresse du serveur du jeu en ligne (projet Supabase) et sa clé publique.
 * Ces deux valeurs sont faites pour être publiques : la sécurité vient des règles de la base
 * (chacun ne lit que ses vues) et de la fonction arbitre, pas du secret de la clé.
 * Vides : le jeu en ligne est masqué.
 */
export const SUPABASE_URL: string = 'https://cewqffjgtwilsjyjsgtl.supabase.co';
export const SUPABASE_CLE_PUBLIQUE: string = 'sb_publishable_VzPiS_iXaJJHg_U6odDXTg_v4gg4y3j';

export const enLigneDisponible = (): boolean => SUPABASE_URL !== '' && SUPABASE_CLE_PUBLIQUE !== '';
