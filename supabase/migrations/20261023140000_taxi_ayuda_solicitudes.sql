-- Solicitudes «Me interesa» de la pantalla Ayudas (decisión 47). Nombre y teléfono que el taxista envía con su
-- consentimiento para que una gestoría colaboradora le llame. Solo escribe la Edge Function taxi-ayuda (service_role):
-- sin políticas, sin lectura ni escritura para anon ni authenticated. Se conservan 12 meses como máximo.
create table public.taxi_ayuda_solicitudes (
  id             uuid        primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  nombre         text        not null check (char_length(nombre) between 2 and 80),
  telefono       text        not null check (telefono ~ '^\+?[0-9]{9,15}$'),
  mensaje        text        check (mensaje is null or char_length(mensaje) <= 500),
  consentimiento boolean     not null check (consentimiento),
  version_texto  text        not null check (char_length(version_texto) between 1 and 40),
  atendido       boolean     not null default false
);
comment on table public.taxi_ayuda_solicitudes is 'Solicitudes de contacto para la ayuda Auto+, con consentimiento. Solo service_role. Conservación: 12 meses.';
alter table public.taxi_ayuda_solicitudes enable row level security;
revoke all on public.taxi_ayuda_solicitudes from anon, authenticated;

-- Guarda una solicitud. Devuelve 'ok' o 'tope' (más de p_limite_hora en la última hora entre todos: no se guarda).
-- De paso borra las de más de 12 meses.
create or replace function public.taxi_guardar_solicitud_ayuda(p_nombre text, p_telefono text, p_mensaje text, p_version text, p_limite_hora integer)
returns text
language plpgsql
volatile
security invoker
set search_path = ''
as $$
begin
  delete from public.taxi_ayuda_solicitudes where created_at < now() - interval '12 months';
  if (select count(*) from public.taxi_ayuda_solicitudes where created_at > now() - interval '1 hour') >= p_limite_hora then
    return 'tope';
  end if;
  insert into public.taxi_ayuda_solicitudes (nombre, telefono, mensaje, consentimiento, version_texto)
  values (p_nombre, p_telefono, nullif(p_mensaje, ''), true, p_version);
  return 'ok';
end;
$$;
revoke execute on function public.taxi_guardar_solicitud_ayuda(text, text, text, text, integer) from public, anon, authenticated;
grant execute on function public.taxi_guardar_solicitud_ayuda(text, text, text, text, integer) to service_role;
