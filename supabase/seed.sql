-- Development seed data for the personal finance schema
-- Provides sample categories and transactions for local testing.

begin;

-- Clear existing data so the seed can be reapplied safely in development.
delete from public.transactions;
delete from public.categories;

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
    notes,
    source
)
values
    ('00000000-0000-0000-0000-000000000301', '2024-05-31', 'Monthly Salary', 1800.00, 'income', '00000000-0000-0000-0000-000000000101',
     'Base salary payment', 'manual'),
    ('00000000-0000-0000-0000-000000000302', '2024-05-27', 'Website redesign project', 420.00, 'income', '00000000-0000-0000-0000-000000000102',
     'Freelance invoice paid', 'manual'),
    ('00000000-0000-0000-0000-000000000303', '2024-05-29', 'Grocery run - Fresh Market', 82.45, 'expense', '00000000-0000-0000-0000-000000000201',
     'Weekly groceries', 'manual'),
    ('00000000-0000-0000-0000-000000000304', '2024-05-28', 'Dinner with friends', 36.80, 'expense', '00000000-0000-0000-0000-000000000202',
     'Restaurant spend', 'manual'),
    ('00000000-0000-0000-0000-000000000305', '2024-05-26', 'Metro pass reload', 25.00, 'expense', '00000000-0000-0000-0000-000000000203',
     'Monthly commute', 'manual'),
    ('00000000-0000-0000-0000-000000000306', '2024-05-25', 'Electricity bill', 64.32, 'expense', '00000000-0000-0000-0000-000000000204',
     'Utility payment', 'manual'),
    ('00000000-0000-0000-0000-000000000307', '2024-05-24', 'Lunch meeting', 18.60, 'expense', '00000000-0000-0000-0000-000000000202',
     'Client lunch', 'manual'),
    ('00000000-0000-0000-0000-000000000308', '2024-05-23', 'Ride share - airport drop', 32.15, 'expense', '00000000-0000-0000-0000-000000000203',
     'Travel expense', 'manual');

commit;
