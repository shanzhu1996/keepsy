-- SMS consent tracking for Twilio Toll-Free Verification (TFV) compliance.
--
-- Teachers obtain verbal consent from their students (or students'
-- parents/guardians) before adding a phone number that will receive SMS
-- through Keepsy. The teacher records this consent by checking a
-- confirmation box when adding/editing the student.
--
-- sms_consent_given_at  — timestamp when the teacher confirmed consent
-- sms_consent_given_by  — the teacher's user_id who captured consent
--
-- Apply via Supabase SQL editor or `psql`.

alter table students
  add column if not exists sms_consent_given_at timestamptz,
  add column if not exists sms_consent_given_by uuid references auth.users(id);
