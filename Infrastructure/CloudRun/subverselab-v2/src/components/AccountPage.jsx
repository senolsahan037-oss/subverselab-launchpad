import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  GoogleAuthProvider, EmailAuthProvider, reauthenticateWithPopup, reauthenticateWithCredential, sendEmailVerification,
} from 'firebase/auth';
import ProductActions from './ProductActions';
import PageMeta from './PageMeta';
import Icon from './Icon';
import DownloadButtons from './DownloadButtons';
import DownloadRoomReport from './DownloadRoomReport';
import BuyButton from './BuyButton';
import InboxList from './InboxList';
import useInbox from '../hooks/useInbox';
import { CUSTOMER_LEARN } from '../data/learnContent';
import TesterSpace from './tester/TesterSpace';
import { usePurchases } from './LaunchPage';
import { RedeemForm } from './RedeemCode';
import { PackDownload } from './packs/PackKey';
import { samplePackBySlug } from '../data/samplePacks';
import { PRESET_PACK_LIST } from '../data/presetPacks';
import {
  ALL_PLUGINS, FREE_PLUGINS, SOLO_PLUGINS, FAMILY_SLUGS, PRICES, UPDATES_LINE, formatDay, CARD_BG,
} from '../data/plugins';
import { byLatestRelease } from '../data/productDates';
import { apiUrl, media } from '../utils/endpoints';

// The account page: the signed-in producer's Download Room.
//
// "My plugins" asks GET /api/purchases/status which plugins this account owns
// (single orders, the family, a tester's plugins); no updates end date is shown
// (owner 7 Nov 2026: no term is promised); the licence keys come from GET /api/purchases/licenses, which
// reads plugin_licenses/{lowercased e-mail}, written only by server.js from
// signed Lemon Squeezy webhooks (order_created, license_key_created,
// license_key_updated) and from a free launch-licence claim on /launch
// (launchLicence.js; those entries carry source "launch" and product "bundle").
// Keys therefore appear here by themselves after a purchase; nothing is typed in.
//
// The downloads block replaces the old "Library" concept — collecting free
// packs via /api/library and /api/purchases, which were never served. Asking
// each product whether it has a download action is correct now and correct if
// one ever ships again.

// Licence keys from paid orders: GET /api/purchases/licenses returns only this
// signed-in account's keys, each with the product it belongs to, how many
// computers have activated it and when it was bought. They show up
// by themselves after a purchase (the Lemon Squeezy webhook writes them, which
// can take a minute); `expectKeys` is true when this account owns something paid.
// One row of the account's lower half (owner 28 Oct: "hepsi açılır ok olsun"; the mix of frames, flat text and arrows read as
// amateur). Every block below My plugins / My packs is one of these, in one frame, closed until opened. A #hash that names a row
// (the welcome tiles link to #credits, #inbox) opens it.
function Fold({ id, title, meta, children, danger = false }) {
  const [open, setOpen] = useState(false);
  const { hash } = useLocation();
  // Opened from a link (the site search: /account#keys, #install, #updates): open the fold and bring it into view.
  useEffect(() => { if (id && hash === `#${id}`) { setOpen(true); requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: 'start' })); } }, [hash, id]);
  return (
    <details className={`acct-fold${danger ? ' acct-fold-danger' : ''}`} id={id} open={open}
             onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>
        <span className="acct-fold-title">{title}</span>
        {meta != null && meta !== '' && <span className="acct-fold-meta">{meta}</span>}
      </summary>
      <div className="acct-fold-body">{children}</div>
    </details>
  );
}

