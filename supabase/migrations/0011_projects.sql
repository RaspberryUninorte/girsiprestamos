-- LabFleet: proyectos del semillero (pedido por el profesor)
-- El admin crea proyectos y asigna estudiantes registrados; cada estudiante
-- ve en su panel los proyectos en los que participa y sus companeros.

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  status text not null default 'activo' check (status in ('activo', 'finalizado')),
  created_at timestamptz not null default now()
);

create table if not exists project_members (
  project_id uuid not null references projects(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (project_id, profile_id)
);

create index if not exists project_members_profile_idx on project_members (profile_id);

-- security definer: las politicas de project_members no pueden consultarse a
-- si mismas sin recursion de RLS.
create or replace function public.is_project_member(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from project_members where project_id = p_project_id and profile_id = auth.uid()
  );
$$;

create or replace function public.shares_project_with(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from project_members mine
    join project_members theirs on theirs.project_id = mine.project_id
    where mine.profile_id = auth.uid() and theirs.profile_id = p_profile_id
  );
$$;

alter table projects enable row level security;
alter table project_members enable row level security;

create policy "admin or member read projects"
  on projects for select
  to authenticated
  using (public.is_admin() or public.is_project_member(id));

create policy "admin write projects"
  on projects for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "admin or member read project_members"
  on project_members for select
  to authenticated
  using (public.is_admin() or public.is_project_member(project_id));

create policy "admin write project_members"
  on project_members for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Para mostrar el nombre de los companeros de proyecto.
create policy "teammates read profiles"
  on profiles for select
  to authenticated
  using (public.shares_project_with(id));
