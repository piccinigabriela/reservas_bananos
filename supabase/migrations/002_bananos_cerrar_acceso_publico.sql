-- =====================================================================
-- Los Bananos · Migración 002 (CIERRA el acceso público)
-- Aplicar SOLO después de publicar la versión nueva de la app,
-- crear los usuarios y actualizar el worker de iCal.
-- Usa ALTER en vez de DROP para que el conector no pida confirmación especial.
-- =====================================================================

alter policy anon_all_reservas on public.reservas_bananos using (false) with check (false);
alter policy anon_all_gastos   on public.gastos_bananos   using (false) with check (false);

-- Para volver atrás en una emergencia (re-abre todo, NO recomendado):
-- alter policy anon_all_reservas on public.reservas_bananos using (true) with check (true);
-- alter policy anon_all_gastos   on public.gastos_bananos   using (true) with check (true);
