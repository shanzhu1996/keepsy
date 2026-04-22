-- Track when Keepsy first sent an SMS to each student, so we can append a
-- one-time welcome/opt-out footer (Reply STOP, Reply HELP, msg & data rates
-- may apply) to that first message per Twilio TFV / CTIA requirements.
--
-- Apply via Supabase SQL editor or `psql`.

alter table students
  add column if not exists first_sms_sent_at timestamptz;
