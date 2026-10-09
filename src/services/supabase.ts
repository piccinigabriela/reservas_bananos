import { createClient, Session } from '@supabase/supabase-js';

// La clave "anon" es pública por diseño: lo que protege los datos son las políticas RLS
// de la base (ver supabase/migrations). Nunca poner acá la service_role key.
export const SB_URL = 'https://vnfgitgadadjjjciftsa.supabase.co';
export const SB_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZuZmdpdGdhZGFkampqY2lmdHNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3NjI5MzgsImV4cCI6MjA5NTMzODkzOH0.g018Do3-8UvyWATZg-EesrXH8T5L65YXomK1mjsSnHQ';

export const supabase = createClient(SB_URL, SB_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // Clave propia de esta app para no mezclarse con otras apps en el mismo navegador
    storageKey: 'lb-bananos-auth',
  },
});

export type BananosRol = 'admin' | 'recepcion' | 'vol1' | 'vol2';

const esRol = (r: unknown): r is BananosRol => r === 'admin' || r === 'recepcion' || r === 'vol1' || r === 'vol2';

/** El rol vive en la tabla bananos_usuarios (lo asigna el propietario). */
export async function rolDelUsuario(session: Session | null): Promise<BananosRol | null> {
  if (!session) return null;
  const { data, error } = await supabase.rpc('bananos_mi_rol');
  if (error) throw error;
  return esRol(data) ? data : null;
}

/** Cuentas de PIN: cada rol del personal tiene un usuario fijo en Supabase Auth. */
export const EMAIL_POR_ROL: Record<Exclude<BananosRol, 'admin'>, string> = {
  recepcion: 'recepcion@reservas.woodcabiniguazu.com.ar',
  vol1: 'voluntario1@reservas.woodcabiniguazu.com.ar',
  vol2: 'voluntario2@reservas.woodcabiniguazu.com.ar',
};

export async function tokenActual(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
