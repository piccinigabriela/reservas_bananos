// Pruebas de la sincronización iCal (sin red ni base). Correr con: npx tsx tests/icalSync.test.ts
import assert from 'node:assert/strict';
import { planificarSync, parsearIcal, idEstable, Feed, ResultadoFeed } from '../src/services/icalSync';
import { Reserva } from '../src/types';
import { detectarConflictos } from '../src/services/reservaUtils';

const HOY = '2026-10-09';
const base = (r: Partial<Reserva>): Reserva =>
  ({ tel: '', nac: '', precio: 0, pax: 2, plus: 0, plataforma: 'Directo', destino: '', estado: 'Confirmada', notas: '', ...r } as Reserva);

const fGoogle: Feed = { origen: 'google:general', fuente: 'google', cabana: 'general', url: 'https://calendar.google.com/x.ics' };
const fAirbnbC5: Feed = { origen: 'airbnb:C5', fuente: 'airbnb', cabana: 'C5', url: 'https://www.airbnb.com/calendar/ical/1.ics' };

let ok = 0;
function prueba(nombre: string, fn: () => void) {
  fn();
  ok++;
  console.log('✓', nombre);
}

prueba('Flávio: el mismo evento en C5 y C8 queda UNA sola vez, en la cabaña actual (C8)', () => {
  const reservas = [
    base({ id: 'ical-C5-55l7fspqla02dsripqjb', depto: 'C5', huesped: '🔒 Flávio', checkin: '2026-10-15', checkout: '2026-10-18', origen: 'google:general' }),
    base({ id: 'ical-C8-55l7fspqla02dsripqjb', depto: 'C8', huesped: '🔒 Flávio Ar1710', checkin: '2026-10-15', checkout: '2026-10-18', origen: 'google:general' }),
  ];
  const res: ResultadoFeed[] = [{ feed: fGoogle, eventos: [{ uid: '55l7fspqla02dsripqjb@google.com', ci: '2026-10-15', co: '2026-10-18', summary: 'C8 Flávio ar1710' }] }];
  const plan = planificarSync(reservas, res, HOY);
  assert.deepEqual(plan.borrar, ['ical-C5-55l7fspqla02dsripqjb']);
  assert.equal(plan.creados, 0);
  const actualizado = plan.upserts.find(u => u.id === 'ical-C8-55l7fspqla02dsripqjb');
  assert.ok(actualizado, 'la fila de C8 se actualiza para guardar el vínculo con el evento');
  assert.equal(actualizado!.depto, 'C8');
  assert.equal(actualizado!.icalRef, '55l7fspqla02dsripqjb@google.com');
});

prueba('Si Fer mueve el evento de C8 a C5 en Google, se MUEVE la fila (no se duplica)', () => {
  const uid = 'abc@google.com';
  const reservas = [base({ id: idEstable('google', uid), depto: 'C8', huesped: '🔒 Tomas', checkin: '2026-11-05', checkout: '2026-11-10', origen: 'google:general', icalRef: uid })];
  const plan = planificarSync(reservas, [{ feed: fGoogle, eventos: [{ uid, ci: '2026-11-05', co: '2026-11-10', summary: 'C5 tomas' }] }], HOY);
  assert.equal(plan.borrar.length, 0);
  assert.equal(plan.creados, 0);
  assert.equal(plan.upserts.length, 1);
  assert.equal(plan.upserts[0].depto, 'C5');
});

prueba('Bloqueo de Airbnb + reserva cargada a mano con las mismas fechas: se borra el bloqueo', () => {
  const reservas = [
    base({ id: 'ical-C5-1418fb94e984-5c5cd4b', depto: 'C5', huesped: '🔒 Reserved', checkin: '2026-10-15', checkout: '2026-10-18', origen: 'airbnb:C5', plataforma: 'Airbnb' }),
    base({ id: 'res_1', depto: 'C5', huesped: 'Flávio', checkin: '2026-10-15', checkout: '2026-10-18', precio: 30, plataforma: 'Airbnb' }),
  ];
  const plan = planificarSync(reservas, [{ feed: fAirbnbC5, eventos: [{ uid: '1418fb94e984-5c5cd4b1@airbnb.com', ci: '2026-10-15', co: '2026-10-18', summary: 'Reserved' }] }], HOY);
  assert.deepEqual(plan.borrar, ['ical-C5-1418fb94e984-5c5cd4b']);
  assert.equal(plan.creados, 0);
});

prueba('Bloqueo convertido en reserva (mismo id, vínculo guardado): no se vuelve a crear el bloqueo', () => {
  const uid = 'zzz@airbnb.com';
  const reservas = [base({ id: idEstable('airbnb', uid), depto: 'C5', huesped: 'Ana Pérez', precio: 50, checkin: '2026-10-20', checkout: '2026-10-22', origen: 'airbnb:C5', icalRef: uid })];
  const plan = planificarSync(reservas, [{ feed: fAirbnbC5, eventos: [{ uid, ci: '2026-10-20', co: '2026-10-22', summary: 'Reserved' }] }], HOY);
  assert.equal(plan.creados, 0);
  assert.equal(plan.borrar.length, 0);
  assert.equal(plan.upserts.length, 0);
});

