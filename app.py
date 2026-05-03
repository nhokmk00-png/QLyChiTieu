from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse
import posixpath


class ExpenseAppHandler(SimpleHTTPRequestHandler):
    """Serve the static mobile-first expense app from the public folder."""

    app_root = Path(__file__).parent / "public"

    def translate_path(self, path):
        requested_path = posixpath.normpath(unquote(urlparse(path).path))
        parts = [part for part in requested_path.split("/") if part and part not in (".", "..")]
        target = self.app_root
        for part in parts:
            target = target / part
        return str(target)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


class ExpenseAppServer:
    def __init__(self, host="127.0.0.1", port=8000):
        self.host = host
        self.port = port

    def run(self):
        server = ThreadingHTTPServer((self.host, self.port), ExpenseAppHandler)
        print(f"Quản lý chi tiêu đang chạy tại http://{self.host}:{self.port}")
        server.serve_forever()


if __name__ == "__main__":
    ExpenseAppServer().run()
