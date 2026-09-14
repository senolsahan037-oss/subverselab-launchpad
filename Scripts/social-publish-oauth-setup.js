#!/usr/bin/env node
/**
 * One-time local helper for the Social Publish service
 * (Infrastructure/SocialPublish). Run this on a developer machine, never in
 * Cloud Run, after completing the manual Google Cloud / Meta Developer setup
 * steps documented in Infrastructure/SocialPublish/README.md.
 *
 * It never writes tokens to a log file — terminal output only.
 *
 * Usage:
 *   node Scripts/social-publish-oauth-setup.js youtube
 *   node Scripts/social-publish-oauth-setup.js instagram
 *
 * Config is read from Scripts/.social-publish-oauth-config.json (gitignored,
 * create it from Scripts/social-publish-oauth-config.example.json), matching
 * this repo's convention of JSON-file-driven config for one-off scripts
 * rather than env vars.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const { URL } = require('url');
const readline = require('readline');

const REPO_ROOT = path.resolve(__dirname, '..');
const CONFIG_PATH = path.join(__dirname, '.social-publish-oauth-config.json');

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error(`Missing config file: ${path.relative(REPO_ROOT, CONFIG_PATH)}`);
    console.error('Copy Scripts/social-publish-oauth-config.example.json to that path and fill it in first.');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (answer) => {
    rl.close();
    resolve(answer.trim());
  }));
}

async function runYoutubeFlow(config) {
  if (!config.youtube || !config.youtube.clientId || !config.youtube.clientSecret) {
    console.error('Config is missing youtube.clientId / youtube.clientSecret.');
    process.exit(1);
  }
  const { google } = require('googleapis');
  const port = config.youtube.redirectPort || 8765;
  const redirectUri = `http://localhost:${port}/oauth2callback`;

  const oauth2Client = new google.auth.OAuth2(config.youtube.clientId, config.youtube.clientSecret, redirectUri);
  // Broad "youtube" scope (not just .upload) so publishVideo() can run a
  // pre-upload channel-identity check (youtube.channels.list) before every
  // upload — cheap insurance against uploading to the wrong channel if this
  // Google account ever manages more than one.
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/youtube']
  });

  console.log('\nOpen this URL in a browser signed into the YouTube channel you want to publish to:\n');
  console.log(authUrl);
  console.log(`\nWaiting for the OAuth redirect on ${redirectUri} ...`);

  const code = await new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, `http://localhost:${port}`);
      const c = url.searchParams.get('code');
      if (c) {
        res.end('Authorized. You can close this tab and return to the terminal.');
        server.close();
        resolve(c);
      } else {
        res.end('No code received.');
      }
    });
    server.listen(port);
    server.on('error', reject);
  });

  const { tokens } = await oauth2Client.getToken(code);
  if (!tokens.refresh_token) {
    console.error('\nNo refresh_token returned. This happens if this Google account already granted');
    console.error('consent before — revoke access at https://myaccount.google.com/permissions and retry.');
    process.exit(1);
  }

  console.log('\nRefresh token obtained:\n');
  console.log(tokens.refresh_token);
  console.log('\nStore it in Firestore at social_publish_config/youtube as: { "refreshToken": "<above>" }');

  if (config.writeToFirestore) {
    await writeToFirestore('youtube', { refreshToken: tokens.refresh_token, updatedAt: new Date().toISOString() });
  }
}

async function runInstagramFlow(config) {
  console.log('\nMeta\'s flow is mostly manual browser steps (Graph API Explorer) — see');
  console.log('Infrastructure/SocialPublish/README.md for the full checklist.\n');
  const pageToken = await prompt('Paste the long-lived Page access token: ');
  const igBusinessAccountId = await prompt('Paste the Instagram Business Account ID: ');
  const pageId = await prompt('Paste the Facebook Page ID: ');

  console.log('\nVerifying the token resolves...');
  const res = await fetch(`https://graph.facebook.com/v19.0/${igBusinessAccountId}?fields=username&access_token=${encodeURIComponent(pageToken)}`);
  const json = await res.json();
  if (!res.ok || json.error) {
    console.error(`\nVerification failed: ${json.error ? json.error.message : res.status}`);
    process.exit(1);
  }
  console.log(`\nVerified — resolves to @${json.username}`);

  const value = { longLivedPageToken: pageToken, igBusinessAccountId, pageId, tokenObtainedAt: new Date().toISOString() };
  console.log('\nStore this in Firestore at social_publish_config/instagram:');
  console.log(JSON.stringify(value, null, 2));

  if (config.writeToFirestore) {
    await writeToFirestore('instagram', value);
  }
}

async function writeToFirestore(docId, data) {
  try {
    const admin = require('firebase-admin');
    if (!admin.apps.length) {
      admin.initializeApp({ credential: admin.credential.applicationDefault() });
    }
    await admin.firestore().collection('social_publish_config').doc(docId).set(data, { merge: true });
    console.log(`\nWritten to Firestore: social_publish_config/${docId}`);
  } catch (err) {
    console.error(`\nCould not write to Firestore automatically (${err.message}). Enter it manually in the Firestore console instead.`);
  }
}

async function main() {
  const platform = process.argv[2];
  if (platform !== 'youtube' && platform !== 'instagram') {
    console.error('Usage: node Scripts/social-publish-oauth-setup.js <youtube|instagram>');
    process.exit(1);
  }
  const config = loadConfig();
  if (platform === 'youtube') await runYoutubeFlow(config);
  else await runInstagramFlow(config);
}

main();
