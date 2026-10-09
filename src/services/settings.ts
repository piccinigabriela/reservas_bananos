import { supabase } from './supabase';

/**
 * Configuración compartida entre todos los dispositivos (tabla bananos_config).
 * Antes cada celular tenía su propia copia en localStorage y no se enteraba de los cambios del otro.
 *
 * Se carga una vez al iniciar sesión y queda en memoria para que las funciones de cálculo
 * (comisiones, tipo de cambio, etc.) sigan siendo síncronas.
 */
const memoria: Record<string, any> = {};
const oyentes = new Set<() => void>();

export type ClaveConfig =
  | 'comisiones'
  | 'moneda_plataforma'
  | 'tipo_cambio'
  | 'fecha_corte'
  | 'ical_urls'
  | 'temporadas'
  | 'voluntarios'
  | 'whatsapp_admin'
  | 'guia_publica'
  | 'xenia_publico'
  | 'privado_telegram';

export function cfg<T>(clave: ClaveConfig, porDefecto: T): T {
  const v = memoria[clave];
  return v === undefined || v === null ? porDefecto : (v as T);
}

export function suscribirConfig(fn: () => void): () => void {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
}

function avisar() {
  oyentes.forEach(fn => {
    try {
      fn();
    } catch (_) {}
  });
}

export async function cargarConfig(): Promise<void> {
  const { data, error } = await supabase.from('bananos_config').select('clave, valor');
  if (error) throw error;
  for (const k of Object.keys(memoria)) delete memoria[k];
  (data || []).forEach(row => {
    memoria[row.clave] = row.valor;
  });
  avisar();
}

export async function guardarCfg(clave: ClaveConfig, valor: unknown): Promise<void> {
  const { error } = await supabase
    .from('bananos_config')
    .upsert({ clave, valor, actualizado: new Date().toISOString() }, { onConflict: 'clave' });
  if (error) throw error;
  memoria[clave] = valor;
  avisar();
}

/**
 * Migración única: si la base todavía no tiene un valor y este navegador tenía uno
 * guardado por la versión vieja, lo sube. Solo lo ejecuta el propietario.
 * NO migra reservas ni gastos (eso siempre vino de Supabase).
 */
const LEGADO: Array<[ClaveConfig, string, (raw: string) => unknown]> = [
  ['comisiones', 'bn_com', raw => JSON.parse(raw)],
  ['moneda_plataforma', 'bn_moneda_plat', raw => JSON.parse(raw)],
  ['tipo_cambio', 'bn_tc', raw => parseFloat(raw) || null],
  ['fecha_corte', 'bn_fecha_corte', raw => raw.trim()],
  ['temporadas', 'bn_temp', raw => JSON.parse(raw)],
  ['voluntarios', 'bn_vol_names', raw => JSON.parse(raw)],
  ['whatsapp_admin', 'bn_wa', raw => JSON.parse(raw)],
  ['guia_publica', 'bn_whatsapp_config', raw => JSON.parse(raw)],
  [
    'ical_urls',
    'bn_ical',
    raw => {
      const urls = JSON.parse(raw) || {};
      // La URL secreta vieja del calendario de Fer quedó publicada: no la migramos.
      if (typeof urls.gc_general === 'string' && urls.gc_general.includes('private-540fbe0c8511c3c26df8e140fc8e757b')) {
        delete urls.gc_general;
      }
      return urls;
    },
  ],
  [
    'privado_telegram',
    'bn_telegram_cfg',
    raw => {
      const t = JSON.parse(raw) || {};
      // El token que venía de fábrica quedó publicado: no lo migramos.
      if (typeof t.botToken === 'string' && t.botToken.startsWith('8602214307:')) t.botToken = '';
      return t;
    },
  ],
];

export async function migrarConfigLegadoSiFalta(): Promise<number> {
  let subidas = 0;
  for (const [clave, claveLocal, parse] of LEGADO) {
    if (memoria[clave] !== undefined) continue;
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(claveLocal);
    } catch (_) {}
    if (!raw) continue;
    try {
      const valor = parse(raw);
      if (valor === null || valor === undefined || valor === '') continue;
      await guardarCfg(clave, valor);
      subidas++;
    } catch (_) {}
  }
  return subidas;
}
