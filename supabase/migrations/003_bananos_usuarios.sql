-- =====================================================================
-- Los Bananos · Migración 003: usuarios y roles
--  - El rol de cada persona vive en la tabla bananos_usuarios (ya no en app_metadata).
--  - Crea las cuentas de Recepción, Voluntario 1, Voluntario 2 y Fernando.
--  - (La función para cambiar PIN está en 004: el conector no la dejó aplicar.)
-- Aplicada el 09/10/2026 en dos partes: bananos_003a_tabla_roles y bananos_003c_cuentas.
-- Los valores entre {{ }} se reemplazan al aplicar (no se guardan en el repo).
-- =====================================================================

create table if not exists public.bananos_usuarios (
  user_id  uuid primary key references auth.users (id) on delete cascade,
  rol      text not null check (rol in ('admin', 'recepcion', 'vol1', 'vol2')),
  nombre   text,
  creado   timestamptz not null default now()
);
alter table public.bananos_usuarios enable row level security;
grant select on public.bananos_usuarios to authenticated;

-- El rol sale de la tabla (security definer para poder leerla desde las políticas)
create or replace function public.bananos_rol()
returns text language sql stable security definer set search_path = public as $$
  select coalesce((select u.rol from public.bananos_usuarios u where u.user_id = auth.uid()), '')
$$;

create or replace function public.bananos_mi_rol()
returns text language sql stable security definer set search_path = public as $$
  select public.bananos_rol()
$$;
grant execute on function public.bananos_mi_rol() to authenticated;

create policy bananos_usuarios_select on public.bananos_usuarios
  for select to authenticated
  using (user_id = auth.uid() or public.bananos_rol() = 'admin');

-- Cuentas del personal (contraseña = PIN) y de Fernando (propietario)
with nuevas (email, clave, rol, nombre) as (
  values
    ('recepcion@reservas.woodcabiniguazu.com.ar',   '{{PIN_RECEPCION}}', 'recepcion', 'Recepción'),
    ('voluntario1@reservas.woodcabiniguazu.com.ar', '{{PIN_VOL1}}',      'vol1',      'Voluntario 1'),
    ('voluntario2@reservas.woodcabiniguazu.com.ar', '{{PIN_VOL2}}',      'vol2',      'Voluntario 2'),
    ('ferpiccini1@gmail.com',                       '{{CLAVE_FER}}',     'admin',     'Fernando')
),
ins as (
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  )
  select '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
         n.email, extensions.crypt(n.clave, extensions.gen_salt('bf')), now(),
         '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('nombre', n.nombre), now(), now(),
         '', '', '', ''
  from nuevas n
  where not exists (select 1 from auth.users u where lower(u.email) = lower(n.email))
  returning id, email
),
idents as (
  insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  select i.id::text, i.id, jsonb_build_object('sub', i.id::text, 'email', i.email, 'email_verified', true), 'email', now(), now(), now()
  from ins i
  returning user_id
)
insert into public.bananos_usuarios (user_id, rol, nombre)
select i.id, n.rol, n.nombre
from ins i join nuevas n on lower(n.email) = lower(i.email)
on conflict (user_id) do nothing;

-- Gabriela (cuenta existente) como propietaria
insert into public.bananos_usuarios (user_id, rol, nombre)
select u.id, 'admin', 'Gabriela'
from auth.users u
where lower(u.email) = 'piccini.gabriela@gmail.com'
on conflict (user_id) do nothing;
