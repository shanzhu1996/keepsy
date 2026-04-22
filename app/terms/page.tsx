import { LegalPage } from "@/components/public-shell";

export const metadata = {
  title: "Terms of Service — Keepsy",
  description: "Terms governing the use of Keepsy by private lesson teachers.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="April 21, 2026">
      <p>
        These Terms of Service (&ldquo;Terms&rdquo;) govern your use of Keepsy
        (&ldquo;Keepsy&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;). By creating
        an account or otherwise using the service, you agree to these Terms.
        If you do not agree, do not use Keepsy.
      </p>

      <h2>1. The service</h2>
      <p>
        Keepsy is a software tool that helps private lesson teachers record,
        organize, and send lesson reports, manage student records, and track
        payments. The service may evolve over time; we may add, change, or
        remove features.
      </p>

      <h2>2. Eligibility and accounts</h2>
      <ul>
        <li>You must be at least 18 years old to create a Keepsy account.</li>
        <li>You are responsible for the accuracy of the information in your account and for keeping your password secure.</li>
        <li>You are responsible for all activity that happens under your account.</li>
        <li>Notify us promptly at <a href="mailto:shanzhu1996@gmail.com">shanzhu1996@gmail.com</a> if you believe your account has been accessed without your permission.</li>
      </ul>

      <h2>3. Your responsibilities as a teacher</h2>
      <p>
        Keepsy is a tool you use with your own students. You are responsible for:
      </p>
      <ul>
        <li>Obtaining permission from your students (or, where the student is a minor, the parent or guardian) before adding their contact information to Keepsy.</li>
        <li>Obtaining clear verbal or written consent before sending SMS messages to a phone number. See our <a href="/sms-policy">SMS Policy</a>.</li>
        <li>Complying with applicable laws, including data-protection, telemarketing, and anti-spam laws such as the TCPA and CAN-SPAM Act.</li>
        <li>Honoring opt-out requests. When a recipient asks to stop receiving messages, stop sending.</li>
        <li>The content of messages, reports, and notes you create and send through Keepsy.</li>
      </ul>

      <h2>4. Acceptable use</h2>
      <p>You agree not to use Keepsy to:</p>
      <ul>
        <li>Send spam, marketing messages to recipients who have not consented, or any content that violates law.</li>
        <li>Harass, threaten, or harm others.</li>
        <li>Upload malware or attempt to disrupt the service or its security.</li>
        <li>Access the service using automated means except through features we expressly provide.</li>
        <li>Resell or white-label the service without our written permission.</li>
      </ul>

      <h2>5. AI-generated content</h2>
      <p>
        Keepsy uses AI to help structure the notes and reports you produce.
        AI output can be inaccurate; you are responsible for reviewing reports
        before sending them to a student or family. Keepsy does not claim
        ownership of the notes and reports you create.
      </p>

      <h2>6. Fees</h2>
      <p>
        Some features of Keepsy may be paid. Pricing, billing terms, and trial
        details will be shown before you are charged. You authorize us to
        charge your chosen payment method for the fees due.
      </p>

      <h2>7. Termination</h2>
      <p>
        You may stop using Keepsy and delete your account at any time. We may
        suspend or terminate your access if you violate these Terms, if
        required by law, or if continuing to provide the service becomes
        impractical. On termination, your right to use the service ends
        immediately.
      </p>

      <h2>8. Disclaimer of warranties</h2>
      <p>
        Keepsy is provided &ldquo;as is&rdquo; and &ldquo;as available.&rdquo;
        We disclaim all warranties to the fullest extent allowed by law,
        including warranties of merchantability, fitness for a particular
        purpose, and non-infringement. We do not warrant that the service
        will be uninterrupted, error-free, or that AI-generated content will
        be accurate.
      </p>

      <h2>9. Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, Keepsy will not be liable for
        any indirect, incidental, special, consequential, or punitive damages,
        or for any loss of data, profits, or goodwill. Our total liability to
        you for any claim arising from or relating to the service will not
        exceed the amounts you paid us for the service in the twelve months
        before the claim, or US $100, whichever is greater.
      </p>

      <h2>10. Indemnification</h2>
      <p>
        You agree to indemnify and hold Keepsy harmless from any claim or
        demand, including reasonable attorneys&apos; fees, arising from your
        use of the service, your content, or your violation of these Terms or
        applicable law &mdash; including any claim arising from messages you
        chose to send to a recipient.
      </p>

      <h2>11. Changes to these Terms</h2>
      <p>
        We may update these Terms from time to time. When we do, we will
        change the &ldquo;Last updated&rdquo; date above. If the change is
        material, we will give account holders notice by email or in-app.
        Continued use of the service after a change means you accept the new
        Terms.
      </p>

      <h2>12. Governing law</h2>
      <p>
        These Terms are governed by the laws of the State of California,
        without regard to conflict-of-laws rules. Any dispute that is not
        required to be arbitrated will be brought in the state or federal
        courts located in California, and you consent to their jurisdiction.
      </p>

      <h2>13. Contact</h2>
      <p>
        Questions about these Terms?{" "}
        <a href="mailto:shanzhu1996@gmail.com">shanzhu1996@gmail.com</a>
      </p>
    </LegalPage>
  );
}
