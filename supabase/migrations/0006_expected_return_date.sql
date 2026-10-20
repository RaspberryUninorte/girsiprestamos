-- LabFleet: fecha de devolucion esperada (planeada al crear el prestamo),
-- separada de ended_at (la fecha real de devolucion, que se llena al
-- marcar el prestamo como finalizado).

alter table loans add column if not exists expected_return_date date;
