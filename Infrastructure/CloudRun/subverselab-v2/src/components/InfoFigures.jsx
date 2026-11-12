import React from 'react';
import { REFUND_DAYS } from '../data/legalContent';

// Visual summaries for the info pages in the footer (owner 2026-10-22: "bilgilendirme sayfalarındaki metinlere görsel
// anlatımlar ekleyelim, bu şekilde mağazadan çok dokümantasyon sitesine benziyor"). Each figure sits under the heading
// of the section it summarises and says nothing the section text does not already say (src/data/legalContent.js).
// The text stays the authority; a figure is a picture of it. Theme tokens only, so both themes work; the styles live
// here (infoFiguresCss) rather than in index.css.

const I = {
  cart: <path d="M3 4h2l2.2 10.2a1 1 0 0 0 1 .8h8.6a1 1 0 0 0 1-.8L19 8H6.2M9 19.5a1 1 0 1 0 0 .01M17 19.5a1 1 0 1 0 0 .01" />,
  card: <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h15A1.5 1.5 0 0 1 21 6.5v11a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5zM3 9.5h18M6.5 15h4" />,
  mail: <path d="M3.5 6h17v12h-17zM3.5 6.5 12 13l8.5-6.5" />,
  user: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20a7.5 7.5 0 0 1 15 0" />,
  download: <path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M4.5 19.5h15" />,
  clock: <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7.5V12l3 2" />,
  scale: <path d="M12 4v16M7 20h10M5 8h14M5 8l-2.5 6a3 3 0 0 0 5 0zM19 8l-2.5 6a3 3 0 0 0 5 0z" />,
  undo: <path d="M9 7 4.5 11.5 9 16M5 11.5h9.5a5 5 0 0 1 0 10H11" />,
  eye: <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />,
  lock: <path d="M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3" />,
  chart: <path d="M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-6" />,
  edit: <path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" />,
  trash: <path d="M5 7h14M9.5 7V4.5h5V7M7 7l1 13h8l1-13" />,
  hand: <path d="M12 3v9M8.5 6v7M15.5 6v7M5 10v4a7 7 0 0 0 14 0V8" />,
  box: <path d="M4 8 12 4l8 4v8l-8 4-8-4zM4 8l8 4 8-4M12 12v8" />,
  stop: <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM5.6 5.6l12.8 12.8" />,
  check: <path d="M5 12.5 10 17 19 7.5" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  computer: <path d="M3.5 5h17v11h-17zM9 20h6M12 16v4" />,
  music: <path d="M9 18V6l10-2v12M9 18a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0zM19 16a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z" />,
  refresh: <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4" />,
  coin: <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM14.5 9.2c-.5-.8-1.4-1.2-2.5-1.2-1.4 0-2.5.8-2.5 2s1.1 1.6 2.5 2 2.5.8 2.5 2-1.1 2-2.5 2c-1.1 0-2-.4-2.5-1.2M12 6.5v11" />,
  server: <path d="M4 4.5h16v6H4zM4 13.5h16v6H4zM7.5 7.5h.01M7.5 16.5h.01" />,
};
const Icon = ({ name }) => (
  <svg className="if-ico" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{I[name]}</svg>
);

function Steps({ steps, label }) {
  return (
    <ol className="if-steps" aria-label={label}>
      {steps.map((s, i) => (
        <li key={s.t} className="if-step">
          <span className="if-num">{i + 1}</span>
          <Icon name={s.icon} />
          <b>{s.t}</b>
          <span>{s.d}</span>
        </li>
      ))}
    </ol>
  );
}

const BUY_STEPS = [
  { icon: 'cart', t: 'Buy', d: 'Press Buy on the product page. Prices are in US dollars.' },
  { icon: 'card', t: 'Pay at Lemon Squeezy', d: 'Tax is added where it applies. We never see your card.' },
  { icon: 'mail', t: 'Receipt by e-mail', d: 'It carries your order number.' },
  { icon: 'download', t: 'Download', d: 'Sign in with the e-mail you paid with: the product is on your Account page.' },
];

export function BuyingFlow() {
  return (
    <figure className="if-fig">
      <Steps steps={BUY_STEPS} label="How buying works" />
      <div className="if-updates" aria-label="Updates">
        <div className="if-bar"><span className="if-bar-fill">Updates on your Account page</span><span className="if-bar-rest">your version keeps working</span></div>
      </div>
    </figure>
  );
}

function RefundTimeline() {
  return (
    <figure className="if-fig">
      <div className="if-timeline" role="img" aria-label={`Ask for a refund within ${REFUND_DAYS} days of the purchase; Lemon Squeezy decides; a refund ends the licence.`}>
        <div className="if-tl-track">
          <span className="if-tl-window">{REFUND_DAYS} days to ask</span>
        </div>
        <div className="if-tl-marks"><span>Day 0 · purchase</span><span>Day {REFUND_DAYS}</span></div>
      </div>
      <Steps label="How a refund goes" steps={[
        { icon: 'mail', t: 'Write to us', d: 'info@subverselab.com with the order number and the e-mail you paid with.' },
        { icon: 'scale', t: 'Lemon Squeezy decides', d: 'Case by case, as the merchant of record. The money goes back to your payment method.' },
        { icon: 'undo', t: 'Refunded', d: 'The licence ends, the downloads close, the credits from the order are taken back.' },
      ]} />
    </figure>
  );
}

