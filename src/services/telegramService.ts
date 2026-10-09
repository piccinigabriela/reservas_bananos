import { Reserva } from '../types';
import { DN, calcFinancials, formatMoney, formatDateEs } from './cabinConfig';
import { cfg, guardarCfg } from './settings';

export interface TelegramConfig {
  botToken: string;
  chatId: string;
  enabled: boolean;
  notificarCheckins: boolean;
  notificarCheckouts: boolean;
}

// Antes había un token de bot escrito en el código (quedaba público). Ahora la configuración
// vive en la base, en una clave privada que solo puede leer el propietario.
const DEFAULT_CONFIG: TelegramConfig = {
  botToken: '',
  chatId: '',
  enabled: false,
  notificarCheckins: true,
  notificarCheckouts: true,
};

export function getTelegramConfig(): TelegramConfig {
  return { ...DEFAULT_CONFIG, ...cfg<Partial<TelegramConfig>>('privado_telegram', {}) };
}

export async function saveTelegramConfig(c: TelegramConfig): Promise<void> {
  await guardarCfg('privado_telegram', c);
}

export async function sendTelegramMessage(token: string, chatId: string, text: string): Promise<{ success: boolean; error?: string }> {
  if (!token || !chatId) {
    return { success: false, error: 'Falta configurar el Token del Bot o el Chat ID' };
  }

  try {
    const url = `https://api.telegram.org/bot${token.trim()}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId.trim(),
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    const data = await response.json();
    if (!data.ok) {
      return { success: false, error: data.description || 'Error al enviar a Telegram' };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error de conexión con Telegram' };
  }
}

export function formatTelegramCheckin(r: Reserva): string {
  const fin = calcFinancials(r);
  const cabinName = DN[r.depto] || r.depto;

  return (
    `🌿 <b>AVISO DE CHECK-IN — Cabañas Los Bananos</b>\n\n` +
    `📍 <b>Cabaña:</b> ${cabinName}\n` +
    `👤 <b>Huésped:</b> ${r.huesped} ${r.nac ? `(${r.nac})` : ''}\n` +
    `📅 <b>Entrada:</b> ${formatDateEs(r.checkin)}\n` +
    `📅 <b>Salida:</b> ${formatDateEs(r.checkout)} (<i>${fin.n} noche${fin.n > 1 ? 's' : ''}</i>)\n` +
    `🏨 <b>Canal:</b> ${r.plataforma}\n` +
    (r.tel ? `📞 <b>Teléfono:</b> ${r.tel}\n` : '') +
    (r.notas ? `📝 <b>Notas:</b> ${r.notas}\n` : '') +
    `\n✨ <i>Notificación enviada desde el sistema Los Bananos</i>`
  );
}

export function formatTelegramDailySummary(reservas: Reserva[], dateStr: string): string {
  const checkinsHoy = reservas.filter(
    r => !r.icalUid && r.estado !== 'Cancelada' && r.estado !== 'Non show' && r.checkin === dateStr
  );
  const checkoutsHoy = reservas.filter(
    r => !r.icalUid && r.estado !== 'Cancelada' && r.estado !== 'Non show' && r.checkout === dateStr
  );

  let msg = `🍍 <b>RESUMEN DEL DÍA — Cabañas Los Bananos</b>\n📅 <i>${formatDateEs(dateStr)}</i>\n\n`;

  if (checkinsHoy.length === 0 && checkoutsHoy.length === 0) {
    msg += `✅ <b>Sin movimientos programados para hoy.</b>\nTodos los huéspedes continúan su estadía tranquilamente.\n`;
  } else {
    if (checkinsHoy.length > 0) {
      msg += `📥 <b>LLEGADAS HOY (${checkinsHoy.length}):</b>\n`;
      checkinsHoy.forEach(r => {
        const cName = DN[r.depto] || r.depto;
        msg += `• <b>${r.huesped}</b> ➡️ ${cName} (${r.plataforma})\n`;
        if (r.notas) msg += `  <i>Nota: ${r.notas}</i>\n`;
      });
      msg += `\n`;
    }

    if (checkoutsHoy.length > 0) {
      msg += `📤 <b>SALIDAS HOY (${checkoutsHoy.length}):</b>\n`;
      checkoutsHoy.forEach(r => {
        const cName = DN[r.depto] || r.depto;
        msg += `• <b>${r.huesped}</b> ⬅️ deja ${cName}\n`;
      });
      msg += `\n`;
    }
  }

  msg += `\n🤖 <i>Xenia Avisos — Sistema de Gestión Los Bananos</i>`;
  return msg;
}
