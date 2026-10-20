-- LabFleet: rastrea si ya se envio el aviso de atraso para un prestamo,
-- para que el cron diario no reenvie el mismo correo cada dia.

alter table loans add column if not exists overdue_notified_at timestamptz;
