import { Link } from "@tanstack/react-router";

export function DataDeletion() {
  return (
    <div className="min-h-screen bg-neutral-950 px-4 py-12">
      <div className="mx-auto max-w-3xl space-y-8">
        <Link
          to="/"
          className="inline-block text-sm text-neutral-400 transition-colors hover:text-neutral-100"
        >
          &larr; Back to home
        </Link>

        <header>
          <h1 className="text-3xl font-bold text-neutral-100">
            Data Deletion Instructions
          </h1>
          <p className="mt-2 text-neutral-400">
            How to request deletion of your data from eddnbot
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-neutral-100">
            What data does eddnbot store?
          </h2>
          <p className="text-neutral-300">
            As part of providing our WhatsApp automation service, eddnbot may
            collect and store the following types of data:
          </p>
          <ul className="list-disc space-y-1 pl-6 text-neutral-300">
            <li>WhatsApp messages sent and received through the platform</li>
            <li>Phone numbers associated with conversations</li>
            <li>Conversation history and session metadata</li>
            <li>AI-generated responses linked to conversations</li>
            <li>Usage metrics and analytics (message counts, token usage)</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-neutral-100">
            How to request data deletion
          </h2>
          <p className="text-neutral-300">
            To request the deletion of your data, send an email to{" "}
            <a
              href="mailto:contacto@eddndev.com"
              className="text-blue-400 underline underline-offset-2 transition-colors hover:text-blue-300"
            >
              contacto@eddndev.com
            </a>{" "}
            with the following information:
          </p>
          <ul className="list-disc space-y-1 pl-6 text-neutral-300">
            <li>
              Your phone number (including country code) associated with the
              conversations
            </li>
            <li>
              Your tenant or organization name, if applicable
            </li>
            <li>
              A brief description of the data you would like deleted
            </li>
          </ul>
          <p className="text-neutral-400">
            Please use the subject line{" "}
            <span className="font-mono text-neutral-300">
              &quot;Data Deletion Request&quot;
            </span>{" "}
            so we can process your request promptly.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-neutral-100">
            What happens when your data is deleted?
          </h2>
          <p className="text-neutral-300">
            Upon processing your request, we will permanently remove the
            following from our systems:
          </p>
          <ul className="list-disc space-y-1 pl-6 text-neutral-300">
            <li>All WhatsApp messages associated with your phone number</li>
            <li>Conversation history and session records</li>
            <li>AI-generated responses linked to your conversations</li>
            <li>Any associated usage data and metrics</li>
          </ul>
          <p className="text-neutral-300">
            Once deleted, this data cannot be recovered. Any active
            automations tied to your account will stop functioning.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-neutral-100">
            Timeframe
          </h2>
          <p className="text-neutral-300">
            Data deletion requests are processed within{" "}
            <strong className="text-neutral-100">30 days</strong> of receipt.
            You will receive a confirmation email once the deletion is complete.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-neutral-100">Contact</h2>
          <p className="text-neutral-300">
            If you have any questions about data deletion or our data handling
            practices, please contact us:
          </p>
          <ul className="list-none space-y-1 pl-0 text-neutral-300">
            <li>
              <span className="text-neutral-400">Email:</span>{" "}
              <a
                href="mailto:contacto@eddndev.com"
                className="text-blue-400 underline underline-offset-2 transition-colors hover:text-blue-300"
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
                className="text-blue-400 underline underline-offset-2 transition-colors hover:text-blue-300"
              >
                eddn.dev
              </a>
            </li>
            <li>
              <span className="text-neutral-400">Operator:</span> eddndev
            </li>
          </ul>
        </section>

        <footer className="border-t border-neutral-800 pt-6 text-sm text-neutral-500">
          <p>Last updated: March 2026</p>
        </footer>
      </div>
    </div>
  );
}
