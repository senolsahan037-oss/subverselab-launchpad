const { google } = require('googleapis');
const { getStorageReadStream } = require('../storage');
const { getYoutubeConfig } = require('../tokens');

async function getAuthorizedClient() {
  const config = await getYoutubeConfig();
  if (!config || !config.refreshToken) {
    throw new Error('YouTube is not configured (missing social_publish_config/youtube doc — run Scripts/social-publish-oauth-setup.js)');
  }
  if (!process.env.YT_CLIENT_ID || !process.env.YT_CLIENT_SECRET) {
    throw new Error('YT_CLIENT_ID / YT_CLIENT_SECRET environment variables are required');
  }
  const oauth2Client = new google.auth.OAuth2(process.env.YT_CLIENT_ID, process.env.YT_CLIENT_SECRET);
  oauth2Client.setCredentials({ refresh_token: config.refreshToken });
  return oauth2Client;
}

// Hard safety check before every upload: confirms the refresh token's
// account actually resolves to the intended channel. Cheap insurance
// against uploading to the wrong channel if this Google account ever ends
// up managing more than one (or the wrong test-user account authorized the
// OAuth flow by mistake). Skipped with a warning if YT_EXPECTED_CHANNEL_ID
// isn't set — but should be set in any real deployment.
async function verifyChannel(youtube) {
  const expected = process.env.YT_EXPECTED_CHANNEL_ID;
  if (!expected) {
    console.warn('YT_EXPECTED_CHANNEL_ID not set — skipping pre-upload channel verification.');
    return;
  }
  const res = await youtube.channels.list({ part: 'id,snippet', mine: true });
  const channel = res.data.items && res.data.items[0];
  if (!channel || channel.id !== expected) {
    throw new Error(
      `Channel verification failed: authorized token resolves to ${channel ? `"${channel.snippet.title}" (${channel.id})` : 'no channel'}, expected ${expected}`
    );
  }
}

// There is no explicit "upload as Short" API flag — YouTube auto-classifies
// Shorts from the clip's own vertical aspect ratio and duration (roughly
// <=60s). That's a property of the source video, set by whatever generates
// it, not something this call controls.
async function publishVideo(draft) {
  const auth = await getAuthorizedClient();
  const youtube = google.youtube({ version: 'v3', auth });

  await verifyChannel(youtube);

  const { title, description, tags, privacyStatus, categoryId } = draft.content.youtube;

  const response = await youtube.videos.insert({
    part: 'snippet,status',
    requestBody: {
      snippet: {
        title,
        description: description || '',
        tags: tags || [],
        categoryId: categoryId || '10' // Music
      },
      status: {
        // Defaults to private even if YT_DEFAULT_PRIVACY_STATUS is unset —
        // going public is always a deliberate separate step, never automatic.
        privacyStatus: privacyStatus || process.env.YT_DEFAULT_PRIVACY_STATUS || 'private'
      }
    },
    media: {
      body: getStorageReadStream(draft.sourcePath)
    }
  });

  const videoId = response.data.id;
  return { videoId, url: `https://youtu.be/${videoId}` };
}

module.exports = { publishVideo };
