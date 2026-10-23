-- Carga de Gasolineras en dos pasos. Con un solo paso (el cron llama por pg_net a taxi-gasolineras-ingest y esta pide las
-- descargas a pg_net y espera) el trabajador de pg_net no atiende las descargas hasta que termina la llamada en curso:
-- las cuatro esperas agotan sus 30 s (visto el 23/10/2026 a las 22:00). Ahora:
--   :00 y :30 -> taxi_gasolineras_pedir(): la base pide las 4 descargas y guarda sus ids.
--   :02 y :32 -> taxi_gasolineras_lanzar(): llama a la función, que recoge esas respuestas (ya descargadas), valida y sustituye.
-- Igual que antes: de 06:00 a 23:30 hora peninsular, y una provincia que falla conserva su última captura buena.

create table public.taxi_gasolineras_descargas (
  id        bigint primary key,                       -- id de la petición de pg_net
  provincia text not null check (provincia in ('28','08','46','41')),
  pedida    timestamptz not null default now()
);
comment on table public.taxi_gasolineras_descargas is 'Descargas del Ministerio pedidas a pg_net y aún no recogidas por taxi-gasolineras-ingest.';
alter table public.taxi_gasolineras_descargas enable row level security;
revoke all on public.taxi_gasolineras_descargas from anon, authenticated;

create or replace function public.taxi_gasolineras_pedir()
returns void language plpgsql security definer set search_path = ''
as $$
declare p text;
begin
  if extract(hour from now() at time zone 'Europe/Madrid') < 6 then return; end if;
  delete from public.taxi_gasolineras_descargas where pedida < now() - interval '1 day';
  foreach p in array array['28','08','46','41'] loop
    insert into public.taxi_gasolineras_descargas (id, provincia) values (public.taxi_gasolineras_descargar(p), p);
  end loop;
end;
$$;
revoke all on function public.taxi_gasolineras_pedir() from public, anon, authenticated;

-- La última descarga pedida de la provincia en los últimos 20 minutos (y se dan por recogidas todas las de esa provincia).
create or replace function public.taxi_gasolineras_pendiente(p_provincia text)
returns bigint language plpgsql volatile security invoker set search_path = ''
as $$
declare v bigint;
begin
  select d.id into v from public.taxi_gasolineras_descargas d
   where d.provincia = p_provincia and d.pedida > now() - interval '20 minutes' order by d.pedida desc, d.id desc limit 1;
  delete from public.taxi_gasolineras_descargas where provincia = p_provincia;
  return v;
end;
$$;
revoke all on function public.taxi_gasolineras_pendiente(text) from public, anon, authenticated;
grant execute on function public.taxi_gasolineras_pendiente(text) to service_role;

-- La descarga ya no la pide la Edge Function: solo la base (taxi_gasolineras_pedir).
revoke execute on function public.taxi_gasolineras_descargar(text) from service_role;

select cron.unschedule('taxi-gasolineras-carga');
select cron.schedule('taxi-gasolineras-pedir', '0,30 * * * *', $cron$ select public.taxi_gasolineras_pedir(); $cron$);
select cron.schedule('taxi-gasolineras-carga', '2,32 * * * *', $cron$ select public.taxi_gasolineras_lanzar(); $cron$);
