-- Carga propia de precios del Ministerio para Taxi-IA: solo Madrid (28), Barcelona (08), Valencia (46) y Sevilla (41).
-- Patrón tomado de Gasol-IA (pg_net + Vault + RPC) pero con objetos propios taxi_*: no se toca nada gasol_*.
-- Por provincia se guarda SOLO la última captura buena; una captura fallida o incompleta no sustituye a nada.

-- 1) Tablas. RLS activada y sin políticas: anon y authenticated no leen ni escriben. Solo service_role (Edge Functions).
create table public.taxi_gasolineras_capturas (
  id            bigint generated always as identity primary key,
  provincia     text not null check (provincia in ('28','08','46','41')),
  fecha_fuente  timestamptz,                       -- «Fecha» de la respuesta del Ministerio (hora peninsular -> UTC)
  creada        timestamptz not null default now(),
  estado        text not null check (estado in ('ok','error','duplicada')),
  n_estaciones  integer check (n_estaciones >= 0),
  n_precios     integer check (n_precios >= 0),
  huella        text check (huella ~ '^[0-9a-f]{64}$'),
  error         text check (char_length(error) <= 500)
);
create index taxi_gasolineras_capturas_prov_idx on public.taxi_gasolineras_capturas (provincia, id desc);

create table public.taxi_gasolineras_estaciones (
  ideess        text primary key check (ideess ~ '^\d{1,8}$'),
  rotulo        text not null default '',
  direccion     text not null default '',
  municipio     text not null default '',
  id_municipio  text not null check (id_municipio ~ '^\d{1,6}$'),
  provincia     text not null default '',
  id_provincia  text not null check (id_provincia in ('28','08','46','41')),
  lat           double precision not null check (lat between 27 and 44.5),
  lon           double precision not null check (lon between -18.5 and 4.5),
  horario_texto text not null default '',
  abierta_24h   text not null check (abierta_24h in ('si','no','sin_confirmar'))
);
create index taxi_gasolineras_estaciones_mun_idx on public.taxi_gasolineras_estaciones (id_provincia, id_municipio);

create table public.taxi_gasolineras_precios (
  ideess      text not null references public.taxi_gasolineras_estaciones (ideess) on delete cascade,
  combustible text not null check (combustible ~ '^[a-z0-9_]{2,40}$'),
  precio      numeric(7,3) not null check (precio > 0 and precio < 100),
  captura_id  bigint not null references public.taxi_gasolineras_capturas (id),
  primary key (ideess, combustible)
);
create index taxi_gasolineras_precios_comb_idx on public.taxi_gasolineras_precios (combustible, precio);
create index taxi_gasolineras_precios_captura_idx on public.taxi_gasolineras_precios (captura_id);

comment on table public.taxi_gasolineras_capturas is 'Registro de cada intento de carga por provincia (ok, error, duplicada). Sin datos personales.';
comment on table public.taxi_gasolineras_estaciones is 'Estaciones de las 4 provincias de Taxi-IA según la última captura buena. Origen: Ministerio para la Transición Ecológica y el Reto Demográfico.';
comment on table public.taxi_gasolineras_precios is 'Precios de la última captura buena de cada provincia. Origen: Ministerio para la Transición Ecológica y el Reto Demográfico.';

alter table public.taxi_gasolineras_capturas enable row level security;
alter table public.taxi_gasolineras_estaciones enable row level security;
alter table public.taxi_gasolineras_precios enable row level security;
revoke all on public.taxi_gasolineras_capturas, public.taxi_gasolineras_estaciones, public.taxi_gasolineras_precios from anon, authenticated;

-- 2) Token de la ingesta en Vault, generado dentro de la base: nunca aparece en claro ni en el cliente.
select vault.create_secret(
  replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  'taxi_gasolineras_token', 'Token de taxi-gasolineras-ingest (cabecera x-taxi-token)');

create or replace function public.taxi_gasolineras_token_valido(p_token text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select coalesce((select s.decrypted_secret = p_token from vault.decrypted_secrets s
                    where s.name = 'taxi_gasolineras_token' limit 1), false);
$$;
revoke all on function public.taxi_gasolineras_token_valido(text) from public, anon, authenticated;
grant execute on function public.taxi_gasolineras_token_valido(text) to service_role;

-- 3) Descarga por pg_net: el servidor del Ministerio solo acepta TLS 1.2 con RSA estático y el fetch de Deno no conecta.
--    URL fija y provincia de una lista cerrada: no se acepta ninguna URL externa (sin SSRF).
create or replace function public.taxi_gasolineras_descargar(p_provincia text)
returns bigint language plpgsql volatile security definer set search_path = ''
as $$
begin
  if p_provincia is null or p_provincia not in ('28','08','46','41') then
    raise exception 'Provincia no admitida';
  end if;
  return net.http_get(
    url := 'https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/FiltroProvincia/' || p_provincia,
    headers := '{"Accept": "application/json"}'::jsonb,
    timeout_milliseconds := 30000);
end;
$$;
revoke all on function public.taxi_gasolineras_descargar(text) from public, anon, authenticated;
grant execute on function public.taxi_gasolineras_descargar(text) to service_role;

