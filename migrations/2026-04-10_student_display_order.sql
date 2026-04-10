-- Add display_order column for manual student list ordering.
-- Apply via Supabase SQL editor or `psql`.

alter table students
  add column if not exists display_order integer default 0;

-- Backfill: assign order based on current alphabetical name sort.
with ranked as (
  select id, row_number() over (order by name asc) as rn
  from students
)
update students
set display_order = ranked.rn
from ranked
where students.id = ranked.id
  and students.display_order = 0;
