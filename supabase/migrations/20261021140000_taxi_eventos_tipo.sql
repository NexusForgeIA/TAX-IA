-- Tipo de evento (para la foto de la tarjeta del Radar). Ya aplicada en Supabase como «taxi_eventos_tipo».
alter table public.taxi_eventos add column if not exists tipo text not null default 'otro';
alter table public.taxi_eventos add constraint taxi_eventos_tipo_check check (tipo in ('futbol','feria','concierto','otro'));
update public.taxi_eventos set tipo = 'futbol' where nombre ilike '%leipzig%' or nombre ilike '%osasuna%';
update public.taxi_eventos set tipo = 'feria' where nombre ilike any (array['%ifema%','%expo%','%boat show%','%feria%']);

create or replace function public.taxi_eventos_ciudad(p_hoy date, p_ciudad text, p_limite integer default 40)
returns jsonb language sql stable security invoker set search_path = ''
as $$
  select coalesce(jsonb_agg(to_jsonb(e) order by e.fecha, e.hora_ini nulls last), '[]'::jsonb)
  from (select nombre, lugar, ciudad, tipo, fecha, fecha_fin, to_char(hora_ini,'HH24:MI') as hora_ini,
               to_char(hora_fin,'HH24:MI') as hora_fin, grande, fuente, fuente_url
          from public.taxi_eventos
         where ciudad = p_ciudad and coalesce(fecha_fin, fecha) >= p_hoy
         order by fecha, hora_ini nulls last
         limit least(greatest(p_limite,1), 60)) e;
$$;
revoke all on function public.taxi_eventos_ciudad(date, text, integer) from public, anon, authenticated;
grant execute on function public.taxi_eventos_ciudad(date, text, integer) to service_role;
