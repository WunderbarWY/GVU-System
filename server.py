#!/usr/bin/env python3
"""
银河先遣队作战指挥台 — 本地代理服务器
使用 curl + 临时文件绕过 PIPE 导致的 SSL 问题
"""

import http.server
import socketserver
import subprocess
import json
import os
import tempfile

PORT = 5180
LINEAR_API = "https://api.linear.app/graphql"
API_KEY_FILE = os.path.expanduser('~/.gv_linear_key')

class Handler(http.server.SimpleHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def send_cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-Api-Key')

    def do_GET(self):
        if self.path == '/api/config' or self.path == '/api/config/':
            key = ''
            if os.path.exists(API_KEY_FILE):
                try:
                    with open(API_KEY_FILE, 'r') as f:
                        key = f.read().strip()
                except:
                    pass
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_cors()
            self.end_headers()
            self.wfile.write(json.dumps({'apiKey': key}).encode())
            return
        super().do_GET()

    def do_POST(self):
        if self.path == '/api/linear' or self.path == '/api/linear/':
            try:
                content_len = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(content_len).decode('utf-8')
                api_key = self.headers.get('X-Api-Key', '')

                # 用临时文件绕过 capture_output PIPE 导致的 SSL 问题
                with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as fout:
                    out_path = fout.name
                with tempfile.NamedTemporaryFile(mode='w', suffix='.err', delete=False) as ferr:
                    err_path = ferr.name

                try:
                    result = subprocess.run(
                        ['curl', '-s', '-X', 'POST', LINEAR_API,
                         '-H', 'Content-Type: application/json',
                         '-H', f'Authorization: {api_key}',
                         '-d', body,
                         '--max-time', '15',
                         '-o', out_path],
                        stderr=open(err_path, 'w'),
                        timeout=20,
                    )

                    with open(out_path) as f:
                        stdout = f.read()
                    with open(err_path) as f:
                        stderr = f.read()

                finally:
                    os.unlink(out_path)
                    os.unlink(err_path)

                if result.returncode != 0:
                    self.send_response(502)
                    self.send_header('Content-Type', 'application/json')
                    self.send_cors()
                    self.end_headers()
                    self.wfile.write(json.dumps({
                        'errors': [{'message': f'Proxy error: rc={result.returncode} stderr={stderr}'}]
                    }).encode())
                    return

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_cors()
                self.end_headers()
                self.wfile.write(stdout.encode())

            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_cors()
                self.end_headers()
                self.wfile.write(json.dumps({
                    'errors': [{'message': str(e)}]
                }).encode())
            return

        if self.path == '/api/config' or self.path == '/api/config/':
            key = ''
            if os.path.exists(API_KEY_FILE):
                try:
                    with open(API_KEY_FILE, 'r') as f:
                        key = f.read().strip()
                except:
                    pass
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_cors()
            self.end_headers()
            self.wfile.write(json.dumps({'apiKey': key}).encode())
            return
        # 未知 POST 路径 — 返回 JSON 错误而不是 HTML
        self.send_response(404)
        self.send_header('Content-Type', 'application/json')
        self.send_cors()
        self.end_headers()
        self.wfile.write(json.dumps({'errors': [{'message': f'Unknown endpoint: {self.path}'}]}).encode())

    def end_headers(self):
        self.send_cors()
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Server running at http://localhost:{PORT}")
        httpd.serve_forever()
