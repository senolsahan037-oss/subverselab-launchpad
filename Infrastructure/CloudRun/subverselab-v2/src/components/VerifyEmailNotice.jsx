import React, { useEffect, useState } from 'react';
import { sendEmailVerification } from 'firebase/auth';
import { auth } from '../firebase';

// Sends Firebase's verification e-mail and never hides a failure: the result
// carries the Firebase error code, and it is also stored for the report form
// ("Last download message").
export const VERIFY_ACTION = { url: 'https://subverselab.com/launch' };
// Shared across the sign-up, the download button and the notice: one send per 60 s.
const COOLDOWN_MS = 60 * 1000;
let lastSentAt = 0;
export const cooldownLeft = (now = Date.now()) => Math.max(0, Math.ceil((lastSentAt + COOLDOWN_MS - now) / 1000));
export async function sendVerificationMail(user) {
  lastSentAt = Date.now();
  try {
    await sendEmailVerification(user, VERIFY_ACTION);
    return { ok: true, message: `Verification e-mail sent to ${user.email}. Check the spam folder too.` };
  } catch (err) {
    const message = `Could not send the verification e-mail (${err.code || err.message}).`;
    window.__svlLastDownloadError = `verification e-mail: ${err.code || err.message}`;
    return { ok: false, message };
  }
}

export default function VerifyEmailNotice({ className = 'verify-email-notice' }) {
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const left = cooldownLeft(now);
  const counting = left > 0;
  useEffect(() => {
    if (!counting) return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [counting]);
  const resend = async () => {
    const u = auth.currentUser;
    if (!u || busy || left > 0) return;
    setBusy(true);
    const out = await sendVerificationMail(u);
    setNow(Date.now());
    setResult(out); setBusy(false);
  };
  return (
    <div className={className}>
      <button type="button" className="btn btn-outline" onClick={resend} disabled={busy || left > 0}>
        {busy ? 'Sending…' : left > 0 ? `Resend verification e-mail (${left}s)` : 'Resend verification e-mail'}
      </button>
      {result && <p role="status" data-ok={result.ok}>{result.message}</p>}
    </div>
  );
}
