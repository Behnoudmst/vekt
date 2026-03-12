import SiteFooter from "@/components/site-footer";
import { COMPANY_NAME } from "@/lib/brand";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: `Privacy Policy — ${COMPANY_NAME ?? "Spark-Hire"}`,
};

export default function PrivacyPolicyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex-1">
        <div className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="text-2xl font-bold mb-1">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Last updated: 12 March 2026 &nbsp;·&nbsp; Version 2026-03-12
        </p>

        <section className="prose prose-sm dark:prose-invert max-w-none text-foreground space-y-8">

          <div>
            <h2 className="text-base font-semibold mb-2">1. Data Controller</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {COMPANY_NAME} is the data controller responsible for the personal data you submit
              through this recruitment platform. If you have any questions about how your data is
              handled, please contact us at{" "}
              <a href={`mailto:privacy@spark-hire.io`} className="text-primary underline underline-offset-3">
                privacy@spark-hire.io
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
            </div>
          </div>

          <div>
            <h2 className="text-base font-semibold mb-2">4. Data Retention</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We retain your personal data for a maximum of{" "}
              <strong>12 months</strong> from the date of your application, or from the close of
              the recruitment process, whichever is later. After this period your data will be
              permanently deleted from our systems. If you are hired, data relevant to your
              employment will be subject to a separate data retention policy.
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold mb-2">5. Data Recipients</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your data is accessible only to authorised recruiters and hiring managers within{" "}
              {COMPANY_NAME}. We do not share, sell, or transfer your data to third parties.
              All data is stored on servers under our direct control.
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold mb-2">6. Your Rights</h2>
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
              <li><strong>Withdraw consent</strong> — withdraw your consent at any time without affecting prior processing</li>
            </ul>
            <p className="text-sm text-muted-foreground leading-relaxed mt-3">
              To exercise any of these rights, please contact us at{" "}
              <a href="mailto:privacy@spark-hire.io" className="text-primary underline underline-offset-3">
                privacy@spark-hire.io
              </a>
              . We will respond within 30 days.
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold mb-2">7. Security</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              All data is transmitted over TLS (HTTPS). Access to candidate data is restricted to
              authenticated recruiters only. Resume files are stored securely on the server and
              are not publicly accessible without a direct link.
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold mb-2">8. Complaints</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              If you believe your data protection rights have been violated, you have the right to
              lodge a complaint with your national supervisory authority (e.g. the ICO in the UK,
              or the relevant DPA in your EU member state).
            </p>
          </div>

        </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
