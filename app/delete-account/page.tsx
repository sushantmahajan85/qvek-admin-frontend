import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Delete your Qvek account — Qvek',
  description:
    'Request deletion of your Qvek rider account and associated personal data, and read what is deleted and what is retained.',
};

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? '';

export default function DeleteAccountPage() {
  return (
    <main className="content" style={{ maxWidth: 720, margin: '8vh auto', padding: '0 20px' }}>
      <div className="card">
        <div className="card__head">
          <h2>Delete your Qvek account</h2>
        </div>
        <div className="card__body" style={{ display: 'grid', gap: 18 }}>
          <p style={{ color: 'var(--text-2)' }}>
            This page lets riders of the Qvek scooter-rental app request deletion of their account and
            the personal data linked to it.
          </p>

          <section>
            <h3 style={{ marginBottom: 8 }}>How to request deletion</h3>
            <ol style={{ color: 'var(--text-2)', paddingLeft: 20, display: 'grid', gap: 6 }}>
              <li>Submit the request form below. It opens an email to our support address.</li>
              <li>We contact you on the registered mobile number to confirm the request came from you.</li>
              <li>We reply once your account and data have been deleted.</li>
            </ol>
          </section>

          <section>
            <h3 style={{ marginBottom: 8 }}>What is deleted</h3>
            <ul style={{ color: 'var(--text-2)', paddingLeft: 20, display: 'grid', gap: 6 }}>
              <li>Your profile: name, phone number, age, work platform and Customer ID.</li>
              <li>KYC records and uploaded documents (Aadhaar, PAN, driving licence).</li>
              <li>Push notification tokens and app session data.</li>
              <li>Rental, plan and GPS-linked records tied to your account.</li>
            </ul>
          </section>

          <section>
            <h3 style={{ marginBottom: 8 }}>What may be retained, and why</h3>
            <ul style={{ color: 'var(--text-2)', paddingLeft: 20, display: 'grid', gap: 6 }}>
              <li>
                <b>Payment and invoice records</b> are kept as required by Indian tax and accounting law,
                with personal identifiers minimised.
              </li>
              <li>
                <b>Security and recovery records</b> (e.g. vehicle immobilisation, recovery actions) may be
                kept where needed to resolve a pending dispute or legal obligation.
              </li>
              <li>Retained records are not used for marketing and are not sold.</li>
            </ul>
          </section>

          <section>
            <h3 style={{ marginBottom: 8 }}>Timeline</h3>
            <p style={{ color: 'var(--text-2)' }}>
              We acknowledge requests within <b>3 working days</b> and complete deletion within{' '}
              <b>30 days</b>. Anything we must retain for legal reasons is stored separately from your
              active account and is deleted when the retention period ends.
            </p>
          </section>

          <section>
            <h3 style={{ marginBottom: 8 }}>Request deletion</h3>
            {SUPPORT_EMAIL ? (
              <p style={{ color: 'var(--text-2)' }}>
                Email{' '}
                <a
                  className="link"
                  href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Qvek account deletion request')}&body=${encodeURIComponent(
                    'Please delete my Qvek rider account and associated personal data.\n\nRegistered mobile: +91 \nName (optional): \nCustomer ID (optional): ',
                  )}`}
                >
                  {SUPPORT_EMAIL}
                </a>{' '}
                with <b>“Qvek account deletion request”</b> in the subject, and include the mobile number
                registered with Qvek (plus your Customer ID if you have it). You can also call the support
                number shown in the app.
              </p>
            ) : (
              <p style={{ color: 'var(--text-2)' }}>
                Email or call the Qvek support contact shown in the rider app (Account → Contact Admin)
                with the subject <b>“Qvek account deletion request”</b>, and include the mobile number
                registered with Qvek.
              </p>
            )}
          </section>

          <p className="field__hint" style={{ marginTop: 4 }}>
            Deleting your account ends any active rental obligations. If you still hold a Qvek scooter,
            please return it to the hub first — otherwise the recovery process continues and dues may
            remain payable.
          </p>
        </div>
      </div>
    </main>
  );
}