prueba('Si un calendario no se pudo leer, NO se borra nada de ese calendario', () => {
  const reservas = [base({ id: 'ical-airbnb-x', depto: 'C5', huesped: '🔒 Reserved', checkin: '2026-10-20', checkout: '2026-10-22', origen: 'airbnb:C5' })];
  const plan = planificarSync(reservas, [{ feed: fAirbnbC5, eventos: null, error: 'timeout' }], HOY);
  assert.equal(plan.borrar.length, 0);
  assert.deepEqual(plan.feedsConError, ['airbnb:C5']);
});

prueba('Reserva cancelada en Airbnb (ya no está en el calendario): se borra el bloqueo futuro', () => {
  const reservas = [base({ id: 'ical-airbnb-x', depto: 'C5', huesped: '🔒 Reserved', checkin: '2026-10-20', checkout: '2026-10-22', origen: 'airbnb:C5' })];
  const plan = planificarSync(reservas, [{ feed: fAirbnbC5, eventos: [] }], HOY);
  assert.deepEqual(plan.borrar, ['ical-airbnb-x']);
});

prueba('Evento de Google sin cabaña en el título: se informa y no se inventa C2', () => {
  const plan = planificarSync([], [{ feed: fGoogle, eventos: [{ uid: 'q@google.com', ci: '2026-10-20', co: '2026-10-22', summary: 'Juan 2 noches' }] }], HOY);
  assert.equal(plan.creados, 0);
  assert.equal(plan.sinCabana.length, 1);
});

prueba('Mismo huésped cargado en OTRA cabaña: se bloquea la cabaña de Google y queda marcado para revisar', () => {
  const reservas = [base({ id: 'res_sara', depto: 'C9', huesped: 'Sara', checkin: '2026-12-02', checkout: '2026-12-05', precio: 40000 })];
  const plan = planificarSync(reservas, [{ feed: fGoogle, eventos: [{ uid: 's@google.com', ci: '2026-12-02', co: '2026-12-05', summary: 'C8 x3 Sara seña 40' }] }], HOY);
  assert.equal(plan.creados, 1);
  assert.equal(plan.upserts[0].depto, 'C8');
  const todos = [...reservas, ...plan.upserts];
  const c = detectarConflictos(todos as any, HOY);
  assert.equal(c.length, 1);
  assert.equal(c[0].tipo, 'mismo_huesped_otra_cabana');
});

prueba('Airbnb y Google anotan la misma reserva: un solo bloqueo', () => {
  const res: ResultadoFeed[] = [
    { feed: fAirbnbC5, eventos: [{ uid: 'a1@airbnb.com', ci: '2026-11-21', co: '2026-11-25', summary: 'Reserved' }] },
    { feed: fGoogle, eventos: [{ uid: 'g1@google.com', ci: '2026-11-21', co: '2026-11-25', summary: 'C5 x2 Mauro' }] },
  ];
  const plan = planificarSync([], res, HOY);
  assert.equal(plan.creados, 1);
});

prueba('Nunca se borra una reserva cargada por una persona', () => {
  const reservas = [base({ id: 'ical-C5-viejo', depto: 'C5', huesped: 'Nombre real', precio: 0, checkin: '2026-10-20', checkout: '2026-10-22' })];
  const plan = planificarSync(reservas, [{ feed: fAirbnbC5, eventos: [] }], HOY);
  assert.equal(plan.borrar.length, 0);
});

prueba('Correr la sincronización dos veces no cambia nada la segunda vez', () => {
  const res: ResultadoFeed[] = [
    { feed: fAirbnbC5, eventos: [{ uid: 'a1@airbnb.com', ci: '2026-11-21', co: '2026-11-25', summary: 'Reserved' }] },
    { feed: fGoogle, eventos: [{ uid: 'g2@google.com', ci: '2026-10-21', co: '2026-10-25', summary: 'C8 x3 Ana' }] },
  ];
  const p1 = planificarSync([], res, HOY);
  const despues = p1.upserts;
  const p2 = planificarSync(despues, res, HOY);
  assert.equal(p2.creados, 0);
  assert.equal(p2.actualizados, 0);
  assert.equal(p2.borrar.length, 0);
});

