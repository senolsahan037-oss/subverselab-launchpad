# Social Publish Service

Publishes AI-generated content to SubverseLab's YouTube and Instagram channels. Routing: **image → Instagram only**. **video → YouTube + Instagram (Reels), together.**

Content sits as a `draft` in Firestore until manually approved or a `scheduledFor` time is reached — Instagram's Graph API has no real draft concept (an unpublished media container just expires after 24h and is never visible in the app), so that state lives entirely in our own database.

Full design: see the plan this was built from, or `Rules/06_DEPLOYMENT.md` / `Rules/08_DEPLOYMENT_REGISTRY.md` for the deployed shape.

## Local development

```bash
cd Infrastructure/SocialPublish
npm install
FIREBASE_STORAGE_BUCKET=project-62238635-aae4-41f4-880.firebasestorage.app \
GOOGLE_CLOUD_PROJECT=project-62238635-aae4-41f4-880 \
NODE_ENV=development \
USE_STUB_PUBLISHERS=true \
DEV_BYPASS_ADMIN_AUTH=true \
node server.js
```

`DEV_BYPASS_ADMIN_AUTH` only takes effect when `NODE_ENV=development` — it never activates on a real Cloud Run deploy. `USE_STUB_PUBLISHERS=true` routes publish calls to fake in-memory publishers instead of the real Instagram/YouTube APIs, so the draft/approve/schedule state machine can be exercised without any platform credentials.

This talks to the **real** Firestore/Storage in `project-62238635-aae4-41f4-880` via your local `gcloud auth application-default login` credentials — there's no local emulator wired up. Clean up any test drafts you create (`social_publish_queue` collection) when done.

## Manual external setup (required once, before real publishing works)

Neither of these can be completed by an agent — both require signing into a console with your own account.

### Google Cloud / YouTube

1. Enable **YouTube Data API v3** on project `project-62238635-aae4-41f4-880`.
2. Configure the OAuth consent screen (External, Testing mode is enough) — add your own Google account as a test user.
3. Create an OAuth 2.0 Client ID, type **Desktop app** → note the client ID + secret.
4. If your account manages more than one YouTube channel, confirm which one is the real publish target.
5. Copy `Scripts/social-publish-oauth-config.example.json` to `Scripts/.social-publish-oauth-config.json`, fill in the client ID/secret, then run:
   ```bash
   node Scripts/social-publish-oauth-setup.js youtube
   ```
   Follow the printed URL, sign in, and it will print a refresh token. Store it in Firestore at `social_publish_config/youtube` as `{ "refreshToken": "<value>" }` (or set `"writeToFirestore": true` in the config file to have the script write it for you).

### Meta / Instagram

1. Confirm the Instagram account is Business/Creator and linked to a Facebook Page.
2. developers.facebook.com → create a **Business**-type Meta App → add the "Instagram Graph API" product.
3. Graph API Explorer → generate a short-lived User token with `instagram_basic`, `instagram_content_publish`, `pages_show_list`, `pages_read_engagement` → exchange it for a long-lived (60-day) token → fetch the linked Page's access token.
4. `GET /{page-id}?fields=instagram_business_account` for the IG Business Account ID.
5. Try publishing while the app is still in Development mode first — that already works for the app's own admins/testers. Only pursue Meta App Review if the Graph API actually rejects with a permission error.
6. Run:
   ```bash
   node Scripts/social-publish-oauth-setup.js instagram
   ```
   and paste in the Page token, IG Business Account ID, and Page ID when prompted. It verifies the token resolves before printing the value to store at `social_publish_config/instagram`.

## Deploying

```bash
cp env.yaml.example env.yaml   # fill in real values, never commit this file
gcloud run deploy social-publish --source . --project project-62238635-aae4-41f4-880 --region europe-west1 --env-vars-file env.yaml --allow-unauthenticated
```

After deploying, record the assigned URL in `Rules/08_DEPLOYMENT_REGISTRY.md` and confirm `GET /health` returns 200.

Then run `node Scripts/sync-agent-rules.js` from the repo root to generate this service's `.agents/rules/` mirror (Platform Invariant #9), and `node Scripts/verify-agent-rules-sync.js` to confirm it matches.
