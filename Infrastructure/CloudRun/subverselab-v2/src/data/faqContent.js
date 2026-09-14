// Plain data, no JSX — imported by both the React Help page (src/) and the
// build-time prerender script (scripts/, plain Node, no bundler) so the two
// never drift out of sync with each other.

export const GENERAL_FAQ = [
  {
    q: 'Do I need an account to use SubverseLab?',
    a: 'Browsing the tools and reading guides never requires an account. Some tools are open to anyone, and some require a free account to use or to download — each product card shows which applies before you commit to anything.',
  },
  {
    q: 'How much does everything cost?',
    a: 'Everything currently on SubverseLab is free. Signing in with Google creates a free membership — no payment details are ever requested for any tool or pack listed today.',
  },
  {
    q: 'Why do some tools only let me generate or analyze a limited number of times per day?',
    a: 'Where a tool applies a daily limit, the exact rule is documented on that tool’s guide. Subverse Mix Check allows members one completed analysis per IP address per UTC day; verified admins have no product quota. The website passes membership into the tool, so the tool does not show a second sign-in screen.',
  },
  {
    q: 'I signed in on SubverseLab — why did a tool ask me to sign in again?',
    a: 'It shouldn’t. Opening a member-gated tool from its Launch button on SubverseLab passes your session to the tool automatically. If a tool still asks you to sign in separately, that’s a bug — please report it using the link below.',
  },
  {
    q: 'Why do some downloads require an account but browsing doesn’t?',
    a: 'Free access and free downloads are two different gates. A product can be fully public to look at and even use, while its actual download is reserved for signed-in members — this is stated on the product card itself, next to the download button.',
  },
  {
    q: 'I found a broken link or something that doesn’t work — how do I report it?',
    a: 'Use the “Report Broken Link or Technical Issue” button on the tools page, or email info@subverselab.com directly.',
  },
];

export const TOOL_FAQ = [
  {
    q: 'What does Sensei actually generate?',
    a: 'Standard MIDI drum patterns — not audio. You pick one of 22 genre styles and Sensei writes an 8-bar, 4/4 pattern across six drum channels: kick, snare, hi-hat, open hat, crash and perc. Tempo comes from the style and the seed is drawn fresh each time, so both are shown as readouts rather than fields you fill in. You export a .mid file and load your own kit or sampler in your DAW.',
  },
  {
    q: 'Can I change how busy a Sensei pattern is?',
    a: 'Yes — kick, snare, hi-hat and perc each have a density knob that thins the pattern already loaded, removing the least structural hits first. The knobs take effect while playback continues and never start a new generation, so you can shape a groove by ear without losing it. Variation is the separate control: it derives another take from the same pattern at the same style, tempo and seed, and leaves locked channels untouched.',
  },
  {
    q: 'What do I get when I download from Sensei?',
    a: 'Full Pattern gives you one .mid containing every channel. Every Channel gives you a .zip with one .mid per channel. A single channel on its own is the Channel MIDI button on that channel’s mixer strip. Exports follow what you are actually hearing, including your density settings; mute and solo affect playback only and never remove notes from the file.',
  },
  {
    q: 'Does Subverse Mix Check upload my track anywhere permanently?',
    a: 'No. Your WAV or MP3 is analyzed from temporary storage and deleted after processing; only the measurement result is returned. The tool reports direct loudness, level, spectrum, and supported mono fold-down evidence. It does not invent a quality score, key, BPM, or AI recommendation.',
  },
  {
    q: 'How does the Subverse Mix Check daily limit work?',
    a: 'Members get one completed analysis per IP address per UTC calendar day. Failed or undecodable files release the reservation. Verified SubverseLab admins are exempt from the product quota. Membership is handed over from the website; Mix Check has no separate login.',
  },
  {
    q: 'Where does Subverse Splitter process my audio?',
    a: 'On SubverseLab’s own server. The Splitter became a web tool in August 2026, replacing the desktop app that ran separation on your machine — so the honest answer changed with it: your file is uploaded, separated in a dedicated Cloud Run service, and held in that instance’s temporary workspace only until you have collected the stems. Completed jobs and their audio are discarded within about thirty minutes, and nothing is written to the product database. Key and BPM analysis is unlimited; separations are one per member and per network address each day.',
  },
  {
    q: 'What does SynthPulse generate, and how is it different from Sensei?',
    a: 'SynthPulse writes melodic and bass patterns; Sensei writes drums. SynthPulse gives you a 16-step pattern across six lanes — four lead, two bass — in one of four styles, and exports it as MIDI. The sound you hear in the browser is a preview to help you judge the idea; the exported file carries notes only, and your own instruments decide how it sounds.',
  },
  {
    q: 'What is the pattern score in SynthPulse?',
    a: 'It is the ranking model’s prediction, from 0 to 100, that a pattern is one somebody would keep. Generate writes several candidates, rates them and hands over the best. The model learns from exactly one signal — which patterns members download — so downloading a pattern is what teaches it. Editing a pattern by hand clears the score rather than recalculating it, because the score belongs to what the tool proposed and you have since changed it.',
  },
  {
    q: 'Does Time & Frequency Sync send my project data anywhere?',
    a: 'No. It is a calculator and it runs entirely in your browser — no upload, no server processing, no account. Enter a tempo and it returns delay and reverb times, note-to-Hz harmonics and sample repitch math, and you can hear each value before you use it: it plays a real echo at that division, a synthetic reverb tail at that decay, or a tone at that frequency.',
  },
  {
    q: 'Does Arrangement GPS store my generated arrangements?',
    a: 'No. It’s built for ideation, not project storage — a generated idea can be downloaded as a one-time recipe file, but nothing is saved on SubverseLab’s side.',
  },
];

