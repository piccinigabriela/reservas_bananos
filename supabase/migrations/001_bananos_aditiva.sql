-- =====================================================================
-- Los Bananos · Migración 001 (ADITIVA — no rompe la app actual)
-- Agrega columnas, tablas compartidas, roles y funciones públicas seguras.
-- Las políticas viejas "anon_all_*" se mantienen hasta la migración 002.
-- Aplicada el 09/10/2026 como 'bananos_001a_aditiva_sin_drops'.
-- =====================================================================

-- 1) Columnas nuevas en reservas: vínculo estable con el evento externo
alter table public.reservas_bananos
  add column if not exists ical_uid    text,
  add column if not exists origen      text,          -- ej: 'airbnb:C5', 'booking:C7', 'google:general'
  add column if not exists actualizado timestamptz default now();

create unique index if not exists reservas_bananos_origen_uid_key
  on public.reservas_bananos (origen, ical_uid)
  where ical_uid is not null and origen is not null;

create index if not exists reservas_bananos_depto_fechas_idx
  on public.reservas_bananos (depto, checkin, checkout);

create or replace function public.bananos_touch_actualizado()
returns trigger language plpgsql as $$
begin
  new.actualizado := now();
  return new;
end $$;

create trigger reservas_bananos_touch
  before update on public.reservas_bananos
  for each row execute function public.bananos_touch_actualizado();

-- 2) Rol del usuario (lo define SOLO el admin vía SQL en app_metadata)
create or replace function public.bananos_rol()
returns text language sql stable as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'bananos_rol', '')
$$;

create or replace function public.bananos_es_staff()
returns boolean language sql stable as $$
  select public.bananos_rol() in ('admin', 'recepcion', 'vol1', 'vol2')
$$;

-- 3) Tablas compartidas (antes vivían en el localStorage de cada celular)
create table if not exists public.bananos_config (
  clave        text primary key,
  valor        jsonb not null,
  actualizado  timestamptz not null default now(),
  actualizado_por uuid default auth.uid()
);

create table if not exists public.bananos_tareas (
  id             text primary key,
  voluntario_id  text not null check (voluntario_id in ('vol1', 'vol2')),
  fecha          text not null,
  titulo         text not null default '',
  tipo           text not null default 'otro',
  completada     boolean not null default false,
  horario        text,
  notas          text,
  depto          text,
  actualizado    timestamptz not null default now()
);

create table if not exists public.bananos_estado_cabanas (
  depto       text primary key,
  status      text not null check (status in ('limpia', 'pendiente', 'ocupada')),
  updated_at  timestamptz not null default now(),
  updated_by  text,
  notas       text
);

alter table public.bananos_config          enable row level security;
alter table public.bananos_tareas          enable row level security;
alter table public.bananos_estado_cabanas  enable row level security;

-- (anon no tiene políticas en estas tablas: RLS le niega todo)
grant select, insert, update, delete on public.bananos_config, public.bananos_tareas, public.bananos_estado_cabanas to authenticated;

-- 4) Políticas para el PERSONAL logueado (conviven con las viejas hasta la 002)
-- Reservas: todo el personal ve; admin y recepción cargan/editan/borran
create policy bananos_staff_select on public.reservas_bananos
  for select to authenticated using (public.bananos_es_staff());

create policy bananos_staff_insert on public.reservas_bananos
  for insert to authenticated with check (public.bananos_rol() in ('admin', 'recepcion'));

create policy bananos_staff_update on public.reservas_bananos
  for update to authenticated
  using (public.bananos_rol() in ('admin', 'recepcion'))
  with check (public.bananos_rol() in ('admin', 'recepcion'));

create policy bananos_staff_delete on public.reservas_bananos
  for delete to authenticated using (public.bananos_rol() in ('admin', 'recepcion'));

-- Gastos: solo propietario
create policy bananos_admin_gastos on public.gastos_bananos
  for all to authenticated
  using (public.bananos_rol() = 'admin')
  with check (public.bananos_rol() = 'admin');

-- Config: el personal lee lo no privado; solo el admin escribe
create policy bananos_config_select on public.bananos_config
  for select to authenticated
  using (public.bananos_es_staff() and (clave not like 'privado\_%' or public.bananos_rol() = 'admin'));

create policy bananos_config_write on public.bananos_config
  for all to authenticated
  using (public.bananos_rol() = 'admin')
  with check (public.bananos_rol() = 'admin');

-- Tareas: todos ven; admin/recepción gestionan; cada voluntario marca las suyas
create policy bananos_tareas_select on public.bananos_tareas
  for select to authenticated using (public.bananos_es_staff());

create policy bananos_tareas_insert on public.bananos_tareas
  for insert to authenticated with check (public.bananos_rol() in ('admin', 'recepcion'));

create policy bananos_tareas_update on public.bananos_tareas
  for update to authenticated
  using (public.bananos_rol() in ('admin', 'recepcion') or public.bananos_rol() = voluntario_id)
  with check (public.bananos_rol() in ('admin', 'recepcion') or public.bananos_rol() = voluntario_id);

create policy bananos_tareas_delete on public.bananos_tareas
  for delete to authenticated using (public.bananos_rol() in ('admin', 'recepcion'));

-- Semáforo de limpieza: todo el personal lo actualiza
create policy bananos_estado_select on public.bananos_estado_cabanas
  for select to authenticated using (public.bananos_es_staff());

create policy bananos_estado_upsert on public.bananos_estado_cabanas
  for insert to authenticated with check (public.bananos_es_staff());

create policy bananos_estado_update on public.bananos_estado_cabanas
  for update to authenticated using (public.bananos_es_staff()) with check (public.bananos_es_staff());

-- 5) Funciones PÚBLICAS acotadas (lo único que ve alguien sin login)
-- 5a) Cabañas ocupadas en un rango (sin nombres, teléfonos ni precios)
create or replace function public.bananos_ocupadas(p_desde text, p_hasta text)
returns table (depto text)
language sql stable security definer set search_path = public as $$
  select r.depto
  from public.reservas_bananos r
  where r.estado not in ('Cancelada', 'Non show', 'Devolución')
    and r.checkin is not null and r.checkout is not null
    and r.checkin < p_hasta and r.checkout > p_desde
$$;

-- 5b) Feed iCal de una cabaña (solo fechas y canal, para Airbnb/Booking)
create or replace function public.bananos_ical_feed(p_depto text)
returns table (id text, checkin text, checkout text, plataforma text)
language sql stable security definer set search_path = public as $$
  select r.id, r.checkin, r.checkout, r.plataforma
  from public.reservas_bananos r
  where r.depto = upper(p_depto)
    and r.estado not in ('Cancelada', 'Non show', 'Devolución')
    and r.checkin is not null and r.checkout is not null
    and r.checkout >= to_char((now() at time zone 'America/Argentina/Buenos_Aires')::date - 30, 'YYYY-MM-DD')
$$;

-- 5c) Info pública para la guía del huésped y Xenia (lo que el admin decide publicar)
create or replace function public.bananos_info_publica()
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'guia',  coalesce((select valor from public.bananos_config where clave = 'guia_publica'), '{}'::jsonb),
    'xenia', coalesce((select valor from public.bananos_config where clave = 'xenia_publico'), '{}'::jsonb)
  )
$$;

grant execute on function public.bananos_ocupadas(text, text), public.bananos_ical_feed(text), public.bananos_info_publica() to anon, authenticated;
