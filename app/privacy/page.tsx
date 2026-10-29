import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — Qvek',
  description:
    'How Qvek collects, uses, stores and deletes rider data for the Qvek electric scooter rental service.',
};

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? '';

/**
 * Store-facing privacy policy. Content is written to match the app's actual
 * data flows (verified in code): phone + OTP via Firebase, KYC docs in S3,
 * payments via Razorpay, push tokens via Expo, hosting on Render.
 * Entity name/address must be completed by the operator before publishing.
 */
export default function PrivacyPage() {
  const email = SUPPORT_EMAIL || 'the support address shown in the app';
  return (
    <main className="content" style={{ maxWidth: 760, margin: '8vh auto', padding: '0 20px' }}>
      <div className="card">
        <div className="card__head">
          <h2>Privacy Policy</h2>
          <p>Last updated: {new Date().toISOString().slice(0, 10)}</p>
        </div>
        <div className="card__body" style={{ display: 'grid', gap: 16, color: 'var(--text-2)' }}>
          <p>
            This policy explains how <b>Qvek</b> (&ldquo;we&rdquo;, &ldquo;us&rdquo;) handles personal
            data when you use the Qvek rider app and the Qvek electric scooter rental service. Qvek is
            operated in India and processes data under the Digital Personal Data Protection Act, 2023
            (DPDP Act).
          </p>

          <section>
            <h3>1. Data we collect</h3>
            <ul style={{ paddingLeft: 20, display: 'grid', gap: 6 }}>
              <li>
                <b>Account details:</b> name, mobile number, age and work platform. Your mobile number
                is your login identity.
              </li>
              <li>
                <b>Verification data:</b> the one-time password sent to your number. Verification is
                performed by Google Firebase; we never see or store the SMS code.
              </li>
              <li>
                <b>KYC data:</b> full name plus the last four digits of your Aadhaar, PAN and (where
                provided) driving licence, and any document images or PDFs you upload. Driving licence
                is optional.
              </li>
              <li>
                <b>Rental and payment records:</b> plans purchased, amounts, payment status and dates.
                Card and UPI credentials are handled by Razorpay; we do not store them.
              </li>
              <li>
                <b>Vehicle and service records:</b> assigned scooter, rental periods, service and repair
                logs, recovery actions.
              </li>
              <li>
                <b>Notification token:</b> a device push token so we can send service notifications.
              </li>
            </ul>
            <p style={{ marginTop: 8 }}>
              <b>We do not collect your device location.</b> The Qvek rider app does not request location
              permission. Scooter positions come from the tracker fitted to the vehicle, not from your
              phone.
            </p>
          </section>

          <section>
            <h3>2. How we use your data</h3>
            <ul style={{ paddingLeft: 20, display: 'grid', gap: 6 }}>
              <li>To create and verify your account and to sign you in.</li>
              <li>To provide the rental service: plans, scooters, deposits and renewals.</li>
              <li>To collect rent and security deposits and to keep financial records.</li>
              <li>To send service notifications (plan expiry, grace period, scooter status).</li>
              <li>To prevent fraud, misuse and recovery of vehicles, and to meet legal obligations.</li>
            </ul>
            <p style={{ marginTop: 8 }}>We do not sell your personal data and do not use it for advertising.</p>
          </section>

          <section>
            <h3>3. Who processes data for us</h3>
            <ul style={{ paddingLeft: 20, display: 'grid', gap: 6 }}>
              <li>
                <b>Google Firebase</b> — phone-number verification (OTP) and push notification delivery.
              </li>
              <li>
                <b>Razorpay</b> — UPI/card payment processing. Payment instrument details are handled by
                Razorpay under its own privacy terms.
              </li>
              <li>
                <b>Amazon Web Services (S3)</b> — private storage for KYC documents, accessed through
                short-lived signed links.
              </li>
              <li>
                <b>Expo</b> — delivery of push notifications to your device.
              </li>
              <li>
                <b>Render</b> — hosting of the Qvek backend where account and rental records are stored.
              </li>
            </ul>
            <p style={{ marginTop: 8 }}>
              These providers act on our instructions and are not permitted to use your data for their
              own purposes.
            </p>
          </section>

          <section>
            <h3>4. Security</h3>
            <p>
              All data is transmitted over encrypted HTTPS connections. Access tokens are stored in the
              device&rsquo;s secure storage. KYC documents sit in a private bucket and are reachable only
              through links that expire in minutes. KYC numbers are stored masked (last four digits only).
              Access to rider records by our staff is logged.
            </p>
          </section>

          <section>
            <h3>5. Retention</h3>
            <p>
              We keep account and rental records while you use the service. After an account deletion
              request, personal data is removed within <b>30 days</b>, except records we must retain:
              payment and invoice records under tax and accounting law, and records needed to resolve a
              pending dispute, recovery or legal obligation. Retained records are minimised and not used
              for marketing.
            </p>
          </section>

          <section>
            <h3>6. Your rights</h3>
            <ul style={{ paddingLeft: 20, display: 'grid', gap: 6 }}>
              <li>Access a copy of the personal data we hold about you.</li>
              <li>Correct inaccurate details (or ask us to correct them).</li>
              <li>Request deletion of your account and data.</li>
              <li>Withdraw consent for non-essential processing.</li>
              <li>Raise a complaint with us, and with the Data Protection Board of India.</li>
            </ul>
            <p style={{ marginTop: 8 }}>
              Start a deletion request at <a className="link" href="/delete-account">/delete-account</a> or
              email <b>{email}</b>. We respond within 3 working days.
            </p>
          </section>

          <section>
            <h3>7. Children</h3>
            <p>
              The service is for riders aged 18 and over. We do not knowingly collect data from anyone
              under 18. If we learn that we have, we delete it.
            </p>
          </section>

          <section>
            <h3>8. Changes</h3>
            <p>
              We may update this policy as the service changes. Material changes are notified in the app
              before they take effect.
            </p>
          </section>

          <section>
            <h3>9. Contact</h3>
            <p>
              Privacy questions and requests: <b>{email}</b>. Postal address and registered entity details
              are available on request.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
