-- LabFleet: simplifica el estado de Raspberry Pi a solo 2 valores (Etapa 8)
-- Se elimina el estado "mantenimiento": ahora una placa es disponible o prestada,
-- sin distinción manual de placas dañadas/fuera de servicio.

drop view if exists raspberry_pi_status;

alter table raspberry_pis drop column if exists en_mantenimiento;

create or replace view raspberry_pi_status as
select
  rp.id,
  rp.code,
  rp.model,
  rp.ram_gb,
  rp.serial_number,
  case
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
