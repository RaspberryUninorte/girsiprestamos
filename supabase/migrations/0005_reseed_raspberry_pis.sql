-- LabFleet: inventario real del laboratorio
-- Reemplaza el seed de prueba (10 x Raspberry Pi 4) por el inventario real:
-- 80 x Raspberry Pi Zero 2 W. Solo seguro de ejecutar si no hay préstamos
-- activos que referencien las placas anteriores.

delete from raspberry_pis where id not in (
  select raspberry_pi_id from loans
);

insert into raspberry_pis (code, model)
select 'RPI-' || lpad(n::text, 3, '0'), 'Raspberry Pi Zero 2 W'
from generate_series(1, 80) as n
on conflict (code) do update set model = excluded.model;
