create table if not exists public.ventas (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc', now()),
  empresa text not null,
  tipo_prenda text not null,
  color text not null default '',
  talla text not null default '',
  unidades integer not null,
  precio numeric not null,
  temporada text not null default ''
);

alter table public.ventas enable row level security;

create policy "Users can read own ventas"
  on public.ventas
  for select
  using (empresa = auth.jwt() ->> 'email');

create policy "Users can insert own ventas"
  on public.ventas
  for insert
  with check (empresa = auth.jwt() ->> 'email');

create policy "Users can update own ventas"
  on public.ventas
  for update
  using (empresa = auth.jwt() ->> 'email')
  with check (empresa = auth.jwt() ->> 'email');

create policy "Users can delete own ventas"
  on public.ventas
  for delete
  using (empresa = auth.jwt() ->> 'email');
