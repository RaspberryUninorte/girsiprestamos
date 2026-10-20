-- LabFleet: inventario generico (pedido por el profesor)
-- El inventario deja de ser solo de Raspberry Pi: ahora cualquier equipo del
-- laboratorio (sensores, Arduinos, camaras...) se registra y se presta igual.
-- Se renombran tabla/columnas en lugar de recrearlas para conservar los datos
-- y el historial de prestamos existente.

drop view if exists raspberry_pi_status;

alter table raspberry_pis rename to items;
alter table items add column if not exists category text not null default 'Raspberry Pi';
alter table items add column if not exists description text;
alter table items alter column model drop default;

-- ram_gb solo tenia sentido para placas: se pasa a la descripcion libre.
update items
set description = ram_gb || ' GB RAM'
where ram_gb is not null and description is null;
alter table items drop column if exists ram_gb;

comment on table items is 'Inventario fisico de equipos prestables del laboratorio.';
comment on column items.category is 'Tipo de equipo, ej: Raspberry Pi, Sensor, Arduino.';
comment on column items.model is 'Nombre o modelo del equipo, ej: Raspberry Pi Zero 2 W.';

create index if not exists items_category_idx on items (category);

alter table loans rename column raspberry_pi_id to item_id;
alter index if exists one_active_loan_per_pi rename to one_active_loan_per_item;

-- Estado en vivo de cada equipo: disponible / prestado.
-- security_invoker: la vista respeta el RLS de quien consulta (ver 0010).
create view item_status with (security_invoker = true) as
select
  i.id,
  i.code,
  i.category,
  i.model,
  i.description,
  i.serial_number,
  i.created_at,
  case
    when al.id is not null then 'prestado'
    else 'disponible'
  end as status,
  al.id as active_loan_id,
  al.student_name as current_student_name,
  al.student_code as current_student_code,
  al.started_at as current_loan_started_at,
  (select count(*) from loans l where l.item_id = i.id) as total_loans
from items i
left join loans al
  on al.item_id = i.id and al.status = 'activo';
