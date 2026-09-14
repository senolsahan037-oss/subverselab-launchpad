const allowedDomains = ['*.run.app', 'subverselab.com', '*.subverselab.com', 'youtube.com', 'youtu.be'];

function isSafeDomain(hostname) {
  for (let d of allowedDomains) {
    d = d.trim();
    if (d.startsWith('*.')) {
      const base = d.substring(1); // e.g. '.run.app'
      if (hostname.endsWith(base) || hostname === base.substring(1)) {
        return true;
      }
    } else {
      if (hostname === d) {
        return true;
      }
    }
  }
  return false;
}

const tests = [
  'evilsubverselab.com',
  'subverselab.com.evil.com',
  'run.app.evil.com',
  'fake-run.app.example.com',
  'fake-run.app',
  'example-service.run.app',
  'subverselab.com',
  'www.subverselab.com',
  'tool.subverselab.com'
];

tests.forEach(t => console.log(t, isSafeDomain(t)));
