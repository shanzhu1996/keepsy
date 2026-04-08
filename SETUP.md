# Keepsy — Setup Guide

## Step 1: Install Dependencies

Open your terminal, navigate to this folder, and run:

```bash
npm install
```

---

## Step 2: Set Up Supabase

Supabase is your database + auth backend. It's free to start.

1. Go to **[supabase.com](https://supabase.com)** and create a free account
2. Click **"New Project"** — give it a name like `keepsy`, set a password, pick a region close to you
3. Wait ~1 minute for it to provision

### Get your API keys:
- Go to **Settings → API** in your Supabase project
- Copy these three values into `.env.local`:
  - `NEXT_PUBLIC_SUPABASE_URL` → "Project URL"
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → "anon / public" key
  - `SUPABASE_SERVICE_ROLE_KEY` → "service_role / secret" key *(keep this private)*

### Run the database schema:
- In Supabase, go to **SQL Editor → New Query**
- Paste and run the SQL below:

```sql
-- Enable UUID generation
create extension if not exists "uuid-ossp";

create table students (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  contact_method text not null default 'email' check (contact_method in ('email', 'phone', 'sms')),
  lesson_default_duration_min integer,
  billing_enabled boolean not null default true,
  auto_remind boolean not null default true,
  billing_cycle_lessons integer,
  cycle_price numeric(10,2),
  lessons_since_last_payment integer not null default 0,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);

create table lessons (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  scheduled_at timestamptz not null,
  duration_min integer,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled')),
  cancelled_counts_as_completed boolean not null default false,
  raw_note text,
  internal_summary text,
  student_summary text,
  recurrence_rule text,
  recurrence_group_id uuid,
  completed_at timestamptz,
  reminder_sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table payments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  amount numeric(10,2) not null,
  status text not null default 'pending' check (status in ('pending', 'paid')),
  lesson_count_covered integer not null,
  due_triggered_at timestamptz not null default now(),
  paid_at timestamptz,
  message_draft text,
  created_at timestamptz not null default now()
);

create table note_templates (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  sections jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table message_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  lesson_id uuid references lessons(id) on delete set null,
  payment_id uuid references payments(id) on delete set null,
  type text not null,
  content text not null,
  sent boolean not null default false,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

-- Indexes
create index idx_students_user_id on students(user_id);
create index idx_lessons_user_id on lessons(user_id);
create index idx_lessons_student_id on lessons(student_id);
create index idx_lessons_scheduled_at on lessons(scheduled_at);
create index idx_lessons_recurrence_group on lessons(recurrence_group_id);
create index idx_payments_user_id on payments(user_id);
create index idx_payments_student_id on payments(student_id);
create index idx_message_logs_user_id on message_logs(user_id);

-- Row Level Security
alter table students enable row level security;
alter table lessons enable row level security;
alter table payments enable row level security;
alter table message_logs enable row level security;
alter table note_templates enable row level security;

create policy "Users can view own note_templates" on note_templates for select using (auth.uid() = user_id);
create policy "Users can insert own note_templates" on note_templates for insert with check (auth.uid() = user_id);
create policy "Users can update own note_templates" on note_templates for update using (auth.uid() = user_id);
create policy "Users can delete own note_templates" on note_templates for delete using (auth.uid() = user_id);

create index idx_note_templates_user_id on note_templates(user_id);

create policy "Users can view own students" on students for select using (auth.uid() = user_id);
create policy "Users can insert own students" on students for insert with check (auth.uid() = user_id);
create policy "Users can update own students" on students for update using (auth.uid() = user_id);
create policy "Users can delete own students" on students for delete using (auth.uid() = user_id);

create policy "Users can view own lessons" on lessons for select using (auth.uid() = user_id);
create policy "Users can insert own lessons" on lessons for insert with check (auth.uid() = user_id);
create policy "Users can update own lessons" on lessons for update using (auth.uid() = user_id);
create policy "Users can delete own lessons" on lessons for delete using (auth.uid() = user_id);

create policy "Users can view own payments" on payments for select using (auth.uid() = user_id);
create policy "Users can insert own payments" on payments for insert with check (auth.uid() = user_id);
create policy "Users can update own payments" on payments for update using (auth.uid() = user_id);
create policy "Users can delete own payments" on payments for delete using (auth.uid() = user_id);

create policy "Users can view own message_logs" on message_logs for select using (auth.uid() = user_id);
create policy "Users can insert own message_logs" on message_logs for insert with check (auth.uid() = user_id);
create policy "Users can update own message_logs" on message_logs for update using (auth.uid() = user_id);
create policy "Users can delete own message_logs" on message_logs for delete using (auth.uid() = user_id);
```

### Enable Email Auth:
- Go to **Authentication → Providers** in Supabase
- Make sure **Email** is enabled (it's on by default)

---

## Step 3: Set Up OpenAI (for AI lesson summaries)

1. Go to **[platform.openai.com](https://platform.openai.com)**
2. Sign up / log in → go to **API Keys**
3. Click **"Create new secret key"** — copy it
4. Add it to `.env.local`:
   ```
   OPENAI_API_KEY=sk-...
   ```

> ⚠️ You'll need to add a small amount of credit ($5) to your OpenAI account to use the API.

---

## Step 4: Set Up Twilio (for SMS reminders — optional)

You can skip this initially and add it later. The app will still work without SMS.

1. Go to **[console.twilio.com](https://console.twilio.com)** and create a free account
2. From the Console Dashboard, copy:
   - **Account SID**
   - **Auth Token**
3. Go to **Phone Numbers → Get a number** — get a free trial number
4. Add all three to `.env.local`:
   ```
   TWILIO_ACCOUNT_SID=AC...
   TWILIO_AUTH_TOKEN=...
   TWILIO_PHONE_NUMBER=+1...
   ```

> 💡 With a Twilio trial account, you can only send SMS to verified phone numbers. Upgrade to a paid account to send to any number.

---

## Step 5: Fill in .env.local

Open `.env.local` and replace all placeholder values with your real credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
OPENAI_API_KEY=sk-...
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...
```

---

## Step 6: Run the App

```bash
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** — you'll be redirected to the login page. Sign up with your email and start using Keepsy!

---

## Deploying to Production (optional)

The easiest way is **[Vercel](https://vercel.com)**:

1. Push your code to a GitHub repo
2. Import the repo on Vercel
3. Add all your `.env.local` variables in **Settings → Environment Variables**
4. Deploy — Vercel will also pick up the `vercel.json` cron job for daily SMS reminders

---

## Verification Checklist

After running locally, test these flows:

- [ ] Sign up / log in works
- [ ] Create a student WITH billing (cycle=4, price=$100)
- [ ] Create a student WITHOUT billing
- [ ] Create a recurring weekly lesson
- [ ] Complete 4 lessons → pending payment auto-created
- [ ] Cancel a lesson with "charge=yes" → counts toward billing
- [ ] Cancel a lesson with "charge=no" → no billing impact
- [ ] Enter a raw note → generate AI summary → both outputs appear
- [ ] Mark payment as paid → counter resets to 0
- [ ] Monthly income shows the paid amount
