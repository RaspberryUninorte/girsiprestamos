-- LabFleet: inventario inicial de Raspberry Pi (Etapa 4)
-- Ajusta cantidades/modelos según el inventario real del laboratorio.

insert into raspberry_pis (code, model, ram_gb)
values
  ('RPI-001', 'Raspberry Pi 4 Model B', 8),
  ('RPI-002', 'Raspberry Pi 4 Model B', 8),
  ('RPI-003', 'Raspberry Pi 4 Model B', 8),
  ('RPI-004', 'Raspberry Pi 4 Model B', 4),
  ('RPI-005', 'Raspberry Pi 4 Model B', 4),
  ('RPI-006', 'Raspberry Pi 4 Model B', 4),
  ('RPI-007', 'Raspberry Pi 4 Model B', 4),
  ('RPI-008', 'Raspberry Pi 4 Model B', 4),
  ('RPI-009', 'Raspberry Pi 4 Model B', 4),
  ('RPI-010', 'Raspberry Pi 4 Model B', 4)
on conflict (code) do nothing;
