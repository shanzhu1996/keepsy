# Keepsy End-to-End Test Plan

Run through these test cases before each deploy. Check off as you go.

## Auth (7 tests)
- [ ] Sign up with email/password + name → "Check your inbox" shown
- [ ] Confirm email → lands on /today, profile created with name
- [ ] Sign up with Google OAuth → lands on /today, name populated
- [ ] Log in with email/password → redirect to /today
- [ ] Log in with Google → redirect to /today
- [ ] Forgot password → enter email → "Check your inbox" shown
- [ ] Visit /today without auth → redirect to /login

## Students (6 tests)
- [ ] Create student (name only) → appears in list
- [ ] Create student with email + phone + billing → all fields saved
- [ ] Create student with both phone + email → contact method toggle visible
- [ ] Edit student name → updated in list + detail
- [ ] Set student inactive → disappears from active list
- [ ] Create student with invalid email → validation error shown

## Lessons (7 tests)
- [ ] Add single lesson → appears on Today + Calendar
- [ ] Add recurring lesson (weekly, 4 weeks) → 4 lessons created
- [ ] Complete lesson → status changes, billing counter increments
- [ ] Cancel lesson (don't charge) → cancelled, no billing impact
- [ ] Cancel lesson (charge) → cancelled, billing increments
- [ ] Cancel future recurring lessons → all future instances cancelled
- [ ] Edit lesson time → time updated on card and calendar

## Capture & Notes (7 tests)
- [ ] Type mode: enter text → tap "write the report" → note generated
- [ ] Voice mode: record → tap done → transcript captured, note generated
- [ ] Note generation does NOT auto-complete the lesson
- [ ] Edit generated note sections → auto-saves (check db)
- [ ] Send note via copy to clipboard → copied, marked as sent
- [ ] Send note via SMS (if Twilio configured) → sent + logged
- [ ] Empty transcript → shows error, doesn't crash

## Payments (10 tests)
- [ ] New student with billing → shows "new" badge + "collect before first lesson"
- [ ] After paid cycle ends → shows "due" card with amount
- [ ] Lessons happen without payment → shows "overdue" with unpaid count
- [ ] Mark paid → confirmation toast → card disappears
- [ ] Send reminder → action sheet with SMS/Email toggle
- [ ] Switch SMS ↔ Email → template text changes
- [ ] Edit reminder text → edits persist when sending
- [ ] Edit paid payment amount → amount updated
- [ ] Delete paid payment → confirmation dialog → removed
- [ ] Monthly income summary → shows correct totals, collapses/expands

## Settings (5 tests)
- [ ] First-time user → auto edit mode, name focused
- [ ] Save profile → view mode with saved data
- [ ] Timezone shown → auto-detected from browser
- [ ] Feedback link → opens mailto:hello@keepsy.app
- [ ] Sign out → redirect to /login

## Empty States (4 tests)
- [ ] Today with 0 students → "add your first student" CTA
- [ ] Today with students, 0 lessons today → "A quiet day."
- [ ] Payments with 0 everything → "payment tracking starts automatically"
- [ ] Add Lesson dialog with 0 students → "+ add your first student" link

## Edge Cases (5 tests)
- [ ] Double-click "Complete" on a lesson → only one billing increment
- [ ] Call /api/reminders/send without CRON_SECRET → 401 rejected
- [ ] OpenAI returns bad JSON → graceful error, no 500 crash
- [ ] Send note when Twilio not configured → note_status stays "draft"
- [ ] Student with no phone AND no email → reminder sheet shows "add contact" hint

## Mobile (3 tests)
- [ ] Login page at 375px → all fields visible, no horizontal scroll
- [ ] Payments page at 375px → cards readable, buttons tappable
- [ ] Capture page at 375px → voice/type toggle works, textarea usable

---

**Total: 54 test cases**

Last updated: 2026-04-12