function RefundEffects() {
  return (
    <figure className="if-fig">
      <ul className="if-grid if-grid-3">
        <li className="if-tile"><Icon name="lock" /><b>Licence</b><span>Ends with the refund.</span></li>
        <li className="if-tile"><Icon name="download" /><b>Downloads</b><span>Close on your Account page. Refunding an order that holds several plugins closes all of them.</span></li>
        <li className="if-tile"><Icon name="coin" /><b>Credits</b><span>Each $1 added 100. A full refund takes them back, a partial one the same share; never below zero.</span></li>
      </ul>
    </figure>
  );
}

function DataMap() {
  const rows = [
    { icon: 'eye', t: 'Reading the site', d: 'No account needed. Page counts on our own server, with no IP address and no identifier.', who: 'Nothing personal' },
    { icon: 'user', t: 'Signing in', d: 'E-mail address (and name and picture with Google). Your password stays with Firebase.', who: 'Google Firebase' },
    { icon: 'card', t: 'Buying', d: 'Order e-mail, order number, product, status and licence key reach us.', who: 'Lemon Squeezy · card never reaches us' },
    { icon: 'chart', t: 'Usage statistics', d: 'Google Analytics loads only after you press "Accept analytics".', who: 'Only if you accept' },
  ];
  return (
    <figure className="if-fig">
      <ul className="if-map">
        {rows.map((r) => (
          <li key={r.t}><Icon name={r.icon} /><div><b>{r.t}</b><span>{r.d}</span></div><em>{r.who}</em></li>
        ))}
      </ul>
      <figcaption>We do not sell your data, rent it out or use it for advertising.</figcaption>
    </figure>
  );
}

function Retention() {
  const rows = [
    ['Server request logs', '30 days'],
    ['Analytics (only with your consent)', '2 months'],
    ['Problem reports', '12 months after resolved'],
    ['Tester applications and reports', 'programme + 12 months'],
    ['Account, licences, downloads', 'while your account exists'],
    ['Forum posts', 'until you delete them'],
  ];
  return (
    <figure className="if-fig">
      <table className="if-table">
        <tbody>{rows.map(([k, v]) => <tr key={k}><th scope="row"><Icon name="clock" />{k}</th><td>{v}</td></tr>)}</tbody>
      </table>
      <figcaption>"Delete my account" on your Account page removes your data at once, apart from a one-way hash of your e-mail address.</figcaption>
    </figure>
  );
}

function Rights() {
  const r = [
    ['eye', 'Access', 'A copy of what we hold'],
    ['edit', 'Correction', 'Fix what is wrong'],
    ['trash', 'Deletion', '"Delete my account", yourself'],
    ['hand', 'Objection', 'Stop or restrict processing'],
    ['box', 'Portability', 'Your data, machine-readable'],
    ['stop', 'Withdraw consent', 'At any time'],
  ];
  return (
    <figure className="if-fig">
      <ul className="if-grid if-grid-3">
        {r.map(([icon, t, d]) => <li key={t} className="if-tile"><Icon name={icon} /><b>{t}</b><span>{d}</span></li>)}
      </ul>
      <figcaption>E-mail info@subverselab.com for the rest; we answer within 30 days.</figcaption>
    </figure>
  );
}

function Licence() {
  return (
    <figure className="if-fig">
      <div className="if-two">
        <div className="if-col">
          <h3>A paid licence gives you</h3>
          <ul className="if-list">
            <li><Icon name="user" />One person</li>
            <li><Icon name="computer" />Your own computers</li>
            <li><Icon name="music" />Personal and commercial music, released or sold</li>
            <li><Icon name="refresh" />Updates on your Account page; your version keeps working</li>
          </ul>
        </div>
        <div className="if-col if-col-no">
          <h3>Not allowed</h3>
          <ul className="if-list">
            <li><Icon name="x" />Reselling, renting or uploading the installers</li>
            <li><Icon name="x" />Sharing your licence</li>
            <li><Icon name="x" />Reverse engineering, where the law does not allow it</li>
          </ul>
        </div>
      </div>
    </figure>
  );
}

function AccountRules() {
  return (
    <figure className="if-fig">
      <ul className="if-grid if-grid-3">
        <li className="if-tile"><Icon name="user" /><b>16 or older</b><span>Accounts are for people aged 16 and over.</span></li>
        <li className="if-tile"><Icon name="check" /><b>One person, one account</b><span>With an e-mail address that is really yours.</span></li>
        <li className="if-tile"><Icon name="trash" /><b>Yours to delete</b><span>"Delete my account" on your Account page, at any time.</span></li>
      </ul>
    </figure>
  );
}