prueba('parsearIcal: líneas plegadas, fechas con hora, cancelados y bloqueos de Airbnb', () => {
  const ics = [
    'BEGIN:VCALENDAR',
    'BEGIN:VEVENT',
    'UID:uno@airbnb.com',
    'DTSTART;VALUE=DATE:20261020',
    'DTEND;VALUE=DATE:20261023',
    'SUMMARY:Reserved',
    'END:VEVENT',
    'BEGIN:VEVENT',
    'UID:dos@airbnb.com',
    'DTSTART;VALUE=DATE:20261101',
    'DTEND;VALUE=DATE:20261105',
    'SUMMARY:Airbnb (Not available)',
    'END:VEVENT',
    'BEGIN:VEVENT',
    'UID:tres@google.com',
    'DTSTART;TZID=America/Argentina/Buenos_Aires:20261110T140000',
    'DTEND;TZID=America/Argentina/Buenos_Aires:20261112T100000',
    'SUMMARY:C5 Muy largo nombre que',
    ' sigue en otra línea',
    'STATUS:CANCELLED',
    'END:VEVENT',
    'BEGIN:VEVENT',
    'UID:cuatro@google.com',
    'DTSTART;VALUE=DATE:20260101',
    'DTEND;VALUE=DATE:20260105',
    'SUMMARY:viejo',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  const ev = parsearIcal(ics, 'airbnb', HOY);
  assert.deepEqual(ev.map(e => e.uid), ['uno@airbnb.com']);
  const ev2 = parsearIcal(ics.replace('STATUS:CANCELLED\r\n', ''), 'google', HOY);
  assert.equal(ev2.find(e => e.uid === 'tres@google.com')?.summary, 'C5 Muy largo nombre quesigue en otra línea');
});

prueba('Con solo Airbnb cargado, NO se borran los bloqueos viejos de Google (pueden ser reservas reales)', () => {
  const reservas = [
    base({ id: 'ical-C7-5e38lka9gh3vmmoptc58', depto: 'C7', huesped: '🔒 Raquel 3 Pm', checkin: '2026-10-10', checkout: '2026-10-13', plataforma: 'Google', notas: 'Sincronización Google Calendar · C7 x2 Raquel' }),
    base({ id: 'ical-C9-7mq7ah0b6dpt9kg3mvld', depto: 'C9', huesped: '🔒 Mayra', checkin: '2026-10-03', checkout: '2026-10-19', plataforma: 'Google', notas: 'Sincronización Google Calendar · C9 Mayra' }),
    base({ id: 'ical-C5-1418fb94e984-old', depto: 'C5', huesped: '🔒 Reserved', checkin: '2026-11-01', checkout: '2026-11-03', plataforma: 'Airbnb', notas: 'Bloqueo iCal · airbnb' }),
    base({ id: 'ical-C8-1418fb94e984-otro', depto: 'C8', huesped: '🔒 Reserved', checkin: '2026-11-01', checkout: '2026-11-03', plataforma: 'Airbnb', notas: 'Bloqueo iCal · airbnb' }),
    base({ id: 'ical-C6-raro', depto: 'C6', huesped: '🔒 ?', checkin: '2026-11-01', checkout: '2026-11-03', notas: '' }),
  ];
  const plan = planificarSync(reservas, [{ feed: fAirbnbC5, eventos: [] }], HOY);
  // Solo el bloqueo viejo de Airbnb de C5 (su calendario se leyó y ya no lo tiene)
  assert.deepEqual(plan.borrar, ['ical-C5-1418fb94e984-old']);
});

prueba('Tomás: Google lo tiene en C8 y la reserva real está en C5 → el bloqueo de C8 se mantiene (no queda libre)', () => {
  const reservas = [
    base({ id: 'muq4ow19fcnop', depto: 'C5', huesped: 'Tomas', checkin: '2026-11-05', checkout: '2026-11-10', plataforma: 'Booking' }),
    base({ id: 'ical-C8-59sji18u2drlg2bbbhu4', depto: 'C8', huesped: '🔒 Tomas', checkin: '2026-11-05', checkout: '2026-11-10', plataforma: 'Google', notas: 'Sincronización Google Calendar · C8 tomas x 2 boo' }),
  ];
  const plan = planificarSync(reservas, [{ feed: fGoogle, eventos: [{ uid: '59sji18u2drlg2bbbhu4@google.com', ci: '2026-11-05', co: '2026-11-10', summary: 'C8 tomas x 2 boo' }] }], HOY);
  assert.deepEqual(plan.borrar, []);
  assert.equal(plan.upserts.find(u => u.id === 'ical-C8-59sji18u2drlg2bbbhu4')?.depto, 'C8');
});

console.log(`\n${ok} pruebas OK`);

import { cabanaDelTitulo } from '../src/services/icalSync';
prueba('cabanaDelTitulo reconoce los formatos de Fer y no inventa', () => {
  const casos: Array<[string, string | null]> = [
    ['C6miguel', 'C6'], ['C5x2 noelia', 'C5'], ['C 9mrie', 'C9'], ['Cabaña 3 Mariana', 'C3'], ['5 Noelia', 'C5'],
    ['c8 2x Queuri + perro', 'C8'], ['Spa Mica influencer', 'C7'], ['Juan 2 noches', null], ['Reserva Airbnb', null],
    ['C4candelária', null], ['C10 algo', null],
  ];
  for (const [t, esperado] of casos) assert.equal(cabanaDelTitulo(t), esperado, t);
});
console.log(`${ok} pruebas OK (total)`);
