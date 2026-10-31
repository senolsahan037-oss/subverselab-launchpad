import json, sys, subprocess, urllib.request
P = 'project-62238635-aae4-41f4-880'
src = open(sys.argv[1]).read()
T = '2026-10-17T20:00:00Z'
D = '/databases/(default)/documents/'
def case(name, expect, method, path, auth=None, data=None, existing=None):
    req = {'path': D + path, 'method': method, 'time': T}
    if auth: req['auth'] = {'uid': auth, 'token': {'email': auth + '@example.com', 'email_verified': True}}
    if data is not None: req['resource'] = {'data': data}
    c = {'expectation': expect, 'request': req}
    if existing is not None: c['resource'] = {'data': existing}
    return name, c
rep = {'productId': 'download-room', 'productTitle': 'Download Room · SEDA', 'os': 'macOS', 'userEmail': 'a@example.com',
       'description': '[Step: x]\nIt fails', 'source': 'download-room', 'uid': None, 'userAgent': 'UA', 'page': 'account',  # the test API turns a leading-slash string into a path; live it is the string /account
       'createdAt': '2026-10-17T19:00:00.000Z', 'status': 'Pending'}
store = {k: rep[k] for k in ['productId', 'productTitle', 'os', 'userEmail', 'description', 'createdAt', 'status']}
topic = {'title': 'Hi', 'body': 'Body', 'category': 'Feedback', 'authorId': 'alice', 'authorName': 'alice', 'createdAt': T}
reply = {'body': 'Reply', 'authorId': 'alice', 'authorName': 'alice', 'createdAt': T}
cases = [
  case('F1 other user reads users/bob', 'DENY', 'get', 'users/bob', 'alice'),
  case('F1 owner reads own users doc', 'DENY', 'get', 'users/alice', 'alice'),
  case('F1 list users', 'DENY', 'list', 'users/x', 'alice'),
  case('F1 write own users doc', 'DENY', 'create', 'users/alice', 'alice', {'x': 1}),
  case('F5 analytics read signed in', 'DENY', 'get', 'analytics/totals', 'alice'),
  case('F3 storefront report, anonymous', 'ALLOW', 'create', 'reports/r1', None, store),
  case('F3 download-room report, signed in with own uid', 'ALLOW', 'create', 'reports/r2', 'alice', {**rep, 'uid': 'alice'}),
  case('F3 download-room report, anonymous uid null', 'ALLOW', 'create', 'reports/r3', None, rep),
  case('F3 report with someone else uid', 'DENY', 'create', 'reports/r4', 'alice', {**rep, 'uid': 'bob'}),
  case('F3 report with extra field', 'DENY', 'create', 'reports/r5', None, {**store, 'junk': 'x'}),
  case('F3 report description too long', 'DENY', 'create', 'reports/r6', None, {**store, 'description': 'x' * 6001}),
  case('F3 report status not Pending', 'DENY', 'create', 'reports/r7', None, {**store, 'status': 'Resolved'}),
  case('F3 report description not a string', 'DENY', 'create', 'reports/r8', None, {**store, 'description': 5}),
  case('F3 nested collection under reports', 'DENY', 'create', 'reports/r1/sub/x', None, store),
  case('F3 reports read by a member', 'DENY', 'get', 'reports/r1', 'alice'),
  case('F2 create topic', 'ALLOW', 'create', 'forum_topics/t1', 'alice', topic),
  case('F2 create topic for another author', 'DENY', 'create', 'forum_topics/t2', 'alice', {**topic, 'authorId': 'bob'}),
  case('F2 create topic extra field', 'DENY', 'create', 'forum_topics/t3', 'alice', {**topic, 'pinned': True}),
  case('F2 create topic body too long', 'DENY', 'create', 'forum_topics/t4', 'alice', {**topic, 'body': 'x' * 10001}),
  case('F2 create topic unknown category', 'DENY', 'create', 'forum_topics/t5', 'alice', {**topic, 'category': 'Spam'}),
  case('F2 edit own topic text', 'ALLOW', 'update', 'forum_topics/t1', 'alice', {**topic, 'title': 'New', 'updatedAt': T}, topic),
  case('F2 edit own topic changes authorId', 'DENY', 'update', 'forum_topics/t1', 'alice', {**topic, 'authorId': 'bob', 'updatedAt': T}, topic),
  case('F2 edit own topic changes authorName', 'DENY', 'update', 'forum_topics/t1', 'alice', {**topic, 'authorName': 'bob', 'updatedAt': T}, topic),
  case('F2 edit someone else topic', 'DENY', 'update', 'forum_topics/t1', 'bob', {**topic, 'title': 'X', 'updatedAt': T}, topic),
  case('F2 delete own topic', 'ALLOW', 'delete', 'forum_topics/t1', 'alice', None, topic),
  case('F2 create reply', 'ALLOW', 'create', 'forum_topics/t1/replies/r1', 'alice', reply),
  case('F2 edit reply', 'DENY', 'update', 'forum_topics/t1/replies/r1', 'alice', {**reply, 'body': 'x'}, reply),
  case('F2 reply as someone else', 'DENY', 'create', 'forum_topics/t1/replies/r2', 'alice', {**reply, 'authorId': 'bob'}),
  case('forum read public', 'ALLOW', 'get', 'forum_topics/t1', None, None, topic),
  case('plugin_licenses still closed to others', 'DENY', 'get', 'plugin_licenses/bob@example.com', 'alice'),
  case('catch-all closed', 'DENY', 'get', 'whatever/x', 'alice'),
]
body = {'source': {'files': [{'name': 'firestore.rules', 'content': src}]}, 'testSuite': {'testCases': [c for _, c in cases]}}
tok = subprocess.check_output(['gcloud', 'auth', 'print-access-token']).decode().strip()
r = urllib.request.Request(f'https://firebaserules.googleapis.com/v1/projects/{P}:test', json.dumps(body).encode(),
                           {'Authorization': 'Bearer ' + tok, 'Content-Type': 'application/json', 'x-goog-user-project': P})
out = json.load(urllib.request.urlopen(r))
if out.get('issues'): print('ISSUES', json.dumps(out['issues'], indent=1)[:2000])
ok = 0
for (name, c), res in zip(cases, out.get('testResults', [])):
    good = res.get('state') == 'SUCCESS'; ok += good
    print(('PASS ' if good else 'FAIL ') + c['expectation'] + ' ' + name + ('' if good else '  ' + json.dumps(res)[:300]))
print(f'rules test: {ok} / {len(cases)} as expected')