const FIGURES = {
  '/refunds#summary': RefundTimeline,
  '/refunds#buying': BuyingFlow,
  '/refunds#after': RefundEffects,
  '/privacy#collect': DataMap,
  '/privacy#keep': Retention,
  '/privacy#rights': Rights,
  '/terms#paid': Licence,
  '/terms#accounts': AccountRules,
};

export default function InfoFigure({ path, id }) {
  const F = FIGURES[`${path}#${id}`];
  return F ? <F /> : null;
}

export const infoFiguresCss = `
.if-fig { margin: 4px 0 22px; padding: 18px; border: 1px solid var(--color-border); border-radius: 12px; background: var(--color-surface); color: var(--color-text); }
.if-fig figcaption { margin-top: 12px; font-size: .85rem; color: var(--color-text-muted); line-height: 1.5; }
.if-ico { width: 22px; height: 22px; flex: 0 0 22px; color: var(--color-gold); }
.if-steps { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; counter-reset: s; }
.if-step { position: relative; display: flex; flex-direction: column; gap: 6px; padding: 14px 14px 14px; border-radius: 10px; background: var(--color-bg); border: 1px solid var(--color-border); }
.if-step b { font-size: .95rem; color: var(--color-text); }
.if-step > span:last-child { font-size: .82rem; line-height: 1.45; color: var(--color-text-muted); }
.if-num { position: absolute; top: 10px; right: 12px; font: 800 .72rem/1 var(--font-mono, ui-monospace, Menlo, monospace); color: var(--color-text-dim); }
.if-updates { margin-top: 14px; }
.if-bar { display: flex; border-radius: 8px; overflow: hidden; font-size: .78rem; font-weight: 700; }
.if-bar-fill { flex: 2; padding: 8px 10px; background: var(--color-primary); color: var(--color-on-primary); }
.if-bar-rest { flex: 1; padding: 8px 10px; background: var(--color-surface-2); color: var(--color-text-muted); }
.if-timeline { margin-bottom: 14px; }
.if-tl-track { position: relative; height: 34px; border-radius: 8px; background: var(--color-surface-2); overflow: hidden; }
.if-tl-window { position: absolute; left: 0; top: 0; bottom: 0; width: 72%; display: flex; align-items: center; padding: 0 12px; background: var(--color-primary); color: var(--color-on-primary); font-weight: 800; font-size: .82rem; }
.if-tl-marks { display: flex; justify-content: space-between; width: 72%; margin-top: 4px; font-size: .72rem; color: var(--color-text-dim); }
.if-grid { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
.if-grid-3 { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
.if-tile { display: flex; flex-direction: column; gap: 6px; padding: 14px; border-radius: 10px; background: var(--color-bg); border: 1px solid var(--color-border); }
.if-tile b { font-size: .95rem; color: var(--color-text); }
.if-tile span { font-size: .82rem; line-height: 1.45; color: var(--color-text-muted); }
.if-map { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.if-map li { display: grid; grid-template-columns: 22px minmax(0, 1fr) auto; gap: 12px; align-items: center; padding: 12px 14px; border-radius: 10px; background: var(--color-bg); border: 1px solid var(--color-border); }
.if-map b { display: block; font-size: .95rem; color: var(--color-text); }
.if-map span { display: block; font-size: .82rem; line-height: 1.45; color: var(--color-text-muted); }
.if-map em { font-style: normal; font-size: .74rem; font-weight: 800; letter-spacing: .02em; padding: 4px 9px; border-radius: 999px; background: var(--color-surface-2); color: var(--color-text); text-align: center; }
@media (max-width: 560px) { .if-map li { grid-template-columns: 22px minmax(0, 1fr); } .if-map em { grid-column: 2; justify-self: start; } }
.if-table { width: 100%; border-collapse: collapse; font-size: .88rem; }
.if-table th { display: flex; align-items: center; gap: 10px; text-align: left; font-weight: 600; color: var(--color-text); padding: 9px 0; }
.if-table td { text-align: right; padding: 9px 0; color: var(--color-text); font-weight: 800; white-space: nowrap; }
.if-table tr + tr th, .if-table tr + tr td { border-top: 1px solid var(--color-border); }
.if-table .if-ico { width: 18px; height: 18px; flex-basis: 18px; }
@media (max-width: 560px) { .if-table td { white-space: normal; } }
.if-two { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; }
.if-col { padding: 14px; border-radius: 10px; background: var(--color-bg); border: 1px solid var(--color-border); }
.if-col h3 { margin: 0 0 10px; font-size: .78rem; letter-spacing: .12em; text-transform: uppercase; color: var(--color-gold); }
.if-col-no .if-ico { color: var(--color-danger); }
.if-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.if-list li { display: flex; gap: 10px; align-items: center; font-size: .9rem; color: var(--color-text); }
`;
