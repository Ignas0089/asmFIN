-- Development seed data for the personal finance schema
-- Provides sample categories, transactions, and an import batch for local testing.

begin;

-- Clear existing data so the seed can be reapplied safely in development.
delete from public.transaction_audit_log;
delete from public.transactions;
delete from public.categories;
delete from public.import_batches;

-- Reference import batch for seeded transactions.
insert into public.import_batches (id, source, file_name, checksum, metadata)
values
    ('00000000-0000-0000-0000-0000000000a0', 'seed', 'development-fixtures.csv', 'seed-fixtures-checksum',
     jsonb_build_object('description', 'Development fixtures seeded via supabase/seed.sql'));

-- Income and expense categories with pastel-inspired color accents.
insert into public.categories (id, name, type, color)
values
    ('00000000-0000-0000-0000-000000000101', 'Salary', 'income', '#34D399'),
    ('00000000-0000-0000-0000-000000000102', 'Freelance', 'income', '#60A5FA'),
    ('00000000-0000-0000-0000-000000000201', 'Groceries', 'expense', '#FBBF24'),
    ('00000000-0000-0000-0000-000000000202', 'Dining Out', 'expense', '#F87171'),
    ('00000000-0000-0000-0000-000000000203', 'Transport', 'expense', '#A78BFA'),
    ('00000000-0000-0000-0000-000000000204', 'Utilities', 'expense', '#F472B6');

-- Core sample transactions representing recent activity.
insert into public.transactions (
    id,
    occurred_on,
    description,
    amount,
    type,
    category_id,
    import_batch_id,
    notes,
    raw_data
)
values
    ('00000000-0000-0000-0000-000000000301', '2024-05-31', 'Monthly Salary', 1800.00, 'income', '00000000-0000-0000-0000-000000000101',
     '00000000-0000-0000-0000-0000000000a0', 'Base salary payment', jsonb_build_object('source', 'payroll')),
    ('00000000-0000-0000-0000-000000000302', '2024-05-27', 'Website redesign project', 420.00, 'income', '00000000-0000-0000-0000-000000000102',
     '00000000-0000-0000-0000-0000000000a0', 'Freelance invoice paid', jsonb_build_object('invoice', 'INV-204')), 
    ('00000000-0000-0000-0000-000000000303', '2024-05-29', 'Grocery run - Fresh Market', 82.45, 'expense', '00000000-0000-0000-0000-000000000201',
     '00000000-0000-0000-0000-0000000000a0', 'Weekly groceries', jsonb_build_object('items', 24)),
    ('00000000-0000-0000-0000-000000000304', '2024-05-28', 'Dinner with friends', 36.80, 'expense', '00000000-0000-0000-0000-000000000202',
     '00000000-0000-0000-0000-0000000000a0', 'Restaurant spend', jsonb_build_object('people', 3)),
    ('00000000-0000-0000-0000-000000000305', '2024-05-26', 'Metro pass reload', 25.00, 'expense', '00000000-0000-0000-0000-000000000203',
     '00000000-0000-0000-0000-0000000000a0', 'Monthly commute', jsonb_build_object('type', 'public transit')),
    ('00000000-0000-0000-0000-000000000306', '2024-05-25', 'Electricity bill', 64.32, 'expense', '00000000-0000-0000-0000-000000000204',
     '00000000-0000-0000-0000-0000000000a0', 'Utility payment', jsonb_build_object('account', 'ELEC-7782')),
    ('00000000-0000-0000-0000-000000000307', '2024-05-24', 'Lunch meeting', 18.60, 'expense', '00000000-0000-0000-0000-000000000202',
     '00000000-0000-0000-0000-0000000000a0', 'Client lunch', jsonb_build_object('client', 'Acme Co.')),
    ('00000000-0000-0000-0000-000000000308', '2024-05-23', 'Ride share - airport drop', 32.15, 'expense', '00000000-0000-0000-0000-000000000203',
     '00000000-0000-0000-0000-0000000000a0', 'Travel expense', jsonb_build_object('service', 'Lift'));

commit;
