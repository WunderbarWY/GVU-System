#!/usr/bin/env python3
import http.server
import socketserver
import subprocess
import json
import os

PORT = 5180
LINEAR_API = "https://api.linear.app/graphql"

class Handler(http.server.SimpleHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(204)
        self.send_cors()
        self.end_headers()

    def send_cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-Api-Key')

    def do_POST(self):
        if self.path == '/api/linear':
            try:
                content_len = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(content_len).decode('utf-8')
                api_key = self.headers.get('X-Api-Key', '')

                result = subprocess.run(
                    ['curl', '-s', '-X', 'POST', LINEAR_API,
                     '-H', 'Content-Type: application/json',
                     '-H', f'Authorization: {api_key}',
                     '-d', body, '--max-time', '15'],
                    capture_output=True, text=True, timeout=20,
                )

                if result.returncode != 0:
                    self.send_response(502)
                    self.send_header('Content-Type', 'application/json')
                    self.send_cors()
                    self.end_headers()
                    self.wfile.write(json.dumps({
                        'errors': [{'message': f'Proxy error: rc={result.returncode} stderr={result.stderr}'}]
                    }).encode())
                    return

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_cors()
                self.end_headers()
                self.wfile.write(result.stdout.encode())

            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_cors()
                self.end_headers()
                self.wfile.write(json.dumps({
                    'errors': [{'message': str(e)}]
                }).encode())
            return

        self.do_GET()

    def end_headers(self):
        self.send_cors()
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Server running at http://localhost:{PORT}")
        httpd.serve_forever()
