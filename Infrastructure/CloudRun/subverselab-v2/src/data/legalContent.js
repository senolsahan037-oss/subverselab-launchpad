// Privacy Policy and Terms of Use. Plain data, shared by the React pages
// (LegalPage.jsx) and the build-time prerender (scripts/prerender.js, plain
// Node) so a crawler and a visitor read the same words.
//
// Every statement about data below was written from what the code actually
// does; the source of each fact is noted beside it. If the code changes (a new
// form, a new third party, a new collection), change the text in the same
// commit. A block is either a paragraph (string) or a list (array of strings).
export const LEGAL_UPDATED = '5 October 2026';
export const LEGAL_EMAIL = 'info@subverselab.com';

export const PRIVACY = {
  path: '/privacy',
  title: 'Privacy Policy | SubverseLab',
  description:
    'What SubverseLab collects when you sign in, download a plugin, buy through Lemon Squeezy or send a report, why, who else sees it, and how to have it corrected or deleted.',
  h1: 'Privacy Policy',
  intro:
    'This page explains what personal data subverselab.com collects, why, who else handles it, and what you can ask us to do with it. It is written to match what the site actually does.',
  sections: [
    {
      id: 'who',
      h: 'Who is responsible',
      blocks: [
        'The data controller (KVKK) and controller (GDPR) is Şenol Şahan, trading as SubverseLab, Gaziantep, Türkiye. Contact for everything on this page: info@subverselab.com.',
      ],
    },
    {
      id: 'collect',
      h: 'What we collect, and why',
      blocks: [
        'You can read the site, the guides and the plugin pages without an account. We collect personal data only in the situations below.',
        [
          'Account. When you sign in you create a Firebase Authentication account (Google Firebase) with an e-mail address and a password, or you continue with Google. With a password sign-up we hold your e-mail address and a password hash managed by Firebase; we never see your password. With Google sign-in we receive your e-mail address, name and profile picture from Google. We use this to identify you, to send the verification and password-reset e-mails, and to tie licences and downloads to one person.',
          'Free launch downloads. When you download Kubbe or Kaset from the Download Room we record your account ID and e-mail address, the licence key issued to you, the product, the time, and how many times you downloaded each plugin for each platform (first and last time). If you activate a licence from a plugin, we also store the instance name your plugin sends. We use this to count each producer once while the first 1,000 last, to give you your key again, and to show how many are left.',
          'Paid orders. Payment is handled by Lemon Squeezy, not by us (see below). Through their webhook we receive and store your order e-mail address, the order ID and number, the product and variant, the order status and date, whether it was refunded, a link to your receipt, and the licence key and its activation count. The checkout link we send you to carries your e-mail address and your account ID, so the order can be attached to the account that clicked Buy. We never see your card number or other payment details.',
          'Tester applications. If you apply to the tester programme we store your e-mail address and account ID, your operating system and version, the DAWs and plugin formats you use, how many years you have been producing, an optional link you give us, your written answer, and the decision. Approved testers can send bug reports; each report stores your e-mail address, the plugin, operating system, DAW and version, the kind of report, and your text.',
          'Problem reports. The report forms on the Download Room and on the storefront store the affected product, your operating system, the e-mail address you type (or "Anonymous" if you leave it empty), and your description. The Download Room form also stores your account ID if you are signed in, your browser\'s user-agent string (the first 300 characters), the page you were on, the step, the DAW you name and the last download message shown to you. You can send these without signing in.',
          'Forum. If you post a topic or a reply we store the text, your account ID and a display name. The display name is your profile name or, if you have none, the part of your e-mail address before the @ sign. Topics and replies are public.',
          'Server logs. Our web server runs on Google Cloud Run in Belgium (europe-west1). Google Cloud Logging records each request with the time, the URL, your IP address and your browser\'s user-agent string. Cloud Logging keeps these for 30 days by default.',
          'Page counts, without cookies. We count page views on our own server without cookies: only the page address and the name of the referring website are counted, with no IP address and no identifier, so they cannot be traced back to you. To tell a first visit from the next pages, the browser tab keeps one flag in its session storage (svl-landed = 1); it holds no identifier and is gone when you close the tab.',
          'Usage statistics, only if you accept. Google Analytics 4 (through Firebase) is switched off until you press "Accept analytics" in the banner at the bottom of the page; before that nothing from it is loaded or stored. If you accept, it measures visits and pages using identifiers stored in your browser, and reports to us in aggregate. It records your approximate location (country, region and city, worked out from your IP address; Google Analytics does not store the IP address itself) and device data (device type, operating system, browser and screen size). Google signals is off, so there are no advertising features, no ad personalisation and no cross-device tracking. We use it to see which pages are read. You can decline, or change your mind at any time with "Cookie settings" in the footer; declining stops collection and removes the Google Analytics cookies.',
        ],
      ],
    },
    {
      id: 'storage',
      h: 'Cookies and browser storage',
      blocks: [
        'The site stores the following in your browser:',
        [
          'Firebase Authentication keeps you signed in using the browser\'s local storage.',
          'Your light or dark theme choice, if you made one (local storage).',
          'An unsent forum topic draft, so you do not lose it (local storage; removed once the topic is published).',
          'A flag in session storage that a checkout was opened in this tab, so the Download Room knows to wait for your order.',
          'Your cookie choice, "granted" or "denied" (local storage), so the banner does not ask again.',
          'Google Analytics identifiers (cookies or local storage, set by Google), only after you accept analytics.',
        ],
        'We do not use advertising cookies, ad pixels or ad networks, and the site loads no advertising scripts. You can clear or block any of the above in your browser; declining or blocking Google Analytics does not affect how the site works.',
      ],
    },
    {
      id: 'others',
      h: 'Who else handles your data',
      blocks: [
        'We do not sell your data, rent it out or share it for advertising. The following providers process data for us or are loaded by the site:',
        [
          'Google (Firebase Authentication, Firestore database, Cloud Run hosting, Cloud Logging, Cloud Storage for the installers, Google Analytics, Google Fonts). Google Fonts serves the site\'s typefaces from Google\'s servers, so your IP address reaches Google when a page loads.',
          'Gmail SMTP, which Firebase Authentication uses to send the password-reset e-mails.',
          'Lemon Squeezy, the merchant of record for paid products. It collects your payment details and billing information under its own privacy policy, handles payment, tax, invoices and refunds, and tells us about your order.',
          'YouTube. Some plugin pages embed demo videos from youtube-nocookie.com, and the storefront embeds a YouTube playlist from youtube.com. YouTube may set cookies and receives your IP address when the player loads.',
        ],
        'These providers are based in or operate from countries outside Türkiye and the European Economic Area, including the United States, so your data may be transferred abroad. We rely on the safeguards those providers offer for such transfers. We also disclose data where the law or a competent authority requires it.',
      ],
    },
    {
      id: 'basis',
      h: 'Legal grounds',
      blocks: [
        'We process your data to perform our agreement with you (your account, your downloads, your licence, your order), on our legitimate interest in running, securing and improving the site and answering your reports, to meet legal obligations, and, where the law requires it, on your consent (Google Analytics runs only on your consent). You may withdraw consent at any time without affecting what was done before.',
      ],
    },
    {
      id: 'keep',
      h: 'How long we keep it',
      blocks: [
        'Each kind of data has its own period:',
        [
          'Account, free launch claim, download counters and licences: while your account exists. They are deleted when you delete your account. The only thing kept is a one-way hash of your e-mail address (it cannot be turned back into the address), so that the free launch licence stays one per person and the public count of claimed licences does not go down.',
          'Paid orders: Lemon Squeezy, the merchant of record, keeps the invoices under its own policy. We keep the order ID, product, status, order date and a hashed e-mail address for as long as the licence exists, to handle refunds and re-downloads and to show how long your updates run. When you delete your account we delete the rest of the order record (your e-mail address, receipt link and licence key) and keep only those fields.',
          'Problem reports: 12 months after we mark them resolved or move them to our archive, then they are deleted automatically. A report that is not resolved yet is kept until it is.',
          'Tester applications and tester reports: until the tester programme ends, and for 12 months after that, or until you delete your account, whichever comes first.',
          'Forum topics and replies: until you delete them or delete your account; then they are removed.',
          'Server request logs: 30 days (the Google Cloud Logging default).',
          'Analytics: only with your consent. Google Analytics keeps event data for 2 months (the retention period we set); older data is deleted by Google.',
          'Your cookie choice: in your browser until you clear it.',
        ],
        'Lemon Squeezy and Google keep their own records under their own policies. Where the law requires us to keep something longer, or we need it to defend a legal claim, we keep only that.',
      ],
    },
    {
      id: 'rights',
      h: 'Your rights (KVKK and GDPR)',
      blocks: [
        'Under Article 11 of the Turkish Personal Data Protection Law No. 6698 (KVKK) and under the GDPR, you may ask us to:',
        [
          'confirm whether we process your data and give you a copy (access);',
          'correct data that is wrong or incomplete (correction);',
          'delete your data, including your account, licence and download records, reports and tester application (deletion): sign in, open your Account page and press "Delete my account";',
          'stop or restrict processing that rests on our legitimate interest (objection);',
          'give you your data in a common machine-readable format (portability);',
          'tell us that you withdraw a consent you gave.',
        ],
        'Deletion you can do yourself: on your Account page, "Delete my account" removes your account and the personal data described under "How long we keep it" straight away, apart from the hashed e-mail marker explained there. For anything else (access, correction, portability, objection, withdrawing consent), e-mail info@subverselab.com from the address on your account, saying what you want. We may ask you to confirm that the account is yours. We answer within 30 days. Forum posts can be deleted by their author. If you are not satisfied with our answer you can complain to the Turkish Personal Data Protection Board (KVKK Kurulu) or to the data protection authority where you live.',
      ],
    },
    {
      id: 'children',
      h: 'Children',
      blocks: [
        'SubverseLab is not directed at anyone under 16, and accounts are for people aged 16 or over. If you believe a child has given us personal data, e-mail us and we will delete it.',
      ],
    },
    {
      id: 'security',
      h: 'Security',
      blocks: [
        'The site is served over HTTPS only. Licence, order and tester records can be read only by our server, and a signed-in person can read only the licence record for their own verified e-mail address. No system is perfectly secure, and we cannot promise it; if a breach affects you we will tell you and the authorities as the law requires.',
      ],
    },
    {
      id: 'changes',
      h: 'Changes to this policy',
      blocks: [
        `We will change this page when what the site does with data changes. The date at the top shows the latest version. Last updated: ${LEGAL_UPDATED}.`,
      ],
    },
  ],
};