// Loom. Not one of the browser tools and listed here rather than on the
// storefront for that reason: it runs on your own machine, alongside Ableton,
// and it is open source and in beta.
export const LOOM_FAQ = [
  {
    q: 'What is Loom?',
    a: 'Loom is the production system behind SubverseLab\u2019s own records \u2014 a local MCP server that reads your own Ableton projects and library, answers with counts instead of guesses, and writes MIDI, device chains, automation and arrangement markers into a running Live session, verifying every write by reading it back. It is not a browser tool: it runs on your machine, next to Live. Full details are at subverselab.com/loom.',
  },
  {
    q: 'Is Loom finished, and can I use it now?',
    a: 'It is in beta and open while it is being built, rather than held back until it is polished. The source is public at github.com/senolsahan037-oss/loom and it is listed in the MCP Registry, so you can install it today \u2014 but expect it to change under you, and expect to read its limits. macOS only: the writer path is an Ableton Live extension, the audio measurement is Core Audio, and opening a set is an operating-system call.',
  },
  {
    q: 'What can Loom actually do?',
    a: '45 tools across seven engines: MIDI variation from a locked dataset, project plans from a prompt, .als inspection and gain staging, device chains and a sample palette measured from your own projects, genre evidence measured from real records, audio measurement and profile comparison, and a YouTube-to-sample-pack path. It also says what it cannot do \u2014 rendering needs Live\u2019s audio engine, clip envelopes are out of reach, and section-level tempo and key cannot be written because there is no API for them.',
  },
  {
    q: 'How do I connect Loom to Claude?',
    a: 'One command: python3 install.py. It finds every MCP client you have \u2014 Claude Desktop, Claude Code, Antigravity \u2014 registers Loom with each, and backs up the config it touches. Live\u2019s own step is to add the extension package under Extensions in Live 12.4 beta and restart Live.',
  },
  {
    q: 'Is Loom free, and what are the terms?',
    a: 'Free and open source. Work that copies, adapts or derives from it keeps the attribution and the NOTICE file, and leaves the _source field on every server answer intact. For academic or written citation the repository carries a CITATION.cff.',
  },
];

export const CONTACT_FAQ = [
  {
    q: 'How do I get in touch?',
    a: 'Email info@subverselab.com, or join the Discord and Instagram/YouTube communities linked in the footer.',
  },
];

export const ALL_FAQ = [...GENERAL_FAQ, ...TOOL_FAQ, ...LOOM_FAQ, ...CONTACT_FAQ];