function LicenceKeys({ user, expectKeys, onCount, onLicences, refreshKey = 0 }) {
  const [licenses, setLicenses] = useState(null);
  const [copied, setCopied] = useState('');
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const token = await user.getIdToken();
        const r = await fetch(apiUrl('/api/purchases/licenses'), { headers: { Authorization: `Bearer ${token}` } });
        const body = await r.json().catch(() => ({}));
        if (alive && r.ok && Array.isArray(body.licenses)) { setLicenses(body.licenses); onCount?.(body.licenses.length); onLicences?.(body.licenses); }
      } catch { /* no keys shown */ }
    })();
    return () => { alive = false; };
  }, [user, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!licenses) return null;
  if (licenses.length === 0) {
    return expectKeys
      ? <Fold id="keys" title="Licence keys"><p>Your licence key appears here automatically after a purchase. If you just paid, it can take a minute: reload this page.</p></Fold>
      : null;
  }
  const copy = async (l) => {
    try { await navigator.clipboard.writeText(l.key); setCopied(l.id || l.key); setTimeout(() => setCopied(''), 2000); } catch { setCopied(''); }
  };
  const nameOf = (l) => l.productName || [...ALL_PLUGINS, ...SOLO_PLUGINS, ...FREE_PLUGINS].find((p) => p.slug === l.product)?.name || (l.product === 'bundle' ? 'KUBBE + KASET' : l.product === 'family' || l.product === 'bundle4' ? 'KUBBE, KASET, KORO, YANKI, HAVA, MIHENK and TUTKAL' : 'Plugin');
  return (
    <Fold id="keys" title="Licence keys" meta={`${licenses.length} ${licenses.length === 1 ? 'key' : 'keys'}`}>
      <p>For your records: the plug-ins never ask for them.</p>
      <ul className="acct-key-list">
        {licenses.map((l) => (
          <li key={l.id || l.key} className="acct-key-item">
            <strong className="acct-key-name">{nameOf(l)}</strong>
            <code className="acct-key">{l.key}</code>
            <button type="button" className="btn btn-outline acct-small-btn" onClick={() => copy(l)}>
              {copied === (l.id || l.key) ? 'Copied' : 'Copy'}
            </button>
            <p className="acct-key-meta">
              {l.activationLimit != null ? `Activations: ${l.instancesCount ?? 0} of ${l.activationLimit}` : `Activations: ${l.instancesCount ?? 0}`}
              {l.purchased ? ` · Bought ${formatDay(l.purchased)}` : ''}
            </p>
          </li>
        ))}
      </ul>
    </Fold>
  );
}

