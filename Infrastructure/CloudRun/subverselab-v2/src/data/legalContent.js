// Privacy Policy and Terms of Use. Plain data, shared by the React pages
// (LegalPage.jsx) and the build-time prerender (scripts/prerender.js, plain
// Node) so a crawler and a visitor read the same words.
//
// Every statement about data below was written from what the code actually
// does; the source of each fact is noted beside it. If the code changes (a new
// form, a new third party, a new collection), change the text in the same
// commit. A block is either a paragraph (string) or a list (array of strings).
export const LEGAL_UPDATED = '24 October 2026';
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
          'Account. When you sign in you create a Firebase Authentication account (Google Firebase): you continue with Google, or you use an e-mail address and a password. With Google sign-in we receive your e-mail address, name and profile picture from Google. With a password account we hold your e-mail address and a password hash managed by Firebase; we never see your password. We use this to identify you and to tie licences and downloads to one person.',
          'Free launch downloads (30 September to 4 October 2026, now closed). For each of the first 1,000 people who got Kubbe or Kaset free we keep the account ID and e-mail address, the licence key issued, the product, the time, and how many times each plugin was downloaded for each platform (first and last time). If a licence was activated from a plugin, we also keep the instance name the plugin sent. We use this to give you your key and your downloads again, and to keep the offer at one claim per person.',
          'Paid orders. Payment is handled by Lemon Squeezy, not by us (see below). Through their webhook we receive and store your order e-mail address, the order ID and number, the product and variant, the order status and date, whether it was refunded, a link to your receipt, and the licence key and its activation count. The checkout link we send you to carries your e-mail address and your account ID, so the order can be attached to the account that clicked Buy. We never see your card number or other payment details.',
          'Tester applications. If you apply to the tester programme we store your e-mail address and account ID, your operating system and version, the DAWs and plugin formats you use, how many years you have been producing, an optional link you give us, your written answer, and the decision. Approved testers can send bug reports; each report stores your e-mail address, the plugin, operating system, DAW and version, the kind of report, and your text.',
          'Problem reports. The report forms on the Download Room and on the storefront store the affected product, your operating system, the e-mail address you type (or "Anonymous" if you leave it empty), and your description. The Download Room form also stores your account ID if you are signed in, your browser\'s user-agent string (the first 300 characters), the page you were on, the step, the DAW you name and the last download message shown to you. You can send these without signing in.',
          'Forum. If you post a topic or a reply we store the text, your account ID and a display name. The display name is your profile name or, if you have none, the part of your e-mail address before the @ sign. Topics and replies are public.',
          'Server logs. Our web server runs on Google Cloud Run in Belgium (europe-west1). Google Cloud Logging records each request with the time, the URL, your IP address and your browser\'s user-agent string. Cloud Logging keeps these for 30 days by default.',
          'Page counts, without cookies. We count page views on our own server without cookies: only the page address, the name of the referring website and, when you press a Buy button, which product and which part of the page it was are counted, with no IP address and no identifier, so they cannot be traced back to you. To tell a first visit from the next pages, the browser tab keeps one flag in its session storage (svl-landed = 1), and a second one once the homepage opening has been shown (svl-intro-seen = 1); they hold no identifier and are gone when you close the tab.',
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
        'From 30 September to 4 October 2026 the first 1,000 people who signed in on subverselab.com/launch and downloaded got Kubbe and Kaset free, one claim per person. The 1,000 were reached on 4 October and the offer is closed; the licences it gave stay valid. Other free products and programmes, such as the free plugins and the tester programme, have their own terms on their pages.',
        'The free licence gives you a personal, non-exclusive, non-transferable right to install and use the plugins you downloaded, for personal and commercial music production, including music you release or sell. You do not owe us anything for the music you make with them.',
        'You may not resell, rent, sublicense, upload or otherwise redistribute the installers or the plugin files, or share your licence with other people. You may not reverse engineer, decompile or disassemble the plugins, except where the law gives you that right and only to the extent it does.',
        'Our plugins and their name, panel artwork and code remain ours. The licence does not transfer ownership of any of it.',
      ],
    },
    {
      id: 'paid',
      h: 'Paid products',
      blocks: [
        'Paid plugins are sold through Lemon Squeezy, which is the merchant of record. Lemon Squeezy takes your payment, charges and handles tax, issues the invoice or receipt, and processes refunds, under its own checkout terms and refund policy, which apply to your purchase. We never see your card details. Prices are shown in US dollars on the product pages. How to ask for a refund and what a refund changes: the Purchases and Refunds page (subverselab.com/refunds).',
        'A paid licence is for one person, to use on that person\'s own computers, for personal and commercial music production, and the restrictions on redistribution and reverse engineering in the section above apply to it as well. If an order is refunded, the licence ends.',
        'Every paid licence includes 2 years of updates, counted from the purchase date. The version you have keeps working forever, also after the 2 years; later updates are included only within them. Each plugin is sold on its own.',
        'Formats and systems differ by product and are listed on each product page (for example, some products are also standalone apps, and some run on Apple Silicon Macs only). Check your DAW and system on that page before buying.',
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

// Purchases and refunds, one page for every paid product (owner 19 Oct: "satın alan herkes için llmlerin okuyabileceği şekilde
// politika olarak eksik olan şey"). Every line is either Lemon Squeezy's own buyer terms (read 19 Oct 2026 at
// https://www.lemonsqueezy.com/buyer-terms) or what our server does (api/server.js webhook, api/credits.js refundOrder,
// api/entitlements.js). The refund window is the owner's (19 Oct: "18 gün iyidir"); Lemon Squeezy still decides each refund case by case.
export const REFUNDS_UPDATED = '19 October 2026';
export const REFUND_DAYS = 18;
export const LS_BUYER_TERMS = 'https://www.lemonsqueezy.com/buyer-terms';
export const REFUNDS = {
  path: '/refunds',
  title: 'Purchases and Refunds | SubverseLab',
  description:
    'How buying a SubverseLab plugin, app or pack works, how to ask for a refund, and what a refund changes: Lemon Squeezy is the merchant of record and decides refunds case by case.',
  h1: 'Purchases and Refunds',
  updated: REFUNDS_UPDATED,
  intro:
    'This page applies to every paid SubverseLab product: plugins, apps, sample packs and preset packs. Free products cost nothing, so there is nothing to refund.',
  sections: [
    {
      id: 'summary',
      h: 'In short',
      blocks: [
        'Lemon Squeezy is the merchant of record: it takes the payment, charges the tax, sends the receipt and issues refunds.',
        `You can ask for a refund within ${REFUND_DAYS} days of the purchase: write to info@subverselab.com with your order number and the e-mail address you paid with. Lemon Squeezy issues the refund and decides each one case by case.`,
        'If a product does not install or run on a system its page lists, write to us first. Most problems are an install step or a setting; if it cannot be fixed, ask for a refund the same way.',
        'A refund ends the licence: the downloads close and the credits that came with the order are taken back.',
      ],
    },
    {
      id: 'buying',
      h: 'Buying',
      blocks: [
        'Every paid product is sold through Lemon Squeezy (lemonsqueezy.com). The price on the product page is in US dollars; tax is added at checkout where it applies, and Lemon Squeezy sends the receipt or invoice by e-mail. We never see your card details.',
        'A launch price is shown with its end date on the product page, and the checkout charges the price it shows.',
        'After you pay, sign in to subverselab.com with the e-mail address you paid with: the product appears on your Account page with its download. If you paid with another address, the order number lets you claim it on the Account page.',
        'Every paid licence includes 2 years of updates from the purchase date. The version you have keeps working after that.',
      ],
    },
    {
      id: 'how',
      h: 'How to ask for a refund',
      blocks: [
        `Ask within ${REFUND_DAYS} days of the purchase date. E-mail info@subverselab.com from any address, with the order number (it is on the Lemon Squeezy receipt) and the e-mail address used at checkout, and say why.`,
        'You can also find every order on Lemon Squeezy\'s own page, https://app.lemonsqueezy.com/my-orders, by signing in there with the checkout e-mail.',
        `Refunds are issued through Lemon Squeezy and, under its buyer terms (${LS_BUYER_TERMS}), are given at its discretion, case by case, and may be refused; Lemon Squeezy refuses a refund where it finds fraud or refund abuse.`,
        'The money goes back to the payment method you used. A partial refund is possible.',
      ],
    },
    {
      id: 'digital',
      h: 'Digital products and the right of withdrawal',
      blocks: [
        'Our products are digital downloads. Under Lemon Squeezy\'s buyer terms, by downloading a product you agree that it is delivered at once, and the right of withdrawal ends when the download starts. Mandatory consumer rights in the country where you live are not affected.',
      ],
    },
    {
      id: 'problems',
      h: 'If something does not work',
      blocks: [
        'Each product page lists the systems and formats it supports. If the product does not install or run on one of them, write to info@subverselab.com with your system, your DAW and what happens. Most problems are an install step or a setting, and we answer.',
        'If technical problems prevent or unreasonably delay delivery, Lemon Squeezy\'s buyer terms give you a replacement or a refund of the price paid.',
      ],
    },
    {
      id: 'after',
      h: 'What a refund changes',
      blocks: [
        'The licence of a refunded order ends, and the product is no longer available to download from your Account page. Refunding an order that holds several plugins closes all of them.',
        'Every purchase adds credits for the browser tools (100 per dollar before tax). A full refund takes back the credits that order added; a partial refund takes back the same share. Credits are never taken below a zero balance.',
      ],
    },
    {
      id: 'tax',
      h: 'Sales tax and VAT',
      blocks: [
        'If you were charged sales tax or VAT and you are registered for it in the country of purchase, Lemon Squeezy may refund the tax amount where the law allows. Ask Lemon Squeezy within 60 days of the purchase, with a valid tax number for your country.',
      ],
    },
    {
      id: 'chargebacks',
      h: 'Chargebacks',
      blocks: [
        'Lemon Squeezy\'s buyer terms ask you to contact Lemon Squeezy before you open a chargeback or a dispute with your bank or card issuer. Writing to us first is usually the fastest way to get a problem solved.',
      ],
    },
    {
      id: 'contact',
      h: 'Contact',
      blocks: [
        'Orders, refunds and licences: info@subverselab.com. The Terms of Use cover the licence itself.',
      ],
    },
  ],
};

export const LEGAL_PAGES = [PRIVACY, TERMS, REFUNDS];
