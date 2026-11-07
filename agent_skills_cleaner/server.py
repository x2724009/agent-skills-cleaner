"""Local web UI. Binds to 127.0.0.1 only and requires a per-run token,
so other websites open in your browser cannot drive it."""

import json
import os
import secrets
import subprocess
import sys
import threading
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from . import __version__, actions, config
from .analyzer import analyze_with_models

WEB_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "web")
STATIC = {
    "/app.js": "application/javascript; charset=utf-8",
    "/style.css": "text/css; charset=utf-8",
    "/icon.svg": "image/svg+xml",
}


class State:
    def __init__(self, readonly, roots=None):
        self.readonly = readonly
        self.roots = roots
        self.token = secrets.token_urlsafe(24)
        self.lock = threading.Lock()
        self.report = None

    def rescan(self):
        with self.lock:
            self.report = analyze_with_models(self.roots)
            return self.report

    def find_skill(self, skill_id):
        for s in (self.report or {}).get("skills", []):
            if s["id"] == skill_id:
                return s
        raise actions.ActionError("unknown skill; rescan and try again")

    def find_package(self, package_id):
        for p in (self.report or {}).get("packages", []):
            if p["id"] == package_id:
                return p, [self.find_skill(i) for i in p["skill_ids"]]
        raise actions.ActionError("unknown package; rescan and try again")

    def find_reader(self, name):
        for r in (self.report or {}).get("readers", []):
            if r["name"] == name:
                return r
        raise actions.ActionError("unknown app; rescan and try again")

    def find_broken(self, broken_id):
        for b in (self.report or {}).get("broken", []):
            if b["id"] == broken_id:
                return b
        raise actions.ActionError("unknown broken link; rescan and try again")


def make_handler(state, port):
    allowed_hosts = {"127.0.0.1:%d" % port, "localhost:%d" % port}

    class Handler(BaseHTTPRequestHandler):
        server_version = "agent-skills-cleaner/" + __version__

        def log_message(self, fmt, *args):
            pass

        def _send(self, code, body, ctype="application/json; charset=utf-8"):
            if not isinstance(body, bytes):
                body = json.dumps(body, ensure_ascii=False).encode("utf-8")
            self.send_response(code)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.end_headers()
            self.wfile.write(body)

        def _guard(self):
            # Reject DNS-rebinding and cross-site requests.
            if self.headers.get("Host") not in allowed_hosts:
                self._send(403, {"error": "bad host"})
                return False
            if self.path.startswith("/api/") and self.headers.get("X-Token") != state.token:
                self._send(403, {"error": "bad token"})
                return False
            return True

        def do_GET(self):
            if not self._guard():
                return
            path = self.path.split("?", 1)[0]
            if path == "/":
                with open(os.path.join(WEB_DIR, "index.html"), encoding="utf-8") as f:
                    html = f.read().replace("__TOKEN__", state.token)
                html = html.replace("__READONLY__", "true" if state.readonly else "false")
                return self._send(200, html.encode("utf-8"), "text/html; charset=utf-8")
            if path in STATIC:
                with open(os.path.join(WEB_DIR, path[1:]), "rb") as f:
                    return self._send(200, f.read(), STATIC[path])
            if path == "/api/scan":
                return self._send(200, state.rescan())
            if path == "/api/history":
                return self._send(200, actions.history_view())
            if path == "/api/config":
                return self._send(200, config.load_config())
            self._send(404, {"error": "not found"})

        def do_POST(self):
            if not self._guard():
                return
            try:
                length = int(self.headers.get("Content-Length") or 0)
                data = json.loads(self.rfile.read(length) or b"{}")
            except ValueError:
                return self._send(400, {"error": "bad json"})
            path = self.path.split("?", 1)[0]
            if path == "/api/reveal":
                return self._reveal(data)
            if path == "/api/config":
                try:
                    return self._send(200, config.save_config(data))
                except (ValueError, OSError) as e:
                    return self._send(400, {"error": str(e)})
            if state.readonly:
                return self._send(403, {"error": "read-only mode"})
            try:
                with state.lock:
                    if path == "/api/uninstall":
                        entry = actions.uninstall(state.find_skill(data.get("skill_id")), data.get("path"))
                    elif path == "/api/delete":
                        entry = actions.delete(state.find_skill(data.get("skill_id")))
                    elif path == "/api/delete-package":
                        pkg, skills = state.find_package(data.get("package_id"))
                        entry = actions.delete_package(pkg["name"], skills)
                    elif path == "/api/uninstall-package":
                        pkg, skills = state.find_package(data.get("package_id"))
                        entry = actions.uninstall_package(pkg["name"], skills, data.get("agent"))
                    elif path == "/api/keep-for":
                        reader = state.find_reader(data.get("reader"))
                        if data.get("package_id"):
                            pkg, skills = state.find_package(data.get("package_id"))
                            entry = actions.keep_package_for(pkg["name"], skills, reader["name"], reader["home"])
                        else:
                            entry = actions.keep_for(state.find_skill(data.get("skill_id")), reader["name"], reader["home"])
                    elif path == "/api/remove-broken":
                        b = state.find_broken(data.get("broken_id"))
                        entry = actions.remove_broken(b["path"], b["name"])
                    elif path == "/api/restore":
                        entry = actions.restore(data.get("entry_id"))
                    else:
                        return self._send(404, {"error": "not found"})
            except (actions.ActionError, OSError) as e:
                return self._send(409, {"error": str(e)})
            self._send(200, {"ok": True, "entry": entry})

        def _reveal(self, data):
            try:
                target = state.find_skill(data.get("skill_id"))["real_path"]
            except actions.ActionError as e:
                return self._send(409, {"error": str(e)})
            if sys.platform == "darwin":
                subprocess.Popen(["open", "-R", target])
            elif sys.platform.startswith("linux"):
                subprocess.Popen(["xdg-open", os.path.dirname(target)])
            elif sys.platform == "win32":
                subprocess.Popen(["explorer", "/select,", target])
            self._send(200, {"ok": True})

    return Handler


def serve(port=7457, open_browser=True, readonly=False, roots=None):
    from . import recovery
    pruned = recovery.prune_backups(actions.STATE_DIR)
    if pruned:
        print("removed %d backups older than %d days" % (pruned, recovery.BACKUP_DAYS), flush=True)
    state = State(readonly, roots)
    state.rescan()
    httpd = None
    for candidate in range(port, port + 20):
        try:
            httpd = ThreadingHTTPServer(("127.0.0.1", candidate), make_handler(state, candidate))
            break
        except OSError as e:
            if e.errno not in (48, 98, 10048):  # address already in use (macOS, Linux, Windows)
                raise
    if httpd is None:
        raise SystemExit("ports %d-%d are all in use; pick one with --port" % (port, port + 19))
    if candidate != port:
        print("port %d is busy (another agent-skills-cleaner may be running); using %d instead" % (port, candidate), flush=True)
    port = candidate
    url = "http://127.0.0.1:%d/" % port
    print("agent-skills-cleaner %s running at %s  (Ctrl+C to stop)" % (__version__, url), flush=True)
    if readonly:
        print("read-only mode: uninstall/delete are disabled", flush=True)
    if open_browser:
        threading.Timer(0.5, lambda: webbrowser.open(url)).start()
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nbye")
    finally:
        httpd.server_close()
