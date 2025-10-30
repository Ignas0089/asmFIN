begin;

create extension if not exists "pgcrypto";

do $$
begin
    if not exists (select 1 from pg_type where typname = 'transaction_type') then
        create type public.transaction_type as enum ('income', 'expense');
    end if;
end;
$$;

create table if not exists public.categories (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    type public.transaction_type not null,
    color text,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists categories_name_type_unique
    on public.categories (lower(name), type);

create table if not exists public.transactions (
    id uuid primary key default gen_random_uuid(),
    occurred_on date not null,
    description text not null,
    amount numeric(14,2) not null check (amount >= 0),
    type public.transaction_type not null,
    category_id uuid references public.categories(id) on delete set null,
    notes text,
    source text,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists transactions_occurred_on_idx on public.transactions (occurred_on);
create index if not exists transactions_category_idx on public.transactions (category_id);
create index if not exists transactions_type_idx on public.transactions (type);

create or replace function public.set_updated_at()
returns trigger as $$
begin
    new.updated_at = timezone('utc', now());
    return new;
end;
$$ language plpgsql;

create trigger transactions_set_updated_at
before update on public.transactions
for each row execute procedure public.set_updated_at();

create trigger categories_set_updated_at
before update on public.categories
for each row execute procedure public.set_updated_at();

commit;
