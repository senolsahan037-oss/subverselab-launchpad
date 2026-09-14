"""VERS running locally, so it can be taught before anyone else talks to it.

Standard library only — no install step, nothing to break. Serves a small chat
page and one endpoint. The point of running it locally is the log: every question
lands in `knowledge/questions.jsonl` with whether VERS could answer it, and the
unanswered ones are the to-do list for teaching it.

Run:  python3 agent/server.py         then open http://localhost:8765
"""

import json
import os
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from vers_brain import answer  # noqa: E402

PORT = int(os.environ.get("VERS_PORT", "8765"))
PAGE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "chat.html")


class Handler(BaseHTTPRequestHandler):
    def _send(self, code, body, content_type="application/json"):
        payload = body if isinstance(body, bytes) else body.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_GET(self):
        if self.path in ("/", "/index.html"):
            with open(PAGE, "rb") as handle:
                self._send(200, handle.read(), "text/html; charset=utf-8")
        elif self.path == "/health":
            self._send(200, json.dumps({"ok": True}))
        else:
            self._send(404, json.dumps({"error": "not found"}))

    def do_POST(self):
        if self.path != "/ask":
            return self._send(404, json.dumps({"error": "not found"}))
        length = int(self.headers.get("Content-Length", 0))
        try:
            question = json.loads(self.rfile.read(length))["question"]
        except (ValueError, KeyError):
            return self._send(400, json.dumps({"error": "send {\"question\": \"...\"}"}))
        text, answered, intent = answer(question)
        self._send(200, json.dumps({"answer": text, "answered": answered,
                                    "intent": intent}))

    def log_message(self, *args):
        pass          # the question log is the record that matters


if __name__ == "__main__":
    print(f"VERS listening on http://localhost:{PORT}")
    print("questions are logged to knowledge/questions.jsonl")
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
