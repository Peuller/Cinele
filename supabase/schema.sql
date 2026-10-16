-- Cena do Dia — schema Supabase
-- Execute no SQL Editor do Supabase.

-- 1) Curadoria diária
create table if not exists public.daily_movies (
  date       date primary key,
  tmdb_id    integer not null,
  title      text,                     -- apenas para conferência humana
  created_at timestamptz default now()
);
alter table public.daily_movies enable row level security;
-- Leitura pública apenas de datas até hoje (evita "espiar" o futuro)
drop policy if exists "daily read past" on public.daily_movies;
create policy "daily read past" on public.daily_movies
  for select using (date <= (now() at time zone 'America/Sao_Paulo')::date);

-- 2) Perfis / Premium
create table if not exists public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  email       text,
  is_premium  boolean not null default false,
  premium_until timestamptz,
  stripe_customer_id text,
  updated_at  timestamptz default now()
);
alter table public.profiles enable row level security;
drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles for select using (auth.uid() = id);
-- (escrita apenas via service role: webhook de pagamento)

-- Cria perfil automaticamente no primeiro login
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email) on conflict do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