export const TERMS = {
  path: '/terms',
  title: 'Terms of Use | SubverseLab',
  description:
    'The terms for using subverselab.com and SubverseLab plugins: accounts, the free launch licence, paid products sold through Lemon Squeezy, warranty, liability and governing law.',
  h1: 'Terms of Use',
  intro:
    'These terms apply to subverselab.com and to the SubverseLab plugins you download from it. By creating an account or downloading a plugin you agree to them.',
  sections: [
    {
      id: 'who',
      h: 'Who we are',
      blocks: [
        'The site and the plugins are run by Şenol Şahan, trading as SubverseLab, Gaziantep, Türkiye ("we", "us"). Contact: info@subverselab.com. How we handle personal data is described in the Privacy Policy.',
      ],
    },
    {
      id: 'accounts',
      h: 'Accounts',
      blocks: [
        [
          'You must be 16 or older.',
          'Use an e-mail address that is really yours and keep your sign-in details to yourself. Use the address that can receive mail; an order placed under another address is claimed with its order number.',
          'One person, one account, and one free launch claim per person. Making several accounts or using other people\'s e-mail addresses to claim more than one is not allowed.',
          'We may suspend or close an account, and withdraw its licence, if it is used abusively, to get around the limits above, to attack the site, or to share or resell the plugins. We will tell you why when we can.',
          'You can delete your account yourself at any time with "Delete my account" on your Account page (see the Privacy Policy for what is kept).',
        ],
      ],
    },
    {
      id: 'free',
      h: 'The free launch licence',
      blocks: [
        'The first 1,000 people who sign in on subverselab.com/launch and download get Kubbe and Kaset free, while the 1,000 last. One producer is counted once. We may change or close the offer once the 1,000 are taken. Other free programmes, such as the tester programme, have their own rules, which are shown on their pages.',
        'The free licence gives you a personal, non-exclusive, non-transferable right to install and use the plugins you downloaded, for personal and commercial music production, including music you release or sell. You do not owe us anything for the music you make with them.',
        'You may not resell, rent, sublicense, upload or otherwise redistribute the installers or the plugin files, or share your licence with other people. You may not reverse engineer, decompile or disassemble the plugins, except where the law gives you that right and only to the extent it does.',
        'Our plugins and their name, panel artwork and code remain ours. The licence does not transfer ownership of any of it.',
      ],
    },
    {
      id: 'paid',
      h: 'Paid products',
      blocks: [
        'Paid plugins and the plugin family are sold through Lemon Squeezy, which is the merchant of record. Lemon Squeezy takes your payment, charges and handles tax, issues the invoice or receipt, and processes refunds, under its own checkout terms and refund policy, which apply to your purchase. We never see your card details. Prices are shown in US dollars on the product pages.',
        'A paid licence is for one person, to use on that person\'s own computers, for personal and commercial music production, and the restrictions on redistribution and reverse engineering in the section above apply to it as well. If an order is refunded, the licence ends.',
        'Every paid licence includes 2 years of updates, counted from the purchase date. The version you have keeps working forever, also after the 2 years; later updates are included only within them. Each plugin can be bought on its own or in the plugin family.',
        'Formats and systems are listed on each plugin page: VST3 and AU on macOS (Apple Silicon and Intel), and VST3 on Windows; MIHENK is also a standalone app on both. Check your DAW and system before buying.',
      ],
    },
    {
      id: 'warranty',
      h: 'No warranty',
      blocks: [
        'The site and the plugins are provided "as is" and "as available". We work to make them correct and stable and we publish measured results, but we do not promise that they are free of errors, that they work in every DAW or on every system, or that the site is always available. To the extent the law allows, we give no warranty of any kind, express or implied, including fitness for a particular purpose. Keep backups of your projects and listen to your work before you release it.',
      ],
    },
    {
      id: 'liability',
      h: 'Limit of liability',
      blocks: [
        'To the extent the law allows, our total liability to you for anything arising from the site or the plugins is limited to the amount you paid us for the product concerned (through Lemon Squeezy), or to nothing for a product you got free. We are not liable for lost profits, lost data, lost sessions or indirect damage. Nothing in these terms limits liability that cannot be limited by law, for example for intent or gross negligence, and nothing removes the rights you have as a consumer.',
      ],
    },
    {
      id: 'content',
      h: 'Your content: forum and reports',
      blocks: [
        'You own what you write in the forum and in problem or tester reports. By posting it you give us a free, worldwide, non-exclusive right to store and display it on the site, and, for reports, to use it to fix and improve our products. Forum posts are public. Write only what you are entitled to write, nothing unlawful, abusive or misleading, and no one else\'s personal data. We may remove content that breaks these terms.',
      ],
    },
    {
      id: 'changes',
      h: 'Changes',
      blocks: [
        `We may update these terms; the new version applies from the date shown. If you keep using the site after that, you accept the new version. Changes do not take away a licence you already hold. Last updated: ${LEGAL_UPDATED}.`,
      ],
    },
    {
      id: 'law',
      h: 'Governing law and disputes',
      blocks: [
        'These terms are governed by the laws of the Republic of Türkiye. The courts and enforcement offices of Gaziantep have jurisdiction, without taking away any mandatory consumer rights you have in your own country, or your right to bring a claim in the courts that are competent for consumers where you live.',
      ],
    },
    {
      id: 'contact',
      h: 'Contact',
      blocks: [
        'Questions about these terms, a licence, or your data: info@subverselab.com.',
      ],
    },
  ],
};

export const LEGAL_PAGES = [PRIVACY, TERMS];
