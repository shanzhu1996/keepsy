# Keepsy Deployment Guide

## Prerequisites

### Environment Variables
Copy `.env.example` to `.env.local` and fill in all values:
- **Supabase**: URL, anon key, service role key
- **OpenAI**: API key (for lesson note generation)
- **Twilio**: SID, auth token, phone number (for SMS — optional)
- **Resend**: API key, from email (for email — optional, needs domain verification)
- **CRON_SECRET**: Random string for securing the daily reminder endpoint

### Supabase Setup
1. Database migrations applied (check via Supabase dashboard → SQL Editor)
2. RLS policies enabled on all tables
3. Google OAuth provider configured (Authentication → Providers → Google)
4. Email templates customized (optional but recommended)

### Domain (optional, recommended before public launch)
1. Buy a domain (e.g. keepsy.app)
2. Add to Vercel: Settings → Domains
3. Configure custom Supabase domain (requires Pro plan)
4. Update Google OAuth redirect URI to new domain
5. Update Resend from-email domain

---

## Deploy to Vercel

### First Deploy
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Or connect GitHub repo:
1. Push to GitHub
2. Go to vercel.com → New Project → Import from GitHub
3. Vercel auto-detects Next.js, sets build settings
4. Add environment variables in Vercel dashboard
5. Deploy

### Subsequent Deploys
```bash
# Option A: Git push (if GitHub connected)
git push origin main
# Vercel auto-deploys on push

# Option B: Manual
vercel --prod
```

### Environment Variables in Vercel
Go to: Vercel Dashboard → Project → Settings → Environment Variables
Add all keys from `.env.example`

---

## Feature Release Process

### For code changes:
1. Create feature branch: `git checkout -b feature/my-feature`
2. Build locally: `npm run build` (catch errors)
3. Push branch: `git push -u origin feature/my-feature`
4. Vercel creates preview URL automatically
5. Test on preview URL using the test plan
6. Merge to main: `git checkout main && git merge feature/my-feature`
7. Push: `git push origin main` → Vercel auto-deploys
8. Verify production after deploy

### For database changes:
1. Write migration SQL
2. Test on Supabase branch (if available) or staging
3. Apply via: `supabase migration apply` or MCP `apply_migration`
4. Deploy code that uses new schema
5. Never deploy code before migration

### Rollback:
- Vercel: Dashboard → Deployments → click previous deployment → "Promote to Production"
- Database: Write a reverse migration, test, apply

---

## Monitoring (post-launch)

### Check daily:
- Vercel deployment status (auto-notifications)
- Supabase dashboard → Logs (API errors, auth errors)
- Email bounce rate (Resend dashboard)

### Check weekly:
- Supabase → Advisors (security + performance)
- OpenAI usage (billing dashboard)
- Twilio usage (message logs)

---

## Pre-Launch Checklist

- [ ] All 54 test cases passing
- [ ] Environment variables set in Vercel
- [ ] CRON_SECRET configured
- [ ] Custom domain configured (optional)
- [ ] Google OAuth redirect URI updated for production URL
- [ ] Resend domain verified (for email sending)
- [ ] Favicon visible in browser tab
- [ ] robots.txt accessible at /robots.txt
- [ ] No console errors on any page
- [ ] Mobile tested on real iPhone

---

Last updated: 2026-04-12
