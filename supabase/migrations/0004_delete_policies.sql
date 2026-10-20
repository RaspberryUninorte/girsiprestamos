-- LabFleet: permite borrar préstamos y sus fotos
-- (RLS bloqueaba DELETE por defecto: no existía política para esa operación)

create policy "authenticated delete loans"
  on loans for delete
  to authenticated
  using (true);

create policy "authenticated delete loan photos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'loan-photos');
