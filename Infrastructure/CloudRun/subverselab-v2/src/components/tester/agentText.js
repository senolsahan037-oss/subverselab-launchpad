// The text a tester's reading / writing assistant works with. Pure functions (no React) so the tests can import them.
//   buildCopyText(build)       a clean Markdown block: build, brief, tasks with stable refs T1, T2…, the tester's current results,
//                              and a fixed "how to answer" section.
//   parseResults(text, tasks)  reads the assistant's answer back: one line per task `T1 | done | note` plus `SUMMARY | text`.
// The refs are the position in the build's task list, the same T1… the server accepts on /api/testers/agent/builds/result.

const STATUS_WORD = { todo: 'not-started', done: 'done', problem: 'problem' };
export const HOW_TO_ANSWER = [
  '## How to answer',
  'Reply with one line per task, exactly in this format:',
  '',
  'T1 | done | what you heard and saw, in plain words',
  '',
  'The status is one of: done, problem, not-started. Use the task numbers above (T1, T2, ...).',
  'Then one last line with the overall result of the build:',
  '',
  'SUMMARY | your overall results',
  '',
  'Plain words are fine. Do not add anything else.',
];

export function buildCopyText(build) {
  const b = build.brief || {};
  const out = [`# ${build.name} v${build.version} (${build.platform === 'mac' ? 'macOS' : 'Windows'})`, ''];
  if (build.notes) out.push(build.notes, '');
  const section = (title, body) => { if (body) out.push(`## ${title}`, body, ''); };
  const list = (title, items) => { if (items?.length) out.push(`## ${title}`, ...items.map((l) => `- ${l}`), ''); };
  section('What this plug-in is for', b.goal);
  section('Reference', b.reference);
  list('What already works well', b.strengths);
  list('What we know is not right yet', b.knownIssues);
  section('What we want to learn from you', b.focus);
  if (build.tasks?.length) {
    out.push('## Tasks');
    build.tasks.forEach((t, i) => {
      const mine = build.result?.tasks?.[t.id];
      out.push(`T${i + 1}. ${t.title}${t.detail ? `: ${t.detail}` : ''}`);
      out.push(`   Current: ${mine ? `${STATUS_WORD[mine.status] || mine.status}${mine.note ? ` | ${mine.note}` : ''}` : 'not-started'}`);
    });
    out.push('');
  }
  if (build.result?.summary) out.push('## Current overall result', build.result.summary, '');
  out.push(...HOW_TO_ANSWER);
  return out.join('\n');
}

// Everything on the Test area page in one block, one section per build (each answered on its own).
export function allBuildsCopyText(builds) {
  return builds.map(buildCopyText).join('\n\n---\n\n');
}

const STATUS_RE = /^[`*_\s]*(done|problem(?:\s*found)?|not[\s_-]*started|to[\s-]?do)[`*_\s]*(?:[|:\u2013\u2014-]\s*([\s\S]*))?$/i;
const statusOf = (word) => (/^done$/i.test(word) ? 'done' : /^problem/i.test(word) ? 'problem' : 'todo');
const LINE = /^\s*(?:[-*+>]\s+|\d+[.)]\s+)?[`*_\s]*(T\s*\d+|SUMMARY)[`*_\s]*[|:]\s*(.*)$/i;

/**
 * → {rows: [{ref, id, status, note}], unknown: [refs not on the build], bad: [lines that look like answers but cannot be read],
 *    summary: string|null}. Tolerant of case, extra spaces, markdown bullets / bold / backticks, and ':' or '|' as separators.
 * `tasks` is the build's task list ([{id, ...}]); a ref T3 is its third task.
 */
export function parseResults(text, tasks = []) {
  const rows = []; const unknown = []; const bad = []; const summary = [];
  for (const raw of String(text || '').split(/\r?\n/)) {
    if (!raw.trim()) continue;
    const m = raw.match(LINE);
    if (!m) { if (/^\s*[-*+]?\s*[`*_]*T\s*\d+/i.test(raw)) bad.push(raw.trim()); continue; }
    const key = m[1].replace(/\s+/g, '').toUpperCase();
    const rest = m[2].replace(/[`*_]+$/g, '').trim();
    if (key === 'SUMMARY') { summary.push(rest); continue; }
    const sm = rest.match(STATUS_RE);
    if (!sm) { bad.push(raw.trim()); continue; }
    const status = statusOf(sm[1]);
    const index = Number(key.slice(1)) - 1;
    const task = tasks[index];
    if (!task) { unknown.push(key); continue; }
    rows.push({ ref: key, id: task.id, status, note: (sm[2] || '').trim() });
  }
  return { rows, unknown, bad, summary: summary.length ? summary.join('\n') : null };
}
