begin;

create extension if not exists "pgcrypto";

do $$
begin
    if not exists (select 1 from pg_type where typname = 'transaction_type') then
        create type public.transaction_type as enum ('income', 'expense');
    end if;
end;
$$;

create table if not exists public.import_batches (
    id uuid primary key default gen_random_uuid(),
    source text,
    file_name text,
    checksum text,
    imported_at timestamptz not null default timezone('utc', now()),
    metadata jsonb,
    created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists import_batches_checksum_key on public.import_batches (checksum);

create table if not exists public.categories (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    type public.transaction_type,
    color text,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists categories_name_unique on public.categories (lower(name));

create table if not exists public.transactions (
    id uuid primary key default gen_random_uuid(),
    occurred_on date not null,
    description text not null,
    amount numeric(14,2) not null check (amount >= 0),
    type public.transaction_type not null,
    category_id uuid references public.categories(id) on delete set null,
    import_batch_id uuid references public.import_batches(id) on delete set null,
    notes text,
    raw_data jsonb,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists transactions_occurred_on_idx on public.transactions (occurred_on);
create index if not exists transactions_category_idx on public.transactions (category_id);
create index if not exists transactions_import_batch_idx on public.transactions (import_batch_id);

create table if not exists public.transaction_audit_log (
    id uuid primary key default gen_random_uuid(),
    transaction_id uuid not null references public.transactions(id) on delete cascade,
    changed_at timestamptz not null default timezone('utc', now()),
    previous_values jsonb not null,
    new_values jsonb not null,
    change_source text default 'manual'
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
    new.updated_at = timezone('utc', now());
    return new;
end;
$$ language plpgsql;

create trigger set_timestamp
before update on public.transactions
for each row execute procedure public.set_updated_at();

create trigger categories_set_timestamp
before update on public.categories
for each row execute procedure public.set_updated_at();

commit;
