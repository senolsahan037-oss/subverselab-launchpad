import React from 'react';
import { Link } from 'react-router-dom';
import PageMeta from './PageMeta';
import Icon from './Icon';

/*  Loom's page on subverselab.com.
 *
 *  Not a product room and deliberately not routed through the product system.
 *  Loom has no web surface to frame: it is an MCP server and an Ableton
 *  extension, both running on the reader's own machine, distributed from
 *  GitHub. A ToolRoom entry would have had to call it either an iframe tool or
 *  a download, and it is neither.
 *
 *  The page exists because the software already says it does. `CITATION.cff`,
 *  `NOTICE`, the MCP server's `serverInfo`, the `_source` field on every tool
 *  answer and 215 source files all name https://subverselab.com/loom as the
 *  canonical home. That URL is published and cannot be changed retroactively;
 *  until this route existed it redirected to the storefront, so anyone
 *  following a citation landed somewhere that never mentioned Loom.
 *
 *  Everything below is read from the repository rather than written from
 *  memory — the tool counts, the layer table, the install path, the bridge
 *  diagnostic, the limits. Where the README and the current state disagree,
 *  the current state wins: its "known limits" section still says real-Live
 *  acceptance is pending and that the installed extension is 0.1.0, which
 *  stopped being true on 2026-09-07 at extension 0.4.x.
 */

const LAYERS = [
  ['Sensei', 'MIDI variation — drum, bass, chord — from a locked, hash-checked dataset.'],
  ['ArrangementGPS', 'A project plan from a prompt: tempo, key, genre, tracks, sections.'],
  ['AIMixMaster', 'Reads .als files: gain staging, clip alignment, drum buss, automation writing.'],
  ['Presetor / AISoundDesigner', 'Device chains and a sample palette measured from your own projects, not from presets someone else shipped.'],
  ['MusicalIntelligence', 'Genre evidence measured from real records; part suggestions against the project key.'],
  ['Mix Check / SampleAgent', 'Audio measurement and profile comparison; YouTube to a sliced sample pack.'],
  ['Loom extension', "The single connection to Live. Runs inside Live 12.4 beta as extension id subverselab.loom."],
];

const Section = ({ title, children }) => (
  <section style={{ marginBottom: '44px' }}>
    <h2 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '14px' }}>{title}</h2>
    {children}
  </section>
);

const Code = ({ children }) => (
  <pre style={{
    background: 'var(--color-surface-2, rgba(255,255,255,0.03))',
    border: '1px solid var(--color-border)',
    borderRadius: '10px',
    padding: '16px 18px',
    overflowX: 'auto',
    fontSize: '0.85rem',
    lineHeight: '1.7',
    margin: '0 0 16px',
  }}><code>{children}</code></pre>
);

