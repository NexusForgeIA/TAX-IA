-- Radar en 4 ciudades: Madrid, Barcelona, Sevilla y Valencia (las de más demanda por el AVE).
alter table public.taxi_eventos add constraint taxi_eventos_ciudad_check check (ciudad in ('Madrid','Barcelona','Sevilla','Valencia'));

create or replace function public.taxi_eventos_ciudad(p_hoy date, p_ciudad text, p_limite integer default 40)
returns jsonb language sql stable security invoker set search_path = ''
as $$
  select coalesce(jsonb_agg(to_jsonb(e) order by e.fecha, e.hora_ini nulls last), '[]'::jsonb)
  from (select nombre, lugar, ciudad, fecha, fecha_fin, to_char(hora_ini,'HH24:MI') as hora_ini,
               to_char(hora_fin,'HH24:MI') as hora_fin, grande, fuente, fuente_url
          from public.taxi_eventos
         where ciudad = p_ciudad and coalesce(fecha_fin, fecha) >= p_hoy
         order by fecha, hora_ini nulls last
         limit least(greatest(p_limite,1), 60)) e;
$$;
revoke all on function public.taxi_eventos_ciudad(date, text, integer) from public, anon, authenticated;
grant execute on function public.taxi_eventos_ciudad(date, text, integer) to service_role;
-- Sustituye a taxi_eventos_proximos(date, integer), que ya no se usa.
