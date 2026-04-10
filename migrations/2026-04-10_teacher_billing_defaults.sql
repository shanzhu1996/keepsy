-- Add default billing cycle fields to teacher_profiles.
-- These pre-fill when creating new students.
-- Apply via Supabase SQL editor or `psql`.

alter table teacher_profiles
  add column if not exists default_cycle_lessons integer default 4,
  add column if not exists default_cycle_price numeric(10,2);
