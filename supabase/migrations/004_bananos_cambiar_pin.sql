-- =====================================================================
-- Los Bananos · Migración 004 (PENDIENTE): cambiar PIN desde Configuración
-- Correr en Supabase → SQL Editor (el conector de Claude no permite aplicarla).
-- =====================================================================

-- Cambiar el PIN de recepción o de un voluntario (solo propietario). También cierra
-- las sesiones abiertas de esa cuenta, así el voluntario anterior deja de tener acceso.
create or replace function public.bananos_cambiar_pin(p_rol text, p_pin text)
returns boolean
language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  v_user uuid;
begin
  if public.bananos_rol() <> 'admin' then
    raise exception 'Solo el propietario puede cambiar PINs';
  end if;
  if p_rol not in ('recepcion', 'vol1', 'vol2') then
    raise exception 'Perfil inválido';
  end if;
  if p_pin !~ '^[0-9]{6}$' then
    raise exception 'El PIN tiene que tener 6 números';
  end if;
  select u.user_id into v_user from public.bananos_usuarios u where u.rol = p_rol limit 1;
  if v_user is null then
    raise exception 'No existe la cuenta de %', p_rol;
  end if;
  update auth.users
     set encrypted_password = extensions.crypt(p_pin, extensions.gen_salt('bf')),
         updated_at = now()
   where id = v_user;
  delete from auth.sessions where user_id = v_user;
  return true;
end $$;
revoke all on function public.bananos_cambiar_pin(text, text) from public, anon;
grant execute on function public.bananos_cambiar_pin(text, text) to authenticated;

