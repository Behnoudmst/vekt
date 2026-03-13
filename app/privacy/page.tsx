import { COMPANY_NAME, PRIVACY_POLICY_VERSION } from "@/lib/brand";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: `Privacy Policy — ${COMPANY_NAME}`,
};

const PRIVACY_EMAIL = `privacy@${(COMPANY_NAME ?? "vekt").toLowerCase()}.io`;

export default function PrivacyPolicyPage() {
  return (
    <div className="flex min-h-[89vh] flex-col bg-background">
      <main className="flex-1">
        <div className="mx-auto max-w-2xl px-6 py-12">
          <h1 className="text-2xl font-bold mb-1">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground mb-8">
            Last updated: {PRIVACY_POLICY_VERSION} &nbsp;·&nbsp; Version{" "}
            {PRIVACY_POLICY_VERSION}
          </p>

          <section className="prose prose-sm dark:prose-invert max-w-none text-foreground space-y-8">

            <div>
              <h2 className="text-base font-semibold mb-2">1. Data Controller</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {COMPANY_NAME} is the data controller responsible for the personal data you submit
                through this recruitment platform. If you have any questions about how your data is
                handled, please contact us at{" "}
                <a href={`mailto:${PRIVACY_EMAIL}`} className="text-primary underline underline-offset-3">
                  {PRIVACY_EMAIL}
                </a>
                .
              </p>
            </div>

            <div>
              <h2 className="text-base font-semibold mb-2">2. Personal Data We Collect</h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                When you submit a job application, we collect the following personal data:
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>Full name</li>
                <li>Email address</li>
                <li>Resume / CV (PDF file)</li>
                <li>The job position you applied for</li>
                <li>Date and time of application</li>
                <li>Your consent record (timestamp and policy version)</li>
              </ul>
            </div>

            <div>
              <h2 className="text-base font-semibold mb-2">3. Purpose and Legal Basis</h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                We process your personal data for the following purposes:
              </p>
              <div className="space-y-3">
                <div className="rounded-md border p-3">
                  <p className="text-sm font-medium">Recruitment evaluation</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your application and resume are assessed to determine your suitability for the
                    position. <strong>Legal basis:</strong> Consent (Art. 6(1)(a) GDPR) and steps
                    prior to entering a contract (Art. 6(1)(b) GDPR).
                  </p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-sm font-medium">Internal record-keeping</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Maintaining records of applications and recruitment decisions.{" "}
                    <strong>Legal basis:</strong> Legitimate interest (Art. 6(1)(f) GDPR).
                  </p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-sm font-medium">Recruiter authentication</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    A session cookie is set when a recruiter logs in to maintain their authenticated
                    session. This cookie is strictly necessary for the platform to function and is
                    exempt from consent requirements under the ePrivacy Directive Art. 5(3).{" "}
                    <strong>Legal basis:</strong> Legitimate interest / necessary for contract
                    performance (Art. 6(1)(b) GDPR).
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-base font-semibold mb-2">4. Cookies</h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                This platform uses <strong>only strictly necessary cookies</strong>. No tracking,
                analytics, or advertising cookies are used.
              </p>
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">Cookie</th>
                      <th className="text-left px-3 py-2 font-medium">Purpose</th>
                      <th className="text-left px-3 py-2 font-medium">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr className="border-t">
                      <td className="px-3 py-2 font-mono">next-auth.session-token</td>
                      <td className="px-3 py-2">Maintains your authenticated recruiter session</td>
                      <td className="px-3 py-2">Session</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                Because these cookies are strictly necessary for the service to function, they do
                not require your consent under the ePrivacy Directive. You will see an informational
                notice on your first visit acknowledging their use.
              </p>
            </div>

            <div>
              <h2 className="text-base font-semibold mb-2">5. Data Retention</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Candidate application data is retained for a limited period from the date of
                submission, after which it is permanently deleted from our systems. The exact
                retention window is configured by the platform administrator (default: 90 days).
                If you are hired, data relevant to your employment will be subject to a separate
                data retention policy.
              </p>
            </div>

            <div>
              <h2 className="text-base font-semibold mb-2">6. Data Recipients</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your data is accessible only to authorised recruiters and hiring managers within{" "}
                {COMPANY_NAME}. We do not share, sell, or transfer your data to third parties.
                All data is stored on servers under our direct control.
              </p>
            </div>

            <div>
              <h2 className="text-base font-semibold mb-2">7. Your Rights</h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                Under the GDPR you have the following rights:
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li><strong>Access</strong> — request a copy of the personal data we hold about you</li>
                <li><strong>Rectification</strong> — ask us to correct inaccurate data</li>
                <li><strong>Erasure</strong> — request deletion of your data (&ldquo;right to be forgotten&rdquo;)</li>
                <li><strong>Restriction</strong> — ask us to limit how we use your data</li>
                <li><strong>Portability</strong> — receive your data in a machine-readable format</li>
                <li><strong>Object</strong> — object to processing based on legitimate interest</li>
                <li><strong>Withdraw consent</strong> — withdraw your application consent at any time without affecting prior processing</li>
              </ul>
              <p className="text-sm text-muted-foreground leading-relaxed mt-3">
                To exercise any of these rights, please contact us at{" "}
                <a href={`mailto:${PRIVACY_EMAIL}`} className="text-primary underline underline-offset-3">
                  {PRIVACY_EMAIL}
                </a>
                . We will respond within 30 days.
              </p>
            </div>

            <div>
              <h2 className="text-base font-semibold mb-2">8. Security</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                All data is transmitted over TLS (HTTPS). Access to candidate data is restricted to
                authenticated recruiters only. Resume files are stored securely on the server and
                are not publicly accessible without a direct link.
              </p>
            </div>

            <div>
              <h2 className="text-base font-semibold mb-2">9. Complaints</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                If you believe your data protection rights have been violated, you have the right to
                lodge a complaint with your national supervisory authority (e.g. the ICO in the UK,
                or the relevant DPA in your EU member state).
              </p>
            </div>

          </section>
        </div>
      </main>
    </div>
  );
}
