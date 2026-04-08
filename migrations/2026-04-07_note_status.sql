-- Voice-first lesson workflow: add note lifecycle columns.
-- Apply via Supabase SQL editor or `psql`.

alter table lessons
  add column if not exists note_status text
    check (note_status in ('not_started','draft','sent')),
  add column if not exists student_summary_sent_at timestamptz;

-- Backfill existing rows: anything with a raw_note becomes a draft,
-- anything without stays not_started.
update lessons
set note_status = case
  when raw_note is not null and length(trim(raw_note)) > 0 then 'draft'
  else 'not_started'
end
where note_status is null;
