-- LabFleet: esquema inicial (Etapa 1)
-- Modela préstamos de Raspberry Pi a estudiantes.
-- No hay registro público: cualquier usuario autenticado (creado manualmente
-- en Supabase Auth) es considerado administrador.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Inventario de Raspberry Pi
-- ---------------------------------------------------------------------------
create table if not exists raspberry_pis (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,                    -- ej: RPI-042
  model text not null default 'Raspberry Pi 4 Model B',
  ram_gb integer,
  serial_number text,
  en_mantenimiento boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table raspberry_pis is 'Inventario físico de placas Raspberry Pi.';
comment on column raspberry_pis.en_mantenimiento is 'Marca manual: placa fuera de servicio, no disponible para préstamo.';

-- ---------------------------------------------------------------------------
-- Préstamos
-- ---------------------------------------------------------------------------
create table if not exists loans (
  id uuid primary key default gen_random_uuid(),
  raspberry_pi_id uuid not null references raspberry_pis(id),
  student_name text not null,
  student_code text not null,
  student_email text not null,
  photo_top_url text,
  photo_bottom_url text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  status text not null default 'activo' check (status in ('activo', 'finalizado')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

comment on table loans is 'Historial completo de préstamos de Raspberry Pi a estudiantes.';

-- Una Raspberry Pi no puede tener dos préstamos activos a la vez.
create unique index if not exists one_active_loan_per_pi
  on loans (raspberry_pi_id)
  where status = 'activo';

create index if not exists loans_status_idx on loans (status);
create index if not exists loans_student_code_idx on loans (student_code);

-- ---------------------------------------------------------------------------
-- Vistas de lectura (estado derivado, sin duplicar datos)
-- ---------------------------------------------------------------------------

-- Estado en vivo de cada Raspberry Pi: disponible / prestada / mantenimiento
create or replace view raspberry_pi_status as
select
  rp.id,
  rp.code,
  rp.model,
  rp.ram_gb,
  rp.serial_number,
  rp.en_mantenimiento,
  case
    when rp.en_mantenimiento then 'mantenimiento'
    when al.id is not null then 'prestada'
    else 'disponible'
  end as status,
  al.id as active_loan_id,
  al.student_name as current_student_name,
  al.student_code as current_student_code,
  al.started_at as current_loan_started_at
from raspberry_pis rp
left join loans al
  on al.raspberry_pi_id = rp.id and al.status = 'activo';

-- Cuántas Raspberry Pi tiene prestadas cada estudiante ahora mismo
create or replace view active_loans_per_student as
select
  student_code,
  student_name,
  student_email,
  count(*) as active_loans
from loans
where status = 'activo'
group by student_code, student_name, student_email;

-- ---------------------------------------------------------------------------
-- RLS: cualquier usuario autenticado (= admin, no hay registro público)
-- ---------------------------------------------------------------------------
alter table raspberry_pis enable row level security;
alter table loans enable row level security;

create policy "authenticated read raspberry_pis"
  on raspberry_pis for select
  to authenticated
  using (true);

create policy "authenticated write raspberry_pis"
  on raspberry_pis for insert
  to authenticated
  with check (true);

create policy "authenticated update raspberry_pis"
  on raspberry_pis for update
  to authenticated
  using (true)
  with check (true);

create policy "authenticated read loans"
  on loans for select
  to authenticated
  using (true);

create policy "authenticated write loans"
  on loans for insert
  to authenticated
  with check (true);

create policy "authenticated update loans"
  on loans for update
  to authenticated
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------
-- Storage: bucket privado para fotos de entrega (top/bottom)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('loan-photos', 'loan-photos', false)
on conflict (id) do nothing;

create policy "authenticated read loan photos"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'loan-photos');

create policy "authenticated upload loan photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'loan-photos');
