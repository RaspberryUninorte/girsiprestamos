-- LabFleet: recordatorio de devolucion (pedido por el profesor)
-- El cron diario avisa al estudiante cuando falta un dia para la devolucion
-- esperada. Esta columna evita que el recordatorio se envie mas de una vez.

alter table loans add column if not exists reminder_notified_at timestamptz;
