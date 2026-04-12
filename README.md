# Keepsy

Lesson notes for private music teachers. Talk or type a few sentences after a lesson — Keepsy turns it into a structured report you can send to students.

## What it does

- **Voice or text capture** — record a quick brain dump after each lesson
- **AI-generated reports** — structured notes (what you covered, assignments, next steps) from a few casual sentences
- **Send to students** — SMS, email, copy to clipboard, or export as PDF
- **Student management** — contact info, lesson history, progress tracking
- **Scheduling** — today view, calendar, recurring lessons
- **Billing** — cycle-based payment tracking with reminders

## Tech stack

- **Framework**: Next.js 15 (App Router, React 19)
- **Database**: Supabase (Postgres + Auth)
- **AI**: OpenAI (gpt-4o-mini)
- **SMS**: Twilio
- **Email**: Resend
- **Styling**: Tailwind CSS + CSS custom properties
- **UI**: Radix primitives, custom components

## Getting started

```bash
npm install
cp .env.local.example .env.local  # fill in your keys
npm run dev
```

### Environment variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `OPENAI_API_KEY` | OpenAI API key |
| `TWILIO_ACCOUNT_SID` | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | Twilio sender phone number |
| `RESEND_API_KEY` | Resend email API key |
| `RESEND_FROM_EMAIL` | Resend sender email address |

## Project structure

```
app/
  (app)/              # authenticated routes
    today/            # daily lesson overview + calendar
    students/         # student list, detail, edit
    lessons/[id]/
      capture/        # voice/text note capture
      notes/          # view/edit existing notes
    payments/         # billing tracker
    settings/         # teacher profile + templates
  api/                # API routes (notes, lessons, notifications)
  lessons/[id]/report # printable lesson report (public)

components/           # UI components
lib/                  # utilities, Supabase clients, AI prompts
migrations/           # Supabase SQL migrations
```

## Design

Warm, calm aesthetic built for mobile. Fraunces serif display font, terracotta accent (`#A5522A`), parchment canvas (`#F4EDE0`). No blue, no corporate. Feels like a notebook, not a dashboard.