export default function LoomPage() {
  const softwareSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Loom',
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'macOS',
    url: 'https://subverselab.com/loom',
    codeRepository: 'https://github.com/senolsahan037-oss/loom',
    author: { '@type': 'Person', name: 'Şenol Şahan' },
    publisher: { '@type': 'Organization', name: 'SubverseLab', url: 'https://subverselab.com' },
    description:
      'A measurement-based production system for Ableton Live: a local MCP server that reads your own projects and library, answers with counts instead of guesses, and writes into a running Live session.',
  };

  return (
    <div className="container" style={{ maxWidth: '820px', padding: '56px 20px 96px' }}>
      <PageMeta
        title="Loom — measurement-based production for Ableton Live | SubverseLab"
        description="A local MCP server that reads your own Ableton projects and library, answers with counts instead of guesses, and writes MIDI, device chains, automation and markers into a running Live session — verifying every write by reading it back."
        path="/loom"
      />
      <script type="application/ld+json">{JSON.stringify(softwareSchema)}</script>

      <Link to="/" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.9rem' }}>
        ← Back to Tools
      </Link>

      <h1 style={{ fontSize: '2.4rem', fontWeight: '800', margin: '22px 0 10px' }}>Loom</h1>
      <p style={{ color: 'var(--color-primary)', fontWeight: '600', margin: '0 0 22px' }}>
        Measurement-based production for Ableton Live
      </p>

      <p style={{ color: 'var(--color-text-muted)', lineHeight: '1.75', fontSize: '1.02rem' }}>
        Loom is a local MCP server that reads your own <code>.als</code> projects and your own
        Ableton library, answers with counts instead of guesses, and writes MIDI, device chains,
        automation and arrangement markers into a running Live session — verifying every write by
        reading it back.
      </p>
      <p style={{ color: 'var(--color-text-muted)', lineHeight: '1.75' }}>
        It is open source and free. There is no account, no upload and no server: it runs on your
        machine and reads only what you point it at.
      </p>

      {/* Said at the top, not buried in a limits section at the bottom. Loom is
          open while it is being built rather than held back until it is
          polished, and someone deciding whether to install it should know that
          before they read what it can do. */}
      <div style={{
        border: '1px solid var(--color-primary)',
        borderRadius: '10px',
        padding: '14px 18px',
        margin: '24px 0 0',
        background: 'var(--color-surface-2, rgba(255,255,255,0.02))',
      }}>
        <strong style={{ color: 'var(--color-primary)' }}>Beta, and open while it is built.</strong>
        <span style={{ color: 'var(--color-text-muted)', lineHeight: '1.7' }}>
          {' '}The source is public and it is listed in the MCP Registry, so you can install it
          today — but it changes under you, and it is macOS only. What it cannot do is written
          down further below rather than left for you to find.
        </span>
      </div>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', margin: '28px 0 44px' }}>
        <a href="https://github.com/senolsahan037-oss/loom" target="_blank" rel="noopener noreferrer"
           className="btn btn-primary">
          <Icon name="external" /> View on GitHub
        </a>
        <Link to="/help" className="btn btn-outline">Questions</Link>
      </div>

      <Section title="What it is made of">
        <p style={{ color: 'var(--color-text-muted)', lineHeight: '1.7', marginBottom: '18px' }}>
          Seven engines under one tool namespace, plus the MCP server that exposes them —
          45 tools in total.
        </p>
        <div style={{ display: 'grid', gap: '10px' }}>
          {LAYERS.map(([name, what]) => (
            <div key={name} style={{
              border: '1px solid var(--color-border)', borderRadius: '10px', padding: '14px 18px',
              background: 'var(--color-surface-2, rgba(255,255,255,0.02))',
            }}>
              <strong style={{ display: 'block', marginBottom: '4px' }}>{name}</strong>
              <span style={{ color: 'var(--color-text-muted)', lineHeight: '1.6' }}>{what}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Connecting it to Claude">
        <p style={{ color: 'var(--color-text-muted)', lineHeight: '1.7', marginBottom: '16px' }}>
          One command. It finds every MCP client you have — Claude Desktop, Claude Code,
          Antigravity — registers Loom with each, and backs up the config it touches. Running it
          again is safe.
        </p>
        <Code>{`python3 install.py            # install
python3 install.py --check    # report only, changes nothing`}</Code>
        <p style={{ color: 'var(--color-text-muted)', lineHeight: '1.7', marginBottom: '16px' }}>
          The same command prepares the Live extension package and compares the version installed
          in Live against the one in your checkout, so a mismatch is something you are told about
          rather than something you discover when a write is refused.
        </p>
        <p style={{ color: 'var(--color-text-muted)', lineHeight: '1.7' }}>
          Live's own step is one: add <code>extension/dist/loom.ablx</code> under Extensions in
          Live 12.4 beta and restart Live. After that, ask Claude anything about your projects.
        </p>
      </Section>

      <Section title="How it talks to Live">
        <p style={{ color: 'var(--color-text-muted)', lineHeight: '1.7', marginBottom: '16px' }}>
          There is exactly one path: the Loom extension running inside Live. No Control Surface, no
          automatic fallback, no second writer. The extension opens a file bridge in its own storage
          directory and the MCP server finds that bridge on every call.
        </p>
        <p style={{ color: 'var(--color-text-muted)', lineHeight: '1.7', marginBottom: '16px' }}>
          One tool answers every connection question — which bridge it is talking to and why, how
          old the state is, what the extension says it can do, whether mutations are allowed, and
          the protocol verdict:
        </p>
        <Code>{`live_bridge_status`}</Code>
        <p style={{ color: 'var(--color-text-muted)', lineHeight: '1.7' }}>
          An extension too old to publish a protocol is <strong>read but never written to</strong>:
          every mutation is refused with <code>UPGRADE_REQUIRED</code> before a request file is
          written. Refusing to write is the design, not a gap in it.
        </p>
      </Section>

      <Section title="Where the SDK stops">
        <p style={{ color: 'var(--color-text-muted)', lineHeight: '1.7', marginBottom: '18px' }}>
          Ableton&rsquo;s extension SDK opens some doors and not others. Loom does not treat a
          closed door as a feature it lacks: it measures what is actually on the other side and
          builds a verified path there, then says which path it took. Most of what Loom can do is
          in this category.
        </p>
        <div style={{ display: 'grid', gap: '10px' }}>
          {[
            ['Presets the SDK cannot load',
             'It cannot open a .adg or .adv. Loom reads the preset\u2019s own XML instead \u2014 pads, notes, names, sample files \u2014 resolves those files on your machine and rebuilds the pads inside Live as chain, Simpler and sample. The answer also names what did not carry across: per-pad effects and macros.'],
            ['Device chains from your own projects',
             'Chains are harvested out of .als and .adv files and loaded into Live with no repairs. What you get back is your own vocabulary, measured from your work, not a preset someone else shipped.'],
            ['A note map Live stores inverted',
             'Live writes a drum pad\u2019s ReceivingNote as 128 \u2212 the note. Nothing documents it; it was found by measuring real pads and confirmed 16 of 16. One decoder owns it now.'],
            ['Live\u2019s audio output',
             'There is no SDK route to what Live is playing, so Loom takes a Core Audio process tap, launched as its own LiveTap app so macOS can grant the recording permission to the right thing.'],
            ['The .als file itself',
             'Gain staging, clip alignment, drum buss and automation writing happen on the file, outside the SDK entirely \u2014 work that predates the SDK and still reaches further than it does.'],
            ['Opening and closing Live',
             'An OS-level job, verified against Live\u2019s own log rather than assumed.'],
          ].map(([what, how]) => (
            <div key={what} style={{
              border: '1px solid var(--color-border)', borderRadius: '10px', padding: '14px 18px',
              background: 'var(--color-surface-2, rgba(255,255,255,0.02))',
            }}>
              <strong style={{ display: 'block', marginBottom: '4px' }}>{what}</strong>
              <span style={{ color: 'var(--color-text-muted)', lineHeight: '1.6' }}>{how}</span>
            </div>
          ))}
        </div>
        <p style={{ color: 'var(--color-text-muted)', lineHeight: '1.7', marginTop: '18px' }}>
          None of this is guesswork dressed up as capability. Where a route exists it is measured
          and read back after every write; where none exists, the next section says so plainly.
        </p>
      </Section>

      <Section title="What it will not do">
        <p style={{ color: 'var(--color-text-muted)', lineHeight: '1.7', marginBottom: '16px' }}>
          These are limits of the Ableton SDK or of the approach, and Loom says so rather than
          working around them quietly:
        </p>
        <ul style={{ color: 'var(--color-text-muted)', lineHeight: '1.8', paddingLeft: '20px' }}>
          <li>Rendering needs Live's audio engine. <code>render_plan</code> says what should come
              out and <code>render_verify</code> says whether what came out matches.</li>
          <li>Automation writing covers mixer and device parameters. Clip envelopes are not
              reachable.</li>
          <li>The SDK cannot read a clip's automation, colour or launch settings, so Loom only
              edits an owned object in place. A change that would require deleting it is refused.</li>
          <li>The journal is not exactly-once. Work whose outcome is unknown is neither claimed as
              applied nor as skipped; reading the state is left to the caller.</li>
          <li>Section-level tempo and key cannot be written — there is no automation API for it.</li>
        </ul>
      </Section>

      <Section title="Citing it">
        <p style={{ color: 'var(--color-text-muted)', lineHeight: '1.7', marginBottom: '16px' }}>
          © Şenol Şahan / SubverseLab. Work that copies, adapts or derives from Loom keeps this
          attribution and the <code>NOTICE</code> file, and leaves the <code>_source</code> field on
          every server answer intact. For academic or written citation the repository carries a{' '}
          <code>CITATION.cff</code>.
        </p>
        <Code>{`Şahan, Ş. (2026). Loom: measurement-based production for Ableton Live.
SubverseLab. https://subverselab.com/loom`}</Code>
      </Section>
    </div>
  );
}