-- 0 filas mientras pg_net no haya terminado. Al leer la respuesta se borra de net._http_response (pesa ~1 MB).
create or replace function public.taxi_gasolineras_descarga_resultado(p_id bigint)
returns table (status_code integer, timed_out boolean, error_msg text, content text)
language plpgsql volatile security definer set search_path = ''
as $$
begin
  return query delete from net._http_response r where r.id = p_id
    returning r.status_code, r.timed_out, r.error_msg, r.content;
end;
$$;
revoke all on function public.taxi_gasolineras_descarga_resultado(bigint) from public, anon, authenticated;
grant execute on function public.taxi_gasolineras_descarga_resultado(bigint) to service_role;

-- 4) Sustitución de una provincia en una sola transacción, SOLO con una captura ya validada por la Edge Function.
--    Si la huella es la de la última captura buena, no se recarga nada: se anota 'duplicada' (confirma que sigue vigente).
create or replace function public.taxi_gasolineras_sustituir(
  p_provincia text, p_fecha_fuente timestamptz, p_huella text, p_estaciones jsonb, p_precios jsonb)
returns jsonb language plpgsql volatile security invoker set search_path = ''
as $$
declare
  v_id bigint; v_anterior text; v_ne integer; v_np integer;
begin
  if p_provincia is null or p_provincia not in ('28','08','46','41') then raise exception 'Provincia no admitida'; end if;
  if jsonb_typeof(p_estaciones) <> 'array' or jsonb_typeof(p_precios) <> 'array' then raise exception 'Datos no válidos'; end if;
  perform pg_advisory_xact_lock(hashtext('taxi_gasolineras_' || p_provincia));

  select c.huella into v_anterior from public.taxi_gasolineras_capturas c
   where c.provincia = p_provincia and c.estado = 'ok' order by c.id desc limit 1;
  v_ne := jsonb_array_length(p_estaciones); v_np := jsonb_array_length(p_precios);

  if v_anterior is not distinct from p_huella then
    insert into public.taxi_gasolineras_capturas (provincia, fecha_fuente, estado, n_estaciones, n_precios, huella)
    values (p_provincia, p_fecha_fuente, 'duplicada', v_ne, v_np, p_huella) returning id into v_id;
    return jsonb_build_object('estado', 'duplicada', 'captura_id', v_id, 'n_estaciones', v_ne, 'n_precios', v_np);
  end if;

  insert into public.taxi_gasolineras_capturas (provincia, fecha_fuente, estado, n_estaciones, n_precios, huella)
  values (p_provincia, p_fecha_fuente, 'ok', v_ne, v_np, p_huella) returning id into v_id;

  -- Fuera lo de la captura anterior de esta provincia (precios y estaciones que ya no vienen).
  delete from public.taxi_gasolineras_precios p using public.taxi_gasolineras_estaciones e
   where p.ideess = e.ideess and e.id_provincia = p_provincia;
  delete from public.taxi_gasolineras_estaciones e
   where e.id_provincia = p_provincia
     and not exists (select 1 from jsonb_array_elements(p_estaciones) x where x->>'ideess' = e.ideess);

  insert into public.taxi_gasolineras_estaciones as t
    (ideess, rotulo, direccion, municipio, id_municipio, provincia, id_provincia, lat, lon, horario_texto, abierta_24h)
  select x.ideess, coalesce(x.rotulo, ''), coalesce(x.direccion, ''), coalesce(x.municipio, ''), x.id_municipio,
         coalesce(x.provincia, ''), p_provincia, x.lat, x.lon, coalesce(x.horario_texto, ''), x.abierta_24h
    from jsonb_to_recordset(p_estaciones) as x(ideess text, rotulo text, direccion text, municipio text, id_municipio text,
         provincia text, lat double precision, lon double precision, horario_texto text, abierta_24h text)
  on conflict (ideess) do update set rotulo = excluded.rotulo, direccion = excluded.direccion, municipio = excluded.municipio,
    id_municipio = excluded.id_municipio, provincia = excluded.provincia, id_provincia = excluded.id_provincia,
    lat = excluded.lat, lon = excluded.lon, horario_texto = excluded.horario_texto, abierta_24h = excluded.abierta_24h;

  insert into public.taxi_gasolineras_precios (ideess, combustible, precio, captura_id)
  select x.ideess, x.combustible, x.precio, v_id
    from jsonb_to_recordset(p_precios) as x(ideess text, combustible text, precio numeric);

  -- Registro de capturas: 30 días (las que aún sostienen precios no se borran).
  delete from public.taxi_gasolineras_capturas c
   where c.creada < now() - interval '30 days'
     and not exists (select 1 from public.taxi_gasolineras_precios p where p.captura_id = c.id);

  return jsonb_build_object('estado', 'ok', 'captura_id', v_id, 'n_estaciones', v_ne, 'n_precios', v_np);
