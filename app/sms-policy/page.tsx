import { LegalPage } from "@/components/public-shell";
import { getLoggedIn } from "@/lib/auth-helpers";

export const metadata = {
  title: "SMS Policy — Keepsy",
  description:
    "How Keepsy sends SMS messages on behalf of private lesson teachers, including opt-in, opt-out, and message frequency.",
};

export default async function SmsPolicyPage() {
  const loggedIn = await getLoggedIn();
  return (
    <LegalPage title="SMS Policy" updated="April 21, 2026" loggedIn={loggedIn}>
      <p>
        This SMS Policy describes how Keepsy sends text messages on behalf of
        private lesson teachers. It is meant to help teachers who use Keepsy,
        and the students and families who receive messages from them,
        understand what to expect.
      </p>

      <h2>1. Who sends the messages</h2>
      <p>
        Keepsy itself does not initiate messages. Keepsy is used by individual
        private lesson teachers (including music, language, academic tutoring,
        dance, yoga, art, and similar disciplines) to send lesson reports and
        related communication to their own students and the students&apos;
        families. Each message is sent because a teacher has actively chosen
        to send it to a recipient with whom they have an established teaching
        relationship.
      </p>

      <h2>2. Types of messages</h2>
      <p>Messages sent through Keepsy may include:</p>
      <ul>
        <li><strong>Lesson reports</strong> &mdash; a summary of what was covered in a lesson, what was assigned, and what to practice next.</li>
        <li><strong>Scheduling messages</strong> &mdash; reminders, rescheduling notices, and cancellation notices from the teacher.</li>
        <li><strong>Payment reminders</strong> &mdash; notices from the teacher about outstanding tuition, where teachers use that feature.</li>
      </ul>
      <p>
        Keepsy does not use these numbers for marketing or promotional
        messages from Keepsy itself.
      </p>

      <h2>3. Message frequency</h2>
      <p>
        Frequency depends entirely on how often the teacher holds lessons and
        chooses to send messages. A typical recipient can expect roughly
        <strong> 4&ndash;10 messages per month</strong>, though the exact
        number varies by teacher and student.
      </p>

      <h2>4. How consent is obtained (opt-in)</h2>
      <p>
        Before a teacher sends any SMS through Keepsy to a recipient, the
        teacher must obtain the recipient&apos;s consent. Keepsy supports
        <strong> verbal consent</strong>, which is the typical practice in a
        private teaching relationship.
      </p>

      <h3>The verbal consent script teachers use</h3>
      <p>Teachers ask their student (or the student&apos;s parent/guardian) in words substantially similar to:</p>
      <p style={{
        borderLeft: "3px solid var(--accent)",
        paddingLeft: "1rem",
        fontStyle: "italic",
      }}>
        &ldquo;I use a tool called Keepsy to send lesson notes and
        assignments after each lesson. With your permission, I&apos;ll send
        these as text messages to this number. You&apos;ll receive lesson
        recap texts and occasional scheduling or billing reminders, usually
        around 4 to 10 per month. Message and data rates may apply. You can
        reply STOP at any time to stop receiving messages, or reply HELP for
        assistance. Is it okay if I text lesson notes to this number?&rdquo;
      </p>

      <h3>How consent is recorded</h3>
      <ul>
        <li>When adding a student&apos;s phone number, the teacher must confirm in Keepsy that they have obtained consent from the student or the student&apos;s parent/guardian.</li>
        <li>Keepsy stores a timestamp and the teacher&apos;s account ID as proof of consent collection.</li>
        <li>The first SMS that Keepsy sends to any new recipient includes opt-out instructions (&ldquo;Reply STOP to opt out, HELP for help&rdquo;).</li>
      </ul>

      <h2>5. How to opt out (STOP)</h2>
      <p>
        Recipients can stop receiving messages at any time by replying{" "}
        <strong>STOP</strong> to any message sent through Keepsy. The STOP
        request is processed automatically by our telecom provider (Twilio)
        and is also recorded in Keepsy so the teacher cannot continue to
        message that number. Other recognized opt-out keywords include
        CANCEL, END, QUIT, UNSUBSCRIBE. Recipients will receive a final
        confirmation that they have been unsubscribed.
      </p>
      <p>
        Opted-out recipients can later opt back in by contacting their
        teacher, who will send them a new consent request before messages
        resume.
      </p>

      <h2>6. How to get help (HELP)</h2>
      <p>
        Reply <strong>HELP</strong> to any message to receive a reply with
        contact information. You can also contact us directly at{" "}
        <a href="mailto:shanzhu1996@gmail.com">shanzhu1996@gmail.com</a>.
      </p>

      <h2>7. Message and data rates</h2>
      <p>
        Message and data rates may apply, depending on the recipient&apos;s
        mobile carrier and plan. Keepsy does not charge recipients for
        messages, but your carrier may.
      </p>

      <h2>8. Carriers and delivery</h2>
      <p>
        Keepsy delivers SMS via Twilio, a licensed communications platform.
        Mobile carriers (including T-Mobile, AT&amp;T, and Verizon) are not
        liable for delayed or undelivered messages. Delivery is not guaranteed.
      </p>

      <h2>9. Privacy</h2>
      <p>
        Phone numbers collected for SMS delivery are used solely to deliver
        the messages the teacher sends through Keepsy and to honor opt-out
        requests. <strong>Keepsy does not sell, rent, or share phone numbers
        with third parties for marketing purposes.</strong> Full details are
        in our <a href="/privacy">Privacy Policy</a>.
      </p>

      <h2>10. Teacher obligations</h2>
      <p>
        Teachers who use Keepsy to send SMS must comply with applicable laws
        including the Telephone Consumer Protection Act (TCPA) and the rules
        set by mobile carriers and industry bodies (CTIA). Teachers must
        obtain genuine consent before messaging, honor opt-out requests, and
        keep message content relevant to the teaching relationship. See our
        {" "}<a href="/terms">Terms of Service</a> for the full set of
        responsibilities.
      </p>

      <h2>11. Contact</h2>
      <p>
        Questions about our SMS practices, or want to report a problem?{" "}
        <a href="mailto:shanzhu1996@gmail.com">shanzhu1996@gmail.com</a>
      </p>
    </LegalPage>
  );
}
