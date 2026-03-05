import { Link } from "@tanstack/react-router";

export function TermsOfService() {
  return (
    <div className="min-h-screen bg-neutral-950 px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <Link
          to="/"
          className="inline-block text-sm text-neutral-400 transition-colors hover:text-neutral-100"
        >
          &larr; Back to eddnbot
        </Link>

        <header className="mt-6 border-b border-neutral-800 pb-6">
          <h1 className="text-3xl font-bold text-neutral-100">
            Terms of Service
          </h1>
          <p className="mt-2 text-sm text-neutral-400">
            Effective date: March 1, 2026
          </p>
        </header>

        <article className="mt-8 space-y-10 text-neutral-300 leading-relaxed">
          {/* 1 */}
          <section>
            <h2 className="text-xl font-semibold text-neutral-100">
              1. Service Description
            </h2>
            <p className="mt-3">
              eddnbot is a multi-tenant Software-as-a-Service (SaaS) platform
              operated by eddndev that provides WhatsApp automation powered by
              artificial intelligence. The Service enables tenants to connect
              WhatsApp Business accounts, configure AI providers (including
              OpenAI, Anthropic, and Google Gemini), and automate conversational
              workflows through a RESTful API and web dashboard.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-xl font-semibold text-neutral-100">
              2. Acceptance of Terms
            </h2>
            <p className="mt-3">
              By accessing or using eddnbot, you agree to be bound by these
              Terms of Service. If you do not agree to all of these terms, you
              must not use the Service. These terms constitute a legally binding
              agreement between you and eddndev.
            </p>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-xl font-semibold text-neutral-100">
              3. Account and API Key Responsibilities
            </h2>
            <p className="mt-3">
              Access to the Service is granted through API keys issued to each
              tenant. You are responsible for:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-6 text-neutral-300">
              <li>
                Keeping your API keys confidential and secure at all times.
              </li>
              <li>
                All activity that occurs under your API keys, whether authorized
                by you or not.
              </li>
              <li>
                Notifying eddndev immediately at{" "}
                <a
                  href="mailto:contacto@eddndev.com"
                  className="text-neutral-100 underline underline-offset-2 hover:text-white"
                >
                  contacto@eddndev.com
                </a>{" "}
                if you suspect unauthorized use of your credentials.
              </li>
              <li>
                Ensuring that any individual who uses the Service on your behalf
                complies with these Terms.
              </li>
            </ul>
            <p className="mt-3">
              eddndev is not liable for any loss or damage arising from your
              failure to safeguard your API keys.
            </p>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-xl font-semibold text-neutral-100">
              4. Acceptable Use
            </h2>
            <p className="mt-3">
              You agree to use the Service only for lawful purposes and in
              compliance with all applicable laws and regulations. Specifically,
              you must not:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-6 text-neutral-300">
              <li>
                Send unsolicited messages, spam, or bulk communications that
                violate anti-spam laws or WhatsApp policies.
              </li>
              <li>
                Use the Service to distribute, store, or transmit any content
                that is illegal, harmful, threatening, abusive, defamatory, or
                otherwise objectionable.
              </li>
              <li>
                Violate the{" "}
                <a
                  href="https://www.whatsapp.com/legal/business-policy/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neutral-100 underline underline-offset-2 hover:text-white"
                >
                  WhatsApp Business Policy
                </a>{" "}
                or the{" "}
                <a
                  href="https://www.whatsapp.com/legal/commerce-policy/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neutral-100 underline underline-offset-2 hover:text-white"
                >
                  WhatsApp Commerce Policy
                </a>
                .
              </li>
              <li>
                Attempt to gain unauthorized access to the Service, other
                accounts, or any systems or networks connected to the Service.
              </li>
              <li>
                Reverse-engineer, decompile, or disassemble any part of the
                Service.
              </li>
              <li>
                Use the Service in any way that could damage, disable,
                overburden, or impair its operation.
              </li>
            </ul>
            <p className="mt-3">
              eddndev reserves the right to suspend or terminate access to any
              tenant that violates these acceptable use provisions, without prior
              notice.
            </p>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-xl font-semibold text-neutral-100">
              5. Service Availability
            </h2>
            <p className="mt-3">
              eddndev provides the Service on a best-effort basis. We strive to
              maintain high availability, but we do not guarantee uninterrupted
              or error-free operation. Specifically:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-6 text-neutral-300">
              <li>
                No Service Level Agreement (SLA) is provided unless explicitly
                agreed upon in a separate written agreement.
              </li>
              <li>
                The Service may be subject to scheduled or unscheduled downtime
                for maintenance, updates, or other operational reasons.
              </li>
              <li>
                eddndev is not liable for any damages resulting from service
                interruptions or unavailability.
              </li>
            </ul>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-xl font-semibold text-neutral-100">
              6. Quotas and Rate Limiting
            </h2>
            <p className="mt-3">
              Each tenant account is subject to usage quotas and rate limits,
              which may include but are not limited to:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-6 text-neutral-300">
              <li>Maximum AI tokens per month.</li>
              <li>Maximum WhatsApp messages per month.</li>
              <li>Maximum API requests per month.</li>
              <li>Maximum requests per minute (rate limiting).</li>
            </ul>
            <p className="mt-3">
              Quota limits are configured per tenant and may vary by plan or
              agreement. When a quota is exceeded, the Service will reject
              further requests of that type until the next billing period or
              until the quota is adjusted. eddndev reserves the right to modify
              quota allocations at any time with reasonable notice.
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-xl font-semibold text-neutral-100">
              7. Intellectual Property
            </h2>
            <p className="mt-3">
              The Service, including its software, design, documentation, and all
              related intellectual property, is and remains the exclusive
              property of eddndev. These Terms do not grant you any rights to
              eddndev trademarks, service marks, or logos.
            </p>
            <p className="mt-3">
              You retain ownership of any content and data you submit through the
              Service. By using the Service, you grant eddndev a limited,
              non-exclusive license to process your content solely for the
              purpose of providing the Service.
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-xl font-semibold text-neutral-100">
              8. Limitation of Liability
            </h2>
            <p className="mt-3">
              To the maximum extent permitted by applicable law, eddndev and its
              officers, employees, and affiliates shall not be liable for any
              indirect, incidental, special, consequential, or punitive damages,
              including but not limited to loss of profits, data, business
              opportunities, or goodwill, arising out of or in connection with
              your use of the Service.
            </p>
            <p className="mt-3">
              In no event shall eddndev's total aggregate liability exceed the
              amount you have paid to eddndev for the Service during the twelve
              (12) months immediately preceding the event giving rise to the
              claim.
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-xl font-semibold text-neutral-100">
              9. Termination
            </h2>
            <p className="mt-3">
              Either party may terminate these Terms at any time. eddndev may
              suspend or terminate your access to the Service immediately and
              without prior notice if:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-6 text-neutral-300">
              <li>You breach any provision of these Terms.</li>
              <li>
                Your use of the Service poses a security risk or may cause harm
                to other users.
              </li>
              <li>
                eddndev is required to do so by law or regulation.
              </li>
            </ul>
            <p className="mt-3">
              Upon termination, your right to access and use the Service ceases
              immediately. eddndev may delete your data after a reasonable
              retention period following termination.
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="text-xl font-semibold text-neutral-100">
              10. Changes to Terms
            </h2>
            <p className="mt-3">
              eddndev reserves the right to modify these Terms at any time. When
              we make changes, we will update the effective date at the top of
              this page. Continued use of the Service after changes are posted
              constitutes your acceptance of the revised Terms. We encourage you
              to review these Terms periodically.
            </p>
          </section>

          {/* 11 */}
          <section>
            <h2 className="text-xl font-semibold text-neutral-100">
              11. Governing Law
            </h2>
            <p className="mt-3">
              These Terms shall be governed by and construed in accordance with
              the laws of Mexico. Any disputes arising under or in connection
              with these Terms shall be subject to the exclusive jurisdiction of
              the courts of Mexico.
            </p>
          </section>

          {/* 12 */}
          <section>
            <h2 className="text-xl font-semibold text-neutral-100">
              12. Contact
            </h2>
            <p className="mt-3">
              If you have any questions about these Terms of Service, please
              contact us at:
            </p>
            <ul className="mt-3 space-y-1 text-neutral-300">
              <li>
                Email:{" "}
                <a
                  href="mailto:contacto@eddndev.com"
                  className="text-neutral-100 underline underline-offset-2 hover:text-white"
                >
                  contacto@eddndev.com
                </a>
              </li>
              <li>
                Web:{" "}
                <a
                  href="https://eddn.dev"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neutral-100 underline underline-offset-2 hover:text-white"
                >
                  eddn.dev
                </a>
              </li>
            </ul>
          </section>
        </article>

        <footer className="mt-12 border-t border-neutral-800 pt-6 text-center text-sm text-neutral-500">
          <p>&copy; 2026 eddndev. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
