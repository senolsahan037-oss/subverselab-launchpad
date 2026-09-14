// Seed topics, shown until the forum has posts of its own.
//
// Two things changed here. The text was Turkish on an otherwise English site,
// and it was attributed to ten invented people — Mert, Derya, Can and so on —
// across fifty topics generated from ten templates, with "Bölüm 2, 3, 4"
// appended to pad the count. Publishing messages in the names of people who do
// not exist is the kind of thing that costs more than an empty forum ever
// would, and the padding made it obvious anyway.
//
// These are signed by SubverseLab, because that is who wrote them. Every answer
// below is something measured or decided in this project rather than filler:
// the separation timings, the daily allowance, the Live version, the tool
// count. A visitor who acts on one of them will find it holds.
const author = 'SubverseLab';

export const FORUM_SEED_TOPICS = [
  {
    category: 'Product support',
    title: 'Why does stem separation take minutes rather than seconds?',
    body: "The model reads the track in fixed 7.8-second windows and those windows overlap by a quarter, so a four-minute track is about 41 passes rather than 31. The overlap is not decoration: without it the windows are butt-joined and every seam leaves a click — measured at 35 times the surrounding signal on real music, worst in the vocal. With the cross-fade it drops to 2.4, which is indistinguishable from ordinary signal. So a separation that finishes quickly is one that left the ticks in.",
    replies: [
      "If you only need the tempo and the key, use Key & BPM instead — that reads the whole file in well under a second and does not touch your daily separation.",
    ],
  },
  {
    category: 'Product support',
    title: 'How does the daily limit on Subverse Splitter work?',
    body: "Key & BPM analysis is unlimited. Vocal removal and stem separation share one run per day, counted per account and per network address. The run is reserved when the job starts and only marked used when it finishes, so a failed separation gives it back rather than charging you for audio you never received. People behind one office or campus address share that address's run between them — worth knowing before you plan around it.",
    replies: [],
  },
  {
    category: 'Product support',
    title: 'Vocal removal and full stem separation cost the same. Why?',
    body: "HT-Demucs produces all four stems on every pass — there is no shorter route to just the vocal. Vocal removal differs only in what it hands back: the vocal and the mix with the vocal taken out. It is a separate choice because it is a different job to a person, not because it is cheaper, and saying otherwise would be inventing a discount that does not exist.",
    replies: [],
  },
  {
    category: 'Music production',
    title: 'The instrumental is not the sum of drums, bass and other',
    body: "It is the mix with the vocal subtracted. Those are different signals: the four stems do not account for every sample of the input, so adding them together quietly drops whatever the model could not place. Subtracting keeps it. If you are singing over the result, this is the difference between a backing track that sounds like the record and one that sounds slightly hollowed out.",
    replies: [
      "Same reason muting the vocal lane in the mixer is not the same as exporting the instrumental — muting plays three stems, the instrumental is the whole mix minus one.",
    ],
  },
  {
    category: 'General',
    title: 'Which tools need an account, and why those ones?',
    body: "The rule is simple: a tool that hands you a file opens for members. Sensei, SynthPulse, Arrangement GPS, Mix Check and the Splitter all produce something you take away, so they sign you in first. Time & Frequency Sync hands over nothing to keep, so it opens for anyone. The account is free, with no payment details at any point.",
    replies: [],
  },
  {
    category: 'General',
    title: 'What is Loom, and is it ready to use?',
    body: "Loom is the production system behind SubverseLab's own records: a local MCP server that reads your own Ableton projects and library, answers with counts instead of guesses, and writes MIDI, device chains, automation and markers into a running Live session — verifying every write by reading it back. It is 45 tools across seven engines. It is in beta and open while it is being built, the source is public, and it is listed in the MCP Registry. macOS only, and it needs Live 12.4 beta for the extension. Details at subverselab.com/loom.",
    replies: [
      "One command connects it: python3 install.py registers it with Claude Desktop, Claude Code and Antigravity. Live's own step is adding the extension package and restarting.",
    ],
  },
  {
    category: 'Music production',
    title: 'How reliable is automatic key detection, really?',
    body: "Reliable enough to act on when it says so, and honest when it is not. Correlating a chroma against a key profile always returns some answer, so a confidence figure is reported beside it. On a 45-second excerpt of one track it read B minor at 73 per cent; on 90 seconds of the same track it read G major at 11 per cent — G major and B minor share six of seven notes, so the correlation is nearly tied and 11 per cent is the estimator saying it cannot tell. Treat a low number as a question, not an answer.",
    replies: [],
  },
  {
    category: 'Feedback',
    title: 'Tell us what is missing',
    body: "This forum is new and these first topics are ours. What is genuinely useful to say next is your call: what broke, what was confusing, what you expected a tool to do and it did not. Bug reports are more welcome than praise — every tool here has a written guide stating its limits, and the fastest way to improve one is to find where the guide is wrong.",
    replies: [],
  },
].map((topic, index) => ({
  id: `seed-topic-${index + 1}`,
  authorName: author,
  // Spread backwards from today so the list is not one timestamp repeated.
  createdAt: new Date(Date.now() - (index + 1) * 36 * 3600 * 1000).toISOString(),
  replyCount: topic.replies.length,
  ...topic,
  replies: topic.replies.map((body, replyIndex) => ({
    id: `seed-reply-${index + 1}-${replyIndex + 1}`,
    body,
    authorName: author,
    createdAt: new Date(Date.now() - ((index + 1) * 36 - 6) * 3600 * 1000).toISOString(),
  })),
}));
