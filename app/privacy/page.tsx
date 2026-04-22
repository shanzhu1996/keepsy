import { LegalPage } from "@/components/public-shell";

export const metadata = {
  title: "Privacy Policy — Keepsy",
  description: "How Keepsy collects, uses, and protects personal information.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="April 21, 2026">
      <p>
        Keepsy (&ldquo;Keepsy&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) is a
        software service that helps private lesson teachers create and send
        lesson reports to their students and students&apos; families. This
        Privacy Policy explains what information we collect, how we use it,
        and the choices you have.
      </p>
      <p>
        By using Keepsy you agree to the practices described below. If you do
        not agree, please do not use the service.
      </p>

      <h2>1. Information we collect</h2>

      <h3>From teachers (account holders)</h3>
      <ul>
        <li>Name and email address, provided at sign-up or via Google sign-in.</li>
        <li>Account authentication data (hashed password or OAuth token).</li>
        <li>Teaching-related data you enter, including student records, lesson notes, schedules, and payment records.</li>
        <li>Usage data such as pages visited and features used, for product reliability.</li>
      </ul>

      <h3>From students and their families (entered by teachers)</h3>
      <ul>
        <li>Student name and, optionally, the phone number or email address of the student or their parent/guardian.</li>
        <li>Lesson history and notes written or generated on the student&apos;s behalf.</li>
      </ul>
      <p>
        Teachers are responsible for obtaining permission from their students
        (or parents/guardians of minor students) before adding their contact
        information to Keepsy. See our{" "}
        <a href="/sms-policy">SMS Policy</a> for how SMS consent is handled.
      </p>

      <h2>2. How we use information</h2>
      <ul>
        <li>To provide the core service: generating lesson reports, sending them via SMS or email, and tracking student payments.</li>
        <li>To authenticate users and keep accounts secure.</li>
        <li>To improve the product, diagnose issues, and prevent abuse.</li>
        <li>To communicate with account holders about their account (e.g. password resets, service notices).</li>
      </ul>

      <h2>3. How we share information</h2>
      <p>
        <strong>
          We do not sell, rent, or share phone numbers or any other personal
          information with third parties for their marketing purposes. Phone
          numbers collected for SMS are used solely to deliver the messages
          the teacher sends through Keepsy.
        </strong>
      </p>
      <p>
        We share information only with service providers who help us run
        Keepsy, under contractual confidentiality obligations:
      </p>
      <ul>
        <li><strong>Supabase</strong> — database and authentication hosting.</li>
        <li><strong>Vercel</strong> — web application hosting.</li>
        <li><strong>OpenAI</strong> — AI-assisted structuring of lesson notes. Inputs and outputs are not used to train public models.</li>
        <li><strong>Twilio</strong> — delivery of SMS messages you choose to send.</li>
        <li><strong>Resend</strong> — delivery of email you choose to send.</li>
        <li><strong>Google</strong> — optional single sign-on for teachers.</li>
      </ul>
      <p>
        We may disclose information if required by law, to protect the safety
        or rights of users, or as part of a business transfer, in which case
        we will take reasonable steps to ensure this policy continues to apply.
      </p>

      <h2>4. SMS data</h2>
      <p>
        Phone numbers provided for SMS delivery and the content of messages
        sent through Keepsy are used only to deliver those messages and to
        honor opt-out requests. Opt-out data (e.g. a recipient replying STOP)
        is stored so we can comply with the recipient&apos;s request. Phone
        numbers are never sold or shared for unrelated purposes. See our{" "}
        <a href="/sms-policy">SMS Policy</a> for details.
      </p>

      <h2>5. Data retention</h2>
      <p>
        We retain teacher accounts and their associated data while the account
        is active. When an account is deleted, we remove or anonymize personal
        data within a reasonable period, except where retention is required by
        law (for example, billing records).
      </p>

      <h2>6. Security</h2>
      <p>
        We use industry-standard measures including encrypted connections
        (HTTPS/TLS), encrypted data storage at our hosting providers, and
        access controls. No system is perfectly secure; we cannot guarantee
        absolute security.
      </p>

      <h2>7. Children&apos;s privacy</h2>
      <p>
        Keepsy is intended for use by adult lesson teachers. Students of
        teachers who use Keepsy may be minors. We do not knowingly collect
        personal information directly from children under 13. Teachers who
        enter information about a minor student represent that they have
        obtained consent from the student&apos;s parent or guardian.
      </p>

      <h2>8. Your choices</h2>
      <ul>
        <li>You may access, correct, or delete your account information from within the app, or by contacting us.</li>
        <li>Students and their families who receive SMS messages may reply STOP at any time to stop receiving messages, or HELP for assistance.</li>
      </ul>

      <h2>9. International users</h2>
      <p>
        Keepsy is operated from the United States. By using the service you
        consent to the transfer and processing of your information in the
        United States and in the countries where our service providers operate.
      </p>

      <h2>10. Changes to this policy</h2>
      <p>
        We may update this Privacy Policy from time to time. When we do, we
        will change the &ldquo;Last updated&rdquo; date above. Material changes
        will be communicated to account holders by email or in-app notice.
      </p>

      <h2>11. Contact</h2>
      <p>
        Questions or requests about this Privacy Policy?{" "}
        <a href="mailto:shanzhu1996@gmail.com">shanzhu1996@gmail.com</a>
      </p>
    </LegalPage>
  );
}
