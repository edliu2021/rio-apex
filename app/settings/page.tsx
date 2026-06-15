import { redirect } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import { getSignature, getSetting } from "@/lib/db";
import { snapshot } from "@/lib/quota";
import AppNav from "../AppNav";
import SignatureForm from "./SignatureForm";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  if (!isAuthed()) redirect("/activate");
  const sig = getSignature();
  const quota = snapshot();
  const email = getSetting("REPLY_EMAIL") || getSetting("REPLY_TO") || undefined;

  return (
    <div className="container">
      <AppNav active="settings" quota={quota} email={email} />
      <h1>Your email signature</h1>
      <p className="muted" style={{ marginBottom: 22, maxWidth: 640 }}>
        These show up at the bottom of every cold email and in the &quot;I&apos;m X based in Y&quot; opener. New drafts get them automatically — change anything here and re-compose to update existing drafts.
      </p>
      <SignatureForm
        initial={{
          name: sig.name,
          replyEmail: sig.replyEmail,
          phone: sig.phone,
          mailingAddress: sig.mailingAddress,
          bookingLink: sig.bookingLink,
        }}
      />
      <p className="faint" style={{ fontSize: 12, marginTop: 18 }}>
        Looking for API keys (Anthropic, Resend, Google, Bouncer)? Those live on the <a className="link" href="/app/settings">developer settings</a> page.
      </p>
    </div>
  );
}
