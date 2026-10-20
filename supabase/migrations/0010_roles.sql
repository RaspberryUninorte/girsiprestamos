-- LabFleet: registro de estudiantes y roles (pedido por el profesor)
-- Hasta ahora cualquier usuario autenticado era admin. Con registro publico
-- eso ya no vale: cada usuario tiene un perfil con rol 'admin' o 'estudiante',
-- y el RLS separa lo que puede hacer cada uno.
--   - admin: todo lo de antes (prestamos, inventario, proyectos).
--   - estudiante: solo lee sus propios prestamos y proyectos.

-- ---------------------------------------------------------------------------
-- Perfiles
-- ---------------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  student_code text,
  email text not null,
  role text not null default 'estudiante' check (role in ('admin', 'estudiante')),
  created_at timestamptz not null default now()
);

comment on table profiles is 'Datos y rol de cada usuario. Para volver admin a alguien: update profiles set role = ''admin'' where email = ...';

-- Crea el perfil al registrarse. El rol NUNCA se toma de raw_user_meta_data
-- (lo controla el usuario en el signUp): todo registro nuevo es estudiante.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, student_code, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'student_code', ''),
    new.email,
    'estudiante'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Las cuentas que ya existian fueron creadas a mano como administradores.
insert into profiles (id, full_name, email, role)
select id, '', email, 'admin'
from auth.users
on conflict (id) do nothing;

-- security definer: evita recursion de RLS al consultar profiles desde politicas.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

alter table profiles enable row level security;

create policy "own or admin read profiles"
  on profiles for select
  to authenticated
  using (id = auth.uid() or public.is_admin());

create policy "admin update profiles"
  on profiles for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Inventario: todos pueden leerlo (el estudiante ve codigo/modelo de lo que
-- tiene prestado), solo el admin lo modifica.
-- ---------------------------------------------------------------------------
drop policy if exists "authenticated read raspberry_pis" on items;
drop policy if exists "authenticated write raspberry_pis" on items;
drop policy if exists "authenticated update raspberry_pis" on items;

create policy "authenticated read items"
  on items for select
  to authenticated
  using (true);

create policy "admin insert items"
  on items for insert
  to authenticated
  with check (public.is_admin());

create policy "admin update items"
  on items for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "admin delete items"
  on items for delete
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Prestamos: el admin hace todo; el estudiante solo ve los prestamos
-- registrados con su correo. El correo del JWT esta verificado por Supabase
-- (requiere "Confirm email" activo en Auth), por eso se usa el correo y no el
-- codigo de estudiante, que es un dato libre del registro.
-- ---------------------------------------------------------------------------
drop policy if exists "authenticated read loans" on loans;
drop policy if exists "authenticated write loans" on loans;
drop policy if exists "authenticated update loans" on loans;
drop policy if exists "authenticated delete loans" on loans;

create policy "admin or own read loans"
  on loans for select
  to authenticated
  using (public.is_admin() or lower(student_email) = lower(auth.jwt() ->> 'email'));

create policy "admin insert loans"
  on loans for insert
  to authenticated
  with check (public.is_admin());

create policy "admin update loans"
  on loans for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "admin delete loans"
  on loans for delete
  to authenticated
  using (public.is_admin());

create index if not exists loans_student_email_lower_idx on loans (lower(student_email));

-- Sin security_invoker, la vista corre como su dueno y saltaria el RLS de loans.
alter view active_loans_per_student set (security_invoker = true);

-- ---------------------------------------------------------------------------
-- Fotos de entrega: solo admin
-- ---------------------------------------------------------------------------
drop policy if exists "authenticated read loan photos" on storage.objects;
drop policy if exists "authenticated upload loan photos" on storage.objects;
drop policy if exists "authenticated delete loan photos" on storage.objects;

create policy "admin read loan photos"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'loan-photos' and public.is_admin());

create policy "admin upload loan photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'loan-photos' and public.is_admin());

create policy "admin update loan photos"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'loan-photos' and public.is_admin());

create policy "admin delete loan photos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'loan-photos' and public.is_admin());
