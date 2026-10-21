-- Radar: eventos de Madrid cargados a mano desde fuentes públicas (fuente y url obligatorias).
create table public.taxi_eventos (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null check (char_length(nombre) between 3 and 120),
  lugar      text not null check (char_length(lugar) between 2 and 120),
  ciudad     text not null default 'Madrid',
  fecha      date not null,
  fecha_fin  date check (fecha_fin is null or fecha_fin >= fecha),
  hora_ini   time,
  hora_fin   time,
  grande     boolean not null default false,
  fuente     text not null check (char_length(fuente) between 2 and 120),
  fuente_url text not null check (fuente_url ~ '^https://'),
  creado     timestamptz not null default now()
);
comment on table public.taxi_eventos is 'Eventos de Madrid cargados a mano desde fuentes públicas (fuente y url obligatorias). Sin datos personales.';
create index taxi_eventos_fecha_idx on public.taxi_eventos (fecha);
alter table public.taxi_eventos enable row level security;
revoke all on public.taxi_eventos from anon, authenticated;

create or replace function public.taxi_eventos_proximos(p_hoy date, p_limite integer default 40)
returns jsonb language sql stable security invoker set search_path = ''
as $$
  select coalesce(jsonb_agg(to_jsonb(e) order by e.fecha, e.hora_ini nulls last), '[]'::jsonb)
  from (select nombre, lugar, ciudad, fecha, fecha_fin, to_char(hora_ini,'HH24:MI') as hora_ini,
               to_char(hora_fin,'HH24:MI') as hora_fin, grande, fuente, fuente_url
          from public.taxi_eventos
         where coalesce(fecha_fin, fecha) >= p_hoy
         order by fecha, hora_ini nulls last
         limit least(greatest(p_limite,1), 60)) e;
$$;
revoke all on function public.taxi_eventos_proximos(date, integer) from public, anon, authenticated;
grant execute on function public.taxi_eventos_proximos(date, integer) to service_role;

-- La página «radar» entra en la lista cerrada del contador de aperturas (ver taxi_visitas).
alter table public.taxi_visitas drop constraint taxi_visitas_pagina_check;
alter table public.taxi_visitas add constraint taxi_visitas_pagina_check check (pagina in ('portada','inicio','ingresos','turnos','calculadoras','gastos','estadisticas','vencimientos','mantenimiento','avisos','instalar','privacidad','aviso-legal','radar'));
create or replace function public.taxi_contar_visita(p_pagina text, p_modo text, p_limite_hora integer)
returns text language plpgsql volatile security invoker set search_path = ''
as $$
declare h integer;
begin
  if p_pagina is null or p_pagina not in ('portada','inicio','ingresos','turnos','calculadoras','gastos','estadisticas','vencimientos','mantenimiento','avisos','instalar','privacidad','aviso-legal','radar')
     or p_modo is null or p_modo not in ('navegador', 'instalada') then
    return 'invalida';
  end if;
  insert into public.taxi_visitas_hora as v (hora, recuento) values (date_trunc('hour', now()), 1)
  on conflict (hora) do update set recuento = v.recuento + 1 returning recuento into h;
  if h = 1 then delete from public.taxi_visitas_hora where hora < now() - interval '2 days'; end if;
  if h > p_limite_hora then return 'tope'; end if;
  insert into public.taxi_visitas as v (dia, pagina, modo, recuento)
  values ((now() at time zone 'Europe/Madrid')::date, p_pagina, p_modo, 1)
  on conflict (dia, pagina, modo) do update set recuento = v.recuento + 1;
  return 'ok';
end;
$$;
revoke execute on function public.taxi_contar_visita(text, text, integer) from public, anon, authenticated;
grant execute on function public.taxi_contar_visita(text, text, integer) to service_role;
