// image -> Instagram only. video -> YouTube + Instagram (Reels), together.
// Called once at intake and the result is persisted on the draft — never
// re-derived later, so a future change to this rule doesn't retroactively
// alter items already sitting in the queue.
function routeTargets(mediaType) {
  if (mediaType === 'image') return ['instagram'];
  if (mediaType === 'video') return ['youtube', 'instagram'];
  throw new Error(`Unknown mediaType: ${mediaType}`);
}

module.exports = { routeTargets };
