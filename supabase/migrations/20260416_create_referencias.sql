create table if not exists public.referencias (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc', now()),
  empresa text not null,
  reference_code text not null,
  nombre text,
  tipo_prenda text,
  color text,
  talla text,
  precio numeric,
  temporada text,
  notas text,
  image_url text
);

create unique index if not exists referencias_empresa_reference_code_idx
  on public.referencias (empresa, reference_code);

alter table public.referencias enable row level security;

create policy "Users can read own referencias"
  on public.referencias
  for select
  using (empresa = auth.jwt() ->> 'email');

create policy "Users can insert own referencias"
  on public.referencias
  for insert
  with check (empresa = auth.jwt() ->> 'email');

create policy "Users can update own referencias"
  on public.referencias
  for update
  using (empresa = auth.jwt() ->> 'email')
  with check (empresa = auth.jwt() ->> 'email');
