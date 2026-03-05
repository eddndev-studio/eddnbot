import { Link } from "@tanstack/react-router";

export function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-neutral-950 px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <Link
          to="/"
          className="mb-8 inline-block text-sm text-neutral-400 transition-colors hover:text-neutral-100"
        >
          &larr; Back to eddnbot
        </Link>

        <article className="space-y-10">
          <header>
            <h1 className="text-3xl font-bold tracking-tight text-neutral-100">
              Privacy Policy
            </h1>
            <p className="mt-2 text-sm text-neutral-400">
              Last updated: March 2026
            </p>
          </header>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-neutral-100">
              1. Introduction
            </h2>
            <p className="leading-relaxed text-neutral-300">
              eddnbot is a WhatsApp automation platform powered by artificial
              intelligence, operated by eddndev ("we", "us", "our"). This
              Privacy Policy explains how we collect, use, store and protect
              your personal data when you use our service. We are committed to
              safeguarding your privacy in accordance with the General Data
              Protection Regulation (GDPR) and other applicable data protection
              laws.
            </p>
            <p className="leading-relaxed text-neutral-300">
              By using eddnbot you acknowledge that you have read and understood
              this Privacy Policy. If you do not agree with any part of it,
              please discontinue use of the service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-neutral-100">
              2. Data We Collect
            </h2>
            <p className="leading-relaxed text-neutral-300">
              We collect and process the following categories of data in order
              to provide and improve our service:
            </p>
            <ul className="list-disc space-y-2 pl-6 text-neutral-300">
              <li>
                <span className="font-medium text-neutral-100">
                  WhatsApp messages
                </span>{" "}
                — incoming and outgoing message content processed through the
                WhatsApp Cloud API on behalf of your account.
              </li>
              <li>
                <span className="font-medium text-neutral-100">
                  Phone numbers
                </span>{" "}
                — sender and recipient phone numbers associated with WhatsApp
                conversations.
              </li>
              <li>
                <span className="font-medium text-neutral-100">
                  AI conversation data
                </span>{" "}
                — prompts, responses and conversation context generated during
                AI-powered interactions.
              </li>
              <li>
                <span className="font-medium text-neutral-100">
                  Usage metrics
                </span>{" "}
                — API request counts, AI token consumption, WhatsApp message
                volumes and rate-limiting data used for billing and quota
                enforcement.
              </li>
              <li>
                <span className="font-medium text-neutral-100">
                  Authentication credentials
                </span>{" "}
                — hashed API keys used to authenticate access to the platform.
              </li>
              <li>
                <span className="font-medium text-neutral-100">
                  Account information
                </span>{" "}
                — tenant name, contact email and configuration settings.
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-neutral-100">
              3. How We Use Your Data
            </h2>
            <p className="leading-relaxed text-neutral-300">
              We process your data strictly for the following purposes:
            </p>
            <ul className="list-disc space-y-2 pl-6 text-neutral-300">
              <li>
                Providing the WhatsApp automation service, including sending and
                receiving messages on your behalf.
              </li>
              <li>
                Processing messages through AI providers to generate automated
                responses according to your configuration.
              </li>
              <li>
                Tracking usage to enforce quotas, manage rate limits and
                generate usage reports for your account.
              </li>
              <li>
                Maintaining and improving the security, reliability and
                performance of the platform.
              </li>
              <li>
                Communicating with you regarding your account, service updates
                or support requests.
              </li>
            </ul>
            <p className="leading-relaxed text-neutral-300">
              We do not sell, rent or share your personal data with third
              parties for marketing purposes.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-neutral-100">
              4. Third-Party Services
            </h2>
            <p className="leading-relaxed text-neutral-300">
              To deliver our service, we integrate with the following
              third-party providers. Data shared with these services is limited
              to what is necessary for the specific functionality they provide:
            </p>
            <ul className="list-disc space-y-2 pl-6 text-neutral-300">
              <li>
                <span className="font-medium text-neutral-100">
                  Meta / WhatsApp Cloud API
                </span>{" "}
                — message delivery and reception. Subject to{" "}
                <a
                  href="https://www.whatsapp.com/legal/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neutral-100 underline underline-offset-2 transition-colors hover:text-white"
                >
                  WhatsApp's Privacy Policy
                </a>
                .
              </li>
              <li>
                <span className="font-medium text-neutral-100">OpenAI</span> —
                AI text generation and Whisper audio transcription. Subject to{" "}
                <a
                  href="https://openai.com/policies/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neutral-100 underline underline-offset-2 transition-colors hover:text-white"
                >
                  OpenAI's Privacy Policy
                </a>
                .
              </li>
              <li>
                <span className="font-medium text-neutral-100">Anthropic</span>{" "}
                — AI text generation via Claude models. Subject to{" "}
                <a
                  href="https://www.anthropic.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neutral-100 underline underline-offset-2 transition-colors hover:text-white"
                >
                  Anthropic's Privacy Policy
                </a>
                .
              </li>
              <li>
                <span className="font-medium text-neutral-100">
                  Google Gemini
                </span>{" "}
                — AI text generation. Subject to{" "}
                <a
                  href="https://policies.google.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neutral-100 underline underline-offset-2 transition-colors hover:text-white"
                >
                  Google's Privacy Policy
                </a>
                .
              </li>
            </ul>
            <p className="leading-relaxed text-neutral-300">
              The specific AI provider used for your account depends on your
              configuration. Message content and conversation context are sent
              to the configured provider solely for the purpose of generating
              responses.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-neutral-100">
              5. Multi-Tenant Data Isolation
            </h2>
            <p className="leading-relaxed text-neutral-300">
              eddnbot operates as a multi-tenant platform. Each tenant's data is
              logically isolated at the database level. This means:
            </p>
            <ul className="list-disc space-y-2 pl-6 text-neutral-300">
              <li>
                Your messages, conversations, AI configurations and usage data
                are accessible only to your authenticated account.
              </li>
              <li>
                No tenant can access, view or modify another tenant's data.
              </li>
              <li>
                API keys are scoped to individual tenants and cannot be used to
                access data belonging to other accounts.
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-neutral-100">
              6. Data Retention and Deletion
            </h2>
            <p className="leading-relaxed text-neutral-300">
              We retain your data for as long as your account is active and as
              necessary to provide the service. Specifically:
            </p>
            <ul className="list-disc space-y-2 pl-6 text-neutral-300">
              <li>
                Message content and conversation data are retained for the
                duration of your active subscription.
              </li>
              <li>
                Usage metrics are retained on a monthly rolling basis for
                billing and reporting purposes.
              </li>
              <li>
                Upon account termination, all associated data — including
                messages, AI configurations, usage records and API keys — will
                be permanently deleted within 30 days.
              </li>
            </ul>
            <p className="leading-relaxed text-neutral-300">
              You may request deletion of your data at any time by contacting us
              at{" "}
              <a
                href="mailto:contacto@eddndev.com"
                className="text-neutral-100 underline underline-offset-2 transition-colors hover:text-white"
              >
                contacto@eddndev.com
              </a>
              . We will process deletion requests within 30 days.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-neutral-100">
              7. Your Rights
            </h2>
            <p className="leading-relaxed text-neutral-300">
              Under the GDPR and applicable data protection laws, you have the
              following rights:
            </p>
            <ul className="list-disc space-y-2 pl-6 text-neutral-300">
              <li>
                <span className="font-medium text-neutral-100">
                  Right of access
                </span>{" "}
                — request a copy of the personal data we hold about you.
              </li>
              <li>
                <span className="font-medium text-neutral-100">
                  Right to rectification
                </span>{" "}
                — request correction of inaccurate or incomplete data.
              </li>
              <li>
                <span className="font-medium text-neutral-100">
                  Right to erasure
                </span>{" "}
                — request deletion of your personal data.
              </li>
              <li>
                <span className="font-medium text-neutral-100">
                  Right to restrict processing
                </span>{" "}
                — request that we limit how we use your data.
              </li>
              <li>
                <span className="font-medium text-neutral-100">
                  Right to data portability
                </span>{" "}
                — request your data in a structured, machine-readable format.
              </li>
              <li>
                <span className="font-medium text-neutral-100">
                  Right to object
                </span>{" "}
                — object to the processing of your data in certain
                circumstances.
              </li>
            </ul>
            <p className="leading-relaxed text-neutral-300">
              To exercise any of these rights, please contact us at{" "}
              <a
                href="mailto:contacto@eddndev.com"
                className="text-neutral-100 underline underline-offset-2 transition-colors hover:text-white"
              >
                contacto@eddndev.com
              </a>
              .
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-neutral-100">
              8. Security
            </h2>
            <p className="leading-relaxed text-neutral-300">
              We implement appropriate technical and organizational measures to
              protect your data, including:
            </p>
            <ul className="list-disc space-y-2 pl-6 text-neutral-300">
              <li>
                API keys are stored as SHA-256 hashes; plaintext keys are never
                persisted.
              </li>
              <li>
                All data in transit is encrypted via TLS.
              </li>
              <li>
                Database access is restricted and audited.
              </li>
              <li>
                Rate limiting and quota enforcement protect against abuse.
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-neutral-100">
              9. Changes to This Policy
            </h2>
            <p className="leading-relaxed text-neutral-300">
              We may update this Privacy Policy from time to time. When we make
              material changes, we will notify you through the platform or via
              email. The "Last updated" date at the top of this page indicates
              when the policy was last revised.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-neutral-100">
              10. Contact
            </h2>
            <p className="leading-relaxed text-neutral-300">
              If you have any questions or concerns about this Privacy Policy or
              our data practices, please contact us:
            </p>
            <ul className="list-none space-y-1 pl-0 text-neutral-300">
              <li>
                <span className="text-neutral-400">Operator:</span>{" "}
                <span className="text-neutral-100">eddndev</span>
              </li>
              <li>
                <span className="text-neutral-400">Email:</span>{" "}
                <a
                  href="mailto:contacto@eddndev.com"
                  className="text-neutral-100 underline underline-offset-2 transition-colors hover:text-white"
                >
                  contacto@eddndev.com
                </a>
              </li>
              <li>
                <span className="text-neutral-400">Website:</span>{" "}
                <a
                  href="https://eddn.dev"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neutral-100 underline underline-offset-2 transition-colors hover:text-white"
                >
                  eddn.dev
                </a>
              </li>
            </ul>
          </section>
        </article>

        <footer className="mt-12 border-t border-neutral-800 pt-6 text-center text-xs text-neutral-500">
          &copy; 2026 eddndev. All rights reserved.
        </footer>
      </div>
    </div>
  );
}
