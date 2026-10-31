import { UPDATE_YEARS, UPDATES_LINE } from './plugins.js';

// The "Learn" sections: one for the tester panel (/testers, approved view) and one for every customer on /account.
// Plain data so the pages only draw it and the tests can read it. The update promise is never typed here as a number:
// it comes from UPDATE_YEARS / UPDATES_LINE in plugins.js, like everywhere else on the site.

// The vision, in our own words (owner 2026-10-14). The long form greets testers; the short line sits in the customer Learn.
export const VISION = 'We care deeply about how you work: your habits, your sessions, what feels right under your hands. '
  + 'The people who use our plug-ins shape how we develop them, and that understanding sits at the centre of our vision. '
  + 'Tell us what you reach for, what gets in your way and what is missing, and we will build with that in mind.';
export const VISION_SHORT = 'We build SubverseLab around the way you work: the people who use our plug-ins shape how we develop them.';

// Each item: {id, title, body: [paragraphs]}. Tester items that need the accepted agreement are drawn by the page.
export const TESTER_LEARN = [
  { id: 'how', title: 'How the tester programme works', body: [
    'There are two kinds of things here. Released products are the ones anyone can buy; test builds are early versions we send only to the testers they are assigned to.',
    'Everything you do is on this website: downloads, test builds, your results, your reports and your messages to us. We do not use e-mail for it.',
  ] },
  { id: 'released', title: 'Released products: yours to explore', body: [
    'Every released product is free for you to download and use as you like. There is no reporting obligation and there are no tasks for released products.',
    'If you want to tell us something about one, send a report; it is always optional.',
  ] },
  { id: 'builds', title: 'Test builds, manuals and tasks', body: [
    'When we open a test build to you it appears in the Test area together with its user manual or manuals.',
    'A build can come with a few tasks: specific things we ask you to try before release. Mark each one not started, done or problem found, add a note, and write what you found overall.',
  ] },
  { id: 'words', title: 'Writing reports and results', body: [
    'Write in plain words and in plug-in terms. You can describe what you hear and see in words; screenshots are welcome but not required.',
    'Say what you did, what you expected and what you got, and name your system and DAW.',
  ] },
  { id: 'messages', title: 'Messages', body: [
    'Messages is a thread between you and SubverseLab inside this panel. We answer there, and you will see a count when something is new.',
    'To ask for a change to this panel or to your permissions on the website, or to make a suggestion about the panel itself, choose Panel and permissions request when you write a report or message.',
  ] },
  { id: 'assistant', title: 'Using an assistant', body: [
    'You may use a reading or writing assistant (ChatGPT or another agent) for your reports and results. On each test build, Copy for your assistant gives it the brief and the tasks; Paste results from your assistant reads its answer back, shows you what will be saved and saves it only when you say so.',
    'If your assistant can call web APIs, you can give it a personal agent key instead (below). The key lets it read your test tasks and write results, reports and messages, and nothing else.',
  ] },
  { id: 'credits', title: 'Monthly tool credits', body: [
    'Every calendar month you get 2,000 tool credits for our online tools. Credits you do not use do not carry over to the next month. Credits you bought are kept apart and used after these.',
  ] },
];

// The Help block at the bottom of /account (owner 28 Oct: "sayfanın altındaki bilgiler farklı şekillerde karışık beyan ediliyor,
// buraya bir düzen getirelim"): each fact said once, here, and nowhere else on the page.
export const CUSTOMER_LEARN = [
  { id: 'updates', title: 'Updates', body: [
    `Buying a plug-in gives you all of its updates for ${UPDATE_YEARS} years from the purchase date; the version you have keeps working forever.`,
  ] },
  { id: 'downloads', title: 'Downloads', body: [
    'Downloads are tied to this sign-in and work on any computer you use.',
  ] },
  { id: 'install', title: 'Installing', body: [
    'Install the plug-in, then rescan plug-ins in your DAW. VST3 goes in /Library/Audio/Plug-Ins/VST3 on macOS or C:\\Program Files\\Common Files\\VST3 on Windows; AU goes in /Library/Audio/Plug-Ins/Components.',
  ] },
  { id: 'vision', title: 'How we work', body: [VISION_SHORT] },
];