end;
$$;
revoke all on function public.taxi_gasolineras_sustituir(text, timestamptz, text, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.taxi_gasolineras_sustituir(text, timestamptz, text, jsonb, jsonb) to service_role;

-- Un intento fallido queda registrado y no cambia nada de lo publicado.
create or replace function public.taxi_gasolineras_captura_error(p_provincia text, p_fecha_fuente timestamptz, p_error text)
returns bigint language sql volatile security invoker set search_path = ''
as $$
  insert into public.taxi_gasolineras_capturas (provincia, fecha_fuente, estado, error)
  values (p_provincia, p_fecha_fuente, 'error', left(coalesce(p_error, 'error'), 500)) returning id;
$$;
revoke all on function public.taxi_gasolineras_captura_error(text, timestamptz, text) from public, anon, authenticated;
grant execute on function public.taxi_gasolineras_captura_error(text, timestamptz, text) to service_role;

-- 5) Vigencia de cada provincia: la fecha de la última captura buena o de una posterior idéntica ('duplicada').
create or replace view public.taxi_gasolineras_vigencia with (security_invoker = on) as
  select u.provincia,
         (select max(c.fecha_fuente) from public.taxi_gasolineras_capturas c
           where c.provincia = u.provincia and c.estado in ('ok','duplicada') and c.id >= u.id_ok) as fecha_fuente,
         u.n_estaciones
    from (select distinct on (provincia) provincia, id as id_ok, n_estaciones
            from public.taxi_gasolineras_capturas where estado = 'ok' order by provincia, id desc) u;
revoke all on public.taxi_gasolineras_vigencia from anon, authenticated;

-- 6) Lectura para la función pública taxi-gasolineras: las más baratas de un municipio, los municipios de la provincia
--    y la fecha de la captura. Sin datos del usuario.
create or replace function public.taxi_gasolineras_buscar(
  p_provincia text, p_municipio text, p_combustible text, p_solo24 boolean, p_limite integer)
returns jsonb language sql stable security invoker set search_path = ''
as $$
  select jsonb_build_object(
    'fecha_fuente', (select v.fecha_fuente from public.taxi_gasolineras_vigencia v where v.provincia = p_provincia),
    'municipios', coalesce((select jsonb_agg(jsonb_build_array(m.id_municipio, m.municipio) order by m.municipio)
                              from (select distinct e.id_municipio, e.municipio from public.taxi_gasolineras_estaciones e
                                     where e.id_provincia = p_provincia) m), '[]'::jsonb),
    'resultados', coalesce((select jsonb_agg(to_jsonb(r) order by r.precio, r.ideess) from (
        select e.ideess, e.rotulo, e.direccion, e.municipio, e.id_municipio, e.lat, e.lon, e.horario_texto, e.abierta_24h,
               p.combustible, p.precio
          from public.taxi_gasolineras_precios p
          join public.taxi_gasolineras_estaciones e on e.ideess = p.ideess
         where e.id_provincia = p_provincia and e.id_municipio = p_municipio and p.combustible = p_combustible
           and (not p_solo24 or e.abierta_24h = 'si')
         order by p.precio, e.ideess
         limit least(greatest(p_limite, 1), 50)) r), '[]'::jsonb));
$$;
revoke all on function public.taxi_gasolineras_buscar(text, text, text, boolean, integer) from public, anon, authenticated;
grant execute on function public.taxi_gasolineras_buscar(text, text, text, boolean, integer) to service_role;

-- 7) Frescura para el resumen diario: vigencia y último intento de cada provincia.
create or replace function public.taxi_gasolineras_frescura()
returns jsonb language sql stable security invoker set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'provincia', p.provincia,
           'fecha_fuente', v.fecha_fuente,
           'n_estaciones', v.n_estaciones,
           'ultimo_estado', (select c.estado from public.taxi_gasolineras_capturas c where c.provincia = p.provincia order by c.id desc limit 1))
         order by p.orden), '[]'::jsonb)
    from (values ('28', 1), ('08', 2), ('46', 3), ('41', 4)) p(provincia, orden)
    left join public.taxi_gasolineras_vigencia v on v.provincia = p.provincia;
$$;
revoke all on function public.taxi_gasolineras_frescura() from public, anon, authenticated;
grant execute on function public.taxi_gasolineras_frescura() to service_role;

-- 8) Cron: cada 30 minutos de 06:00 a 23:30 hora peninsular (pg_cron va en UTC: se lanza siempre y se filtra aquí).
--    El resultado real de cada provincia queda en taxi_gasolineras_capturas (ok, duplicada o error con su motivo).
create or replace function public.taxi_gasolineras_lanzar()
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if extract(hour from now() at time zone 'Europe/Madrid') < 6 then return; end if;
  perform net.http_post(
    url := 'https://mlaqtniujnvfxcvcourm.supabase.co/functions/v1/taxi-gasolineras-ingest',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-taxi-token', (select decrypted_secret from vault.decrypted_secrets where name = 'taxi_gasolineras_token' limit 1)),
    body := '{}'::jsonb, timeout_milliseconds := 60000);
end;
$$;
revoke all on function public.taxi_gasolineras_lanzar() from public, anon, authenticated;

select cron.schedule('taxi-gasolineras-carga', '0,30 * * * *', $cron$ select public.taxi_gasolineras_lanzar(); $cron$);
