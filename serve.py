#!/usr/bin/env python3
"""Local dev server with clean URL support (extensionless .html)."""
import http.server
import os

class CleanURLHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Try path as-is first, then append .html
        path = self.translate_path(self.path)
        if not os.path.exists(path) and not self.path.endswith('/'):
            html_path = path + '.html'
            if os.path.exists(html_path):
                self.path = self.path + '.html'
        super().do_GET()

if __name__ == '__main__':
    import sys
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    print(f'Serving on http://localhost:{port} (clean URLs enabled)')
    http.server.HTTPServer(('', port), CleanURLHandler).serve_forever()
