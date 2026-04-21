-- Refactor ventas table to match the company's Excel export
-- Columns: Mes del año | Marca | Clase Genero | Clase Linea | Tipo de producto | Referencia | VENTA UNDS | VENTA $$
-- unidades y venta_total pueden ser negativos (devoluciones).

drop table if exists public.ventas cascade;

create table public.ventas (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc', now()),
  empresa text not null,
  mes text not null default '',
  marca text not null default '',
  genero text not null default '',
  linea text not null default '',
  tipo_producto text not null default '',
  referencia text not null,
  unidades integer not null,
  venta_total numeric not null
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