// Tool credits: GET /api/credits/balance (credits.js). Every $1 spent on plugins adds 100 credits; the online
// tools keep their daily free use, and credits are spent only after it is used up (the tool service asks
// POST /api/credits/spend, server to server). Costs come from the server, never from this page.
const TOOL_NAMES = { splitter: 'Splitter', visualizer: 'Visualizer', mixcheck: 'Mix Check', 'arrangement-gps': 'Arrangement GPS' };
const REASON_TEXT = { purchase: 'Plugin purchase', refund: 'Refund', spend: 'Tool use', release: 'Returned (job failed)', admin: 'Adjustment', 'tester-grant': 'Monthly tester credits', 'tester-expire': 'Unused tester credits expired' };
function ToolCredits({ user, onBalance }) {
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const token = await user.getIdToken();
        const r = await fetch(apiUrl('/api/credits/balance'), { headers: { Authorization: `Bearer ${token}` } });
        const body = await r.json().catch(() => ({}));
        if (!alive) return;
        if (r.ok && typeof body.balance === 'number') { setData(body); onBalance?.(body.balance); } else setFailed(true);
      } catch { if (alive) setFailed(true); }
    })();
    return () => { alive = false; };
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps
  const unproven = !user?.emailVerified && (user?.providerData || []).some((d) => d.providerId === 'password');
  return (
    <Fold id="credits" title="Tool credits" meta={data ? `${data.balance.toLocaleString('en-US')} credits` : ''}>
      <div className="acct-credits">
        {!data && <p className="acct-note" style={{ marginTop: 0 }}>{failed ? 'Your credits could not be loaded right now. Reload the page in a minute.' : 'Loading your credits…'}</p>}
        {data && (
          <>
            <p>Every $1 you spend on plugins adds 100 credits. Your daily free use of the browser tools comes first; credits are used after it.</p>
            {data.tester && <p className="acct-note">{data.tester.left.toLocaleString('en-US')} of these are this month's tester credits. They are used first and do not carry over to next month; credits you bought stay.</p>}
            {unproven && <p className="acct-note">Credits from purchases made without signing in are added when you sign in with Google.</p>}
            {data.costs && (
              <ul className="acct-credits-costs">
                {Object.entries(data.costs).map(([tool, cost]) => <li key={tool}><span>{TOOL_NAMES[tool] || tool}</span><span>{cost} credits per use</span></li>)}
              </ul>
            )}
            {data.recent?.length > 0 && (
              <div>
                <h4 className="acct-fold-sub">Recent activity</h4>
                <ul className="acct-credits-recent">
                  {data.recent.map((l, i) => (
                    <li key={`${l.at}-${i}`}>
                      <span>{formatDay(String(l.at).slice(0, 10))}</span>
                      <span>{REASON_TEXT[l.reason] || l.reason}{l.tool ? ` · ${TOOL_NAMES[l.tool] || l.tool}` : ''}</span>
                      <span className={l.delta < 0 ? 'acct-credits-out' : 'acct-credits-in'}>{l.delta > 0 ? '+' : ''}{l.delta}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </Fold>
  );
}

// An order placed without signing in carries no account id. The order number (printed on the receipt e-mail) together with the
// checkout e-mail address proves it is the buyer's: POST /api/orders/claim binds the order to this account.
function ClaimOrder({ user, onClaimed }) {
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      const token = await user.getIdToken();
      const r = await fetch(apiUrl('/api/orders/claim'), { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ orderNumber, email }) });
      const body = await r.json().catch(() => ({}));
      if (r.ok) {
        const names = [...ALL_PLUGINS, ...SOLO_PLUGINS, ...FREE_PLUGINS].filter((p) => (body.slugs || []).includes(p.slug)).map((p) => p.name);
        setMsg({ ok: true, text: names.length ? `Done. ${names.join(', ')} ${names.length === 1 ? 'is' : 'are'} now on this account.` : 'Done. The order is now on this account.' });
        setOrderNumber('');
        onClaimed?.();
      } else setMsg({ ok: false, text: body.error || 'This could not be claimed right now. Try again in a minute.' });
    } catch { setMsg({ ok: false, text: 'This could not be claimed right now. Try again in a minute.' }); }
    setBusy(false);
  };
  return (
    <details className="acct-claim">
      <summary className="btn btn-outline acct-small-btn acct-claim-btn">Bought without signing in? Add the order</summary>
      <p className="acct-note" style={{ marginTop: 0 }}>Enter the order number from your receipt e-mail and the e-mail address you used at checkout. The order moves to this account.</p>
      <form className="acct-claim-row" onSubmit={submit}>
        <input className="input-field" inputMode="numeric" placeholder="Order number, e.g. 1234" aria-label="Order number" autoComplete="off"
               value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} disabled={busy} />
        <input className="input-field" type="email" placeholder="Checkout e-mail" aria-label="Checkout e-mail" autoComplete="off"
               value={email} onChange={(e) => setEmail(e.target.value)} disabled={busy} />
        <button type="submit" className="btn btn-outline acct-small-btn" disabled={busy || !orderNumber.trim() || !email.trim()}>{busy ? 'Claiming…' : 'Claim'}</button>
      </form>
      {msg && <p className={`acct-note acct-claim-msg${msg.ok ? '' : ' acct-claim-error'}`} role={msg.ok ? 'status' : 'alert'}>{msg.text}</p>}
    </details>
  );
}

// A password account whose e-mail holds a paid order its uid does not (server: emailOrdersWaiting) confirms the address with
// Firebase's own link, sent only to that address (owner bug 25 Oct 2026). Opening the link sets emailVerified; after a fresh
// token the server treats the e-mail as proven and the order opens here, with no order number. The check runs again when
// the tab comes back into focus, so returning from the mail is enough.
function ConfirmEmail({ user, onConfirmed }) {
  const [step, setStep] = useState('idle'); // idle | sending | sent | checking
  const [msg, setMsg] = useState(null);
  const check = async (quiet = false) => {
    if (!quiet) { setStep('checking'); setMsg(null); }
    try {
      await user.reload();
      if (user.emailVerified) { await user.getIdToken(true); onConfirmed?.(); return; }
      if (!quiet) setMsg({ ok: false, text: 'Not confirmed yet. Open the link in the e-mail first, then press this again.' });
    } catch { if (!quiet) setMsg({ ok: false, text: 'This could not be checked right now. Try again in a minute.' }); }
    if (!quiet) setStep('sent');
  };
  useEffect(() => {
    if (step !== 'sent') return undefined;
    const onFocus = () => { if (document.visibilityState === 'visible') check(true); };
    document.addEventListener('visibilitychange', onFocus);
    return () => document.removeEventListener('visibilitychange', onFocus);
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps
  const send = async () => {
    setStep('sending'); setMsg(null);
    try {
      await sendEmailVerification(user, { url: `${window.location.origin}/account` });
      setStep('sent');
      setMsg({ ok: true, text: `Sent to ${user.email}. Open the link in that e-mail, then come back to this page.` });
    } catch (err) {
      setStep('idle');
      setMsg({ ok: false, text: err?.code === 'auth/too-many-requests'
        ? 'A link was sent a moment ago. Wait a few minutes before asking for another one, or claim the order with its number below.'
        : 'The link could not be sent right now. Claim the order with the number from your receipt below.' });
    }
  };
  return (
    <div className="glass-panel acct-panel acct-claim" style={{ marginBottom: 24 }}>
      <h4 style={{ margin: '0 0 6px', fontWeight: 800 }}>An order under your e-mail is waiting</h4>
      <p className="acct-note" style={{ marginTop: 0 }}>Confirm that {user.email} is yours and everything bought with it opens on this account. We send one link to that address.</p>
      <div className="acct-claim-row">
        {step === 'idle' || step === 'sending'
          ? <button type="button" className="btn btn-primary acct-small-btn" onClick={send} disabled={step === 'sending'}>{step === 'sending' ? 'Sending…' : 'Send the confirmation link'}</button>
          : <>
              <button type="button" className="btn btn-primary acct-small-btn" onClick={() => check()} disabled={step === 'checking'}>{step === 'checking' ? 'Checking…' : 'I opened the link'}</button>
              <button type="button" className="btn btn-ghost acct-small-btn" onClick={send}>Send it again</button>
            </>}
      </div>
      {msg && <p className={`acct-note acct-claim-msg${msg.ok ? '' : ' acct-claim-error'}`} role={msg.ok ? 'status' : 'alert'}>{msg.text}</p>}
    </div>
  );
}

// Sample packs and preset packs this account bought (on their own or through a sweep): one zip each, from the same
// download ticket route (launchId 'pack'). Listed even when a pack is no longer shown in the store.
function MyPacks({ user, refreshKey, onCount }) {
  const { packs } = usePurchases(user, true, false, refreshKey);
  const packCount = packs ? packs.length : null;
  useEffect(() => { onCount?.(packCount); }, [packCount]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!packs || packs.length === 0) return null;
  const nameOf = (slug) => samplePackBySlug(slug)?.name || PRESET_PACK_LIST.find((p) => p.id === slug)?.name || slug;
  return (
    <section className="acct-section" id="packs">
      <h3 className="acct-h">My packs</h3>
      <div className="acct-plugin-list">
        {byLatestRelease(packs).map((slug) => (
          <article key={slug} id={slug} className="acct-plugin">
            <div className="acct-plugin-body">
              <h4>{nameOf(slug)} <span>{samplePackBySlug(slug) ? 'Sample pack' : 'Preset pack'}</span></h4>
              <p className="acct-note acct-plugin-note">Download access is tied to this sign-in. Unzip it; README.txt inside explains the folders.</p>
              <PackDownload slug={slug} name={nameOf(slug)} className="btn btn-primary acct-small-btn" />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

// Only what this account has paid for (or holds as an approved tester) is listed:
// the free launch is over, so an earlier free download shows nothing here and no
// download button appears for it (the server refuses those tickets anyway).
// The server's answer decides. A password account whose e-mail is not proven (usePurchases: unverified) lists the plugins bound
// to its uid (paid singles, the family, $0 orders, a first-1,000 claim, orders claimed below) and the free plugins its e-mail
// took (server freeByEmail, 24 Oct 2026); paid orders matched only by its e-mail stay hidden behind the claim card.
// Does a key shown in "Your licence keys" cover this plugin? Keys carry the product they were sold for: the plugin's
// own slug, the family ('family', 'bundle4') or KUBBE + KASET ('bundle'). Keyless products (noKey: RU-8, JING FANG,
// SEDA; the free ones) and keys with no product match nothing, so their cards say nothing about keys.
const KEY_COVERS = { family: FAMILY_SLUGS, bundle4: FAMILY_SLUGS, bundle: ['kubbe', 'kaset'] };
function keyShownFor(plugin, licences) {
  if (plugin.noKey || FREE_PLUGINS.includes(plugin) || !licences?.length) return false;
  return licences.some((l) => l.product === plugin.slug || KEY_COVERS[l.product]?.includes(plugin.slug));
}

function MyPlugins({ user, onPlugins, onKeys, refreshKey, onConfirmed, compact = false }) {
  const { owned, standing, unverified: emailOnlyHidden, emailOrdersWaiting } = usePurchases(user, true, false, refreshKey);
  const [licences, setLicences] = useState(null);
  const { hash } = useLocation();
  // Free plugins (a $0 order) are listed with their downloads, never offered for sale below.
  // Newest release first (root CLAUDE.md "Store order"; src/data/productDates.js).
  const mine = byLatestRelease([...ALL_PLUGINS, ...SOLO_PLUGINS, ...FREE_PLUGINS].filter((p) => owned?.includes(p.slug)), (p) => p.slug);
  const others = owned ? ALL_PLUGINS.filter((p) => !owned.includes(p.slug)) : [];
  const checking = owned === null;
  // Free plugins (a $0 order) carry no licence key, so they do not count as paid here.
  const hasPaid = mine.some((p) => !FREE_PLUGINS.includes(p)) && standing !== 'tester';
  const mineCount = owned ? mine.length : null;
  useEffect(() => { onPlugins?.(mineCount); }, [mineCount]); // eslint-disable-line react-hooks/exhaustive-deps
  // /account#kubbe (the owned Buy buttons link here): scroll to that plugin's card once the list is on the page.
  useEffect(() => {
    const slug = decodeURIComponent((hash || '').replace(/^#/, ''));
    if (!slug || !owned) return;
    const card = document.getElementById(slug);
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [hash, owned]);
  return (
    <div>
      {emailOrdersWaiting && <ConfirmEmail user={user} onConfirmed={onConfirmed} />}
      {emailOnlyHidden && !emailOrdersWaiting && (
        <p className="acct-note">Have an order under this e-mail? Claim it with the order number from your receipt (the form below).</p>
      )}
      {mine.length === 0 && !compact && (
        <p className="acct-note">{checking ? 'Checking your purchases…' : <>No purchased plugins on this account yet. <Link to="/plugins">See the plugins</Link>.</>}</p>
      )}
      <div className="room-grid acct-room-grid">
        {/* compact (a tester): the Downloads section of the tester space lists the products, so they are not listed twice */}
        {/* Owner 28 Oct: the owned plugins look like the cards on /plugins (room-card), with the downloads under each card. */}
        {!compact && mine.map((plugin) => (
          <article key={plugin.slug} id={plugin.slug} className="room-card-item acct-room-item">
            <Link to={plugin.path} className="room-card" aria-label={`${plugin.displayName}, ${plugin.kind}`}>
              <span className="room-card-bg" style={{ backgroundImage: `url(${CARD_BG[plugin.slug] || plugin.cardImage})` }} aria-hidden="true" />
              <img className="room-card-panel" src={plugin.cardImage} alt={`${plugin.displayName}'s front panel`} width={plugin.imageSize[0]} height={plugin.imageSize[1]} loading="lazy" />
              <span className="room-card-info">
                <span className="plugin-card-badge">{FREE_PLUGINS.includes(plugin) ? 'Free · yours' : 'Yours'}</span>
                <span className="room-card-title">{plugin.displayName}</span>
                <span className="room-card-text">{plugin.kind}{plugin.model ? ` · Model ${plugin.model}` : ''}</span>
              </span>
            </Link>
            <div className="acct-room-body">
              <DownloadButtons slug={plugin.slug} launchId={plugin.launchId || 'launch'} paid className="acct-downloads" btnExtra="acct-small-btn" />
              {/* Owner 28 Oct: the manual is a download like the plugin, so it is a button, not a text link. */}
              {(plugin.manual || plugin.manualPage) && (
                <div className="acct-downloads acct-manuals">
                  {plugin.manual && (
                    <a href={plugin.manual} target="_blank" rel="noopener noreferrer" download className="btn btn-outline acct-small-btn">
                      <Icon name="download" /> {plugin.name} manual · PDF
                    </a>
                  )}
                  {plugin.manualPage && (
                    <Link to={plugin.manualPage} className="btn btn-outline acct-small-btn">
                      <Icon name="guide" /> Read online
                    </Link>
                  )}
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
      {others.length > 0 && (
        <div className="acct-help">
          <h4>{mine.length ? 'Get more plugins' : 'Buy a plugin'}</h4>
          <p>Each plugin on its own. {UPDATES_LINE}</p>
          <div className="plugin-buy-row">
            {others.map((p) => (
              <BuyButton place="account" key={p.slug} slug={p.slug} email={user.email} uid={user.uid}
                         label={`Buy ${p.displayName} — $${PRICES[p.slug]}`} className="btn btn-outline plugin-buy-single" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Self-service deletion: POST /api/account/delete (accountDeletion.js has the
// rules). The server wants a sign-in from the last ten minutes and answers
// code "requires-recent-login" otherwise; Firebase's own
// auth/requires-recent-login is handled the same way. The person signs in
// again here (Google popup, or their password) and the deletion is retried.
function DeleteAccount({ user, onDeleted }) {
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [needReauth, setNeedReauth] = useState(false);
  const [password, setPassword] = useState('');
  const isGoogle = user.providerData?.some((p) => p.providerId === 'google.com');

  const send = async () => {
    const token = await user.getIdToken(true);
    const r = await fetch(apiUrl('/api/account/delete'), {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: 'DELETE' }),
    });
    const body = await r.json().catch(() => ({}));
    if (r.ok) { await onDeleted(); return; }
    if (body.code === 'requires-recent-login') { setNeedReauth(true); setError('For your safety, sign in again before deleting your account.'); return; }
    setError(body.error || 'The account could not be deleted. Try again, or write to info@subverselab.com.');
  };

  const run = async (step) => {
    setBusy(true); setError('');
    try { await step(); } catch (err) {
      if (err?.code === 'auth/requires-recent-login') { setNeedReauth(true); setError('For your safety, sign in again before deleting your account.'); }
      else if (err?.code === 'auth/wrong-password' || err?.code === 'auth/invalid-credential') setError('That password is not right.');
      else if (err?.code === 'auth/popup-closed-by-user') setError('The sign-in window was closed.');
      else setError('Something went wrong. Try again, or write to info@subverselab.com.');
    } finally { setBusy(false); }
  };

  const reauth = () => run(async () => {
    if (isGoogle) await reauthenticateWithPopup(user, new GoogleAuthProvider());
    else await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
    setNeedReauth(false); setPassword('');
    await send();
  });

  return (
    <Fold id="delete" title="Delete my account" danger>
      <p>This removes your sign-in and, straight away:</p>
      <ul>
        <li>your free launch licence key and its activations, your download counters and your profile;</li>
        <li>your tester application, reports, messages and test results, if you sent any;</li>
        <li>problem reports you filed while signed in or with your e-mail address;</li>
        <li>your forum topics and replies.</li>
      </ul>
      <p>
        What stays: a one-way hash of your e-mail address, so the free launch licence stays one per person and the public
        count does not go down; and, for paid orders, only the order ID, product, status, order date and that hash, so refunds and
        re-downloads still work. Your invoices stay with Lemon Squeezy. Licence keys from paid orders are removed here; they
        remain in your Lemon Squeezy receipt. This cannot be undone. See the <Link to="/privacy#keep">Privacy Policy</Link>.
      </p>
      <label htmlFor="delete-confirm" style={{ display: 'block', marginTop: '14px', fontWeight: 700 }}>Type DELETE to confirm</label>
      <div className="acct-danger-row">
        <input id="delete-confirm" className="input-field" value={typed} autoComplete="off"
               onChange={(e) => setTyped(e.target.value)} disabled={busy} />
        <button type="button" className="btn btn-danger" disabled={busy || typed !== 'DELETE'} onClick={() => run(send)}>
          {busy ? 'Working…' : 'Delete my account'}
        </button>
      </div>
      {needReauth && (
        <div className="acct-danger-row">
          {!isGoogle && (
            <input type="password" className="input-field" placeholder="Your password" autoComplete="current-password"
                   value={password} onChange={(e) => setPassword(e.target.value)} disabled={busy} />
          )}
          <button type="button" className="btn btn-outline" disabled={busy || (!isGoogle && !password)} onClick={reauth}>
            {isGoogle ? 'Sign in with Google again' : 'Confirm password and delete'}
          </button>
        </div>
      )}
      {error && <p className="acct-danger-error" role="alert">{error}</p>}
    </Fold>
  );
}

function signInMethod(user) {
  const ids = (user.providerData || []).map((d) => d.providerId);
  if (ids.includes('google.com')) return 'Google';
  if (ids.includes('password')) return 'E-mail and password';
  return 'Signed in';
}

// GET /api/testers/me: 'approved' | 'ended' | 'revoked' | ... for this account (null until known). An approved or ended
// tester gets the tester space (tester/TesterSpace.jsx) with this page's content as its "Orders & keys" section.
function useTesterStatus(user) {
  const [status, setStatus] = useState(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch(apiUrl('/api/testers/me'), { headers: { Authorization: `Bearer ${await user.getIdToken()}` } });
        const body = await r.json().catch(() => ({}));
        if (alive) setStatus(r.ok ? body.status : 'none');
      } catch { if (alive) setStatus('none'); /* a normal account page does not depend on it */ }
    })();
    return () => { alive = false; };
  }, [user]);
  return status;
}

// Help, at the bottom of /account (owner 28 Oct): every practical fact once, as cards (CUSTOMER_LEARN), the Updates card (no dates:
// no term is promised, owner 7 Nov 2026), and the two "something is wrong" paths (report, claim an order) together.
function AccountHelp({ claim }) {
  const item = (id) => CUSTOMER_LEARN.find((i) => i.id === id);
  return (
    <>
      <Fold id="updates" title="Updates">
        {item('updates').body.map((t) => <p key={t}>{t}</p>)}
      </Fold>
      <Fold id="install" title="Downloads and installing">
        {item('downloads').body.map((t) => <p key={t}>{t}</p>)}
        {item('install').body.map((t) => <p key={t}>{t}</p>)}
      </Fold>
      <Fold id="problem" title="Something not right?">
        <p>Tell us and a person answers, usually within a day.</p>
        <DownloadRoomReport />
        {claim}
      </Fold>
    </>
  );
}


// The top of /account (owner 28 Oct: "kullanıcı panel hissini güçlendirelim, hoşgeldin gibi bir ibare koyalım, kullanıcıyı özel
// hissettirelim"): a greeting by the visitor's own clock and first name, and the account's own numbers, each a link to its
// section. Only real values: a number that has not loaded, or is zero where zero says nothing, is left out.
function greetingFor(date = new Date()) {
  const h = date.getHours();
  if (h >= 5 && h < 12) return 'Good morning';
  if (h >= 12 && h < 18) return 'Good afternoon';
  return 'Good evening';
}
function firstName(user) {
  const n = String(user.displayName || '').trim().split(/\s+/)[0];
  return n && !/@/.test(n) ? n : '';
}
function AccountWelcome({ user, plugins, packs, credits, unread }) {
  const name = firstName(user);
  const since = formatDay(user.metadata?.creationTime ? new Date(user.metadata.creationTime).toISOString() : '');
  const tiles = [
    plugins ? { href: '#plugins', value: plugins, label: plugins === 1 ? 'plugin' : 'plugins' } : null,
    packs ? { href: '#packs', value: packs, label: packs === 1 ? 'pack' : 'packs' } : null,
    typeof credits === 'number' ? { href: '#credits', value: credits.toLocaleString('en-US'), label: 'tool credits' } : null,
    unread ? { href: '#inbox', value: unread, label: unread === 1 ? 'new message' : 'new messages' } : null,
  ].filter(Boolean);
  return (
    <header className="acct-welcome">
      <div className="acct-welcome-top">
        <div className="acct-welcome-id">
          {user.photoURL
            ? <img className="acct-welcome-avatar" src={user.photoURL} alt="" referrerPolicy="no-referrer" />
            : <span className="acct-welcome-avatar" aria-hidden="true">{(name || user.email)[0].toUpperCase()}</span>}
          <div>
            <p className="acct-welcome-kicker">Your SubverseLab studio</p>
            <h2 className="acct-welcome-title">{greetingFor()}{name ? `, ${name}` : ''}.</h2>
            <p className="acct-welcome-line">
              Welcome back. Everything you own is here, ready to download.
            </p>
          </div>
        </div>
      </div>
      {tiles.length > 0 && (
        <nav className="acct-welcome-tiles" aria-label="Your account">
          {tiles.map((t) => (
            <a key={t.href} href={t.href} className="acct-welcome-tile"><b>{t.value}</b><span>{t.label}</span></a>
          ))}
        </nav>
      )}
      <p className="acct-welcome-meta">
        {user.email} · signed in with {signInMethod(user)}{since ? ` · member since ${since}` : ''}
      </p>
    </header>
  );
}

export default function AccountPage({ user, packs = [], onLogout, onDeleted }) {
  const downloadable = packs.filter(
    (pack) => (pack.actions || []).some((action) => action.type === 'download'),
  );
  const inbox = useInbox(user);
  const [claimNonce, setClaimNonce] = useState(0);
  const testerStatus = useTesterStatus(user);
  const tester = testerStatus === 'approved' || testerStatus === 'ended';
  const [pluginCount, setPluginCount] = useState(null);
  const [packCount, setPackCount] = useState(null);
  const [credits, setCredits] = useState(null);

  const content = (
    <>
        {testerStatus === 'revoked' && <p className="acct-note" role="status">Your tester access has been withdrawn.</p>}
        <AccountWelcome user={user} plugins={pluginCount} packs={packCount} credits={credits} unread={inbox.unread} />

        <section className="acct-section" id="plugins">
          <h3 className="acct-h">My plugins</h3>
          <MyPlugins user={user} refreshKey={claimNonce} compact={tester} onPlugins={setPluginCount}
                     onConfirmed={() => { setClaimNonce((n) => n + 1); inbox.reload(); }} />
        </section>

        <MyPacks user={user} refreshKey={claimNonce} onCount={setPackCount} />

        <section className="acct-section acct-folds" aria-label="Your account">
          <LicenceKeys user={user} expectKeys={pluginCount > 0} refreshKey={claimNonce} />
          {/* A code from a store (api/redeem.js); /redeem is the same form on its own page. */}
          <Fold id="redeem" title="Redeem a code">
            <p className="acct-note" style={{ marginTop: 0 }}>Bought from a store? Enter the code you received and the product is added to this account.</p>
            <RedeemForm user={user} inAccount onRedeemed={() => { setClaimNonce((n) => n + 1); inbox.reload(); }} />
          </Fold>
          <Fold id="inbox" title="Inbox" meta={inbox.unread ? `${inbox.unread} new` : ''}>
            <div className="acct-inbox"><InboxList inbox={inbox} /></div>
          </Fold>
          <ToolCredits user={user} onBalance={setCredits} />
          <AccountHelp claim={<ClaimOrder user={user} onClaimed={() => { setClaimNonce((n) => n + 1); inbox.reload(); }} />} />
          <DeleteAccount user={user} onDeleted={onDeleted || onLogout} />
        </section>
        {downloadable.length > 0 && (
          <div className="acct-section">
            <h3 className="acct-h">Your downloads</h3>
            <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fill, minmax(min(420px, 100%), 1fr))' }}>
              {downloadable.map((pack) => (
                <div key={pack.id} className="pack-card">
                  <div className="pack-info">
                    <h3 className="pack-title">{pack.title}</h3>
                    {(pack.subtitle || pack.description) && (
                      <div className="pack-subtitle">{pack.subtitle || pack.description}</div>
                    )}
                    <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '10px' }}>
                      <ProductActions actions={pack.actions} slug={pack.id} canDownload={true} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}


    </>
  );

  // Until /api/testers/me has answered nothing of the plain page is shown (no flash for a tester); the account content is mounted
  // but hidden meanwhile, so its own requests run in parallel with the status call.
  if (testerStatus === null) {
    return (
      <div className="acct-page">
        <PageMeta title="Account | SubverseLab" noIndex />
        <div className="container"><p role="status">Loading your account…</p><div hidden>{content}</div></div>
      </div>
    );
  }
  if (tester) return <TesterSpace user={user} accountSection={<div className="acct-page tp-account">{content}</div>} />;
  return (
    <div className="acct-page">
      <PageMeta title="Account | SubverseLab" noIndex />
      <div className="container">{content}</div>
    </div>
  );
}
