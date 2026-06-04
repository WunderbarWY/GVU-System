#!/usr/bin/env python3
"""
银河先遣队作战指挥台 — 本地代理服务器 v2
使用 curl + 临时文件绕过 PIPE 导致的 SSL 问题
改进：端口复用、超时延长、重试机制、详细日志
"""

import http.server
import socketserver
import subprocess
import json
import os
import tempfile
import time

PORT = 5180
LINEAR_API = "https://api.linear.app/graphql"
API_KEY_FILE = os.path.expanduser('~/.gv_linear_key')

class ReuseAddrTCPServer(socketserver.TCPServer):
    """允许端口复用，避免 Address already in use"""
    allow_reuse_address = True

class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        """自定义日志，带时间戳"""
        print(f"[{time.strftime('%H:%M:%S')}] {format % args}")

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def send_cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-Api-Key')

    def do_GET(self):
        # 健康检查
        if self.path == '/api/health':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_cors()
            self.end_headers()
            self.wfile.write(json.dumps({'status': 'ok', 'time': time.time()}).encode())
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
        super().do_GET()

    def _proxy_to_linear(self, body, api_key):
        """转发请求到 Linear API，带重试"""
        max_retries = 2
        last_error = None

        for attempt in range(max_retries + 1):
            out_path = err_path = None
            try:
                with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as fout:
                    out_path = fout.name
                with tempfile.NamedTemporaryFile(mode='w', suffix='.err', delete=False) as ferr:
                    err_path = ferr.name

                result = subprocess.run(
                    ['curl', '-s', '-S', '-X', 'POST', LINEAR_API,
                     '-H', 'Content-Type: application/json',
                     '-H', f'Authorization: {api_key}',
                     '-d', body,
                     '--max-time', '30',
                     '--connect-timeout', '10',
                     '--retry', '2',
                     '--retry-delay', '1',
                     '-o', out_path],
                    stderr=open(err_path, 'w'),
                    timeout=35,
                )

                with open(out_path) as f:
                    stdout = f.read()
                with open(err_path) as f:
                    stderr = f.read()

                if result.returncode != 0:
                    last_error = f'curl rc={result.returncode}, stderr={stderr[:200]}'
                    if attempt < max_retries:
                        time.sleep(1)
                        continue
                    return {'errors': [{'message': f'Linear API 连接失败（已重试{max_retries}次）: {last_error}'}]}, 502

                # 检查返回内容是否为有效 JSON
                try:
                    parsed = json.loads(stdout)
                    return parsed, 200
                except json.JSONDecodeError:
                    # 可能是 HTML 错误页
                    body_preview = stdout[:200].replace('\n', ' ')
                    return {'errors': [{'message': f'Linear 返回非 JSON（可能是认证失败或限流）: {body_preview}'}]}, 502

            except subprocess.TimeoutExpired:
                last_error = '请求超时（30秒）'
                if attempt < max_retries:
                    time.sleep(1)
                    continue
                return {'errors': [{'message': f'Linear API 请求超时（已重试{max_retries}次）'}]}, 504

            except Exception as e:
                last_error = str(e)
                if attempt < max_retries:
                    time.sleep(1)
                    continue
                return {'errors': [{'message': f'代理内部错误: {last_error}'}]}, 500

            finally:
                if out_path and os.path.exists(out_path):
                    os.unlink(out_path)
                if err_path and os.path.exists(err_path):
                    os.unlink(err_path)

        return {'errors': [{'message': f'未知错误: {last_error}'}]}, 500

    def do_POST(self):
        if self.path == '/api/linear' or self.path == '/api/linear/':
            try:
                content_len = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(content_len).decode('utf-8')
                api_key = self.headers.get('X-Api-Key', '')

                t0 = time.time()
                result, status_code = self._proxy_to_linear(body, api_key)
                elapsed = (time.time() - t0) * 1000

                self.send_response(status_code)
                self.send_header('Content-Type', 'application/json')
                self.send_cors()
                self.end_headers()
                self.wfile.write(json.dumps(result).encode())

                if 'errors' in result:
                    print(f"  ⚠️ Linear 错误: {result['errors'][0].get('message', 'unknown')[:80]}")
                else:
                    print(f"  ✓ Linear 响应 {elapsed:.0f}ms")

            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_cors()
                self.end_headers()
                self.wfile.write(json.dumps({
                    'errors': [{'message': f'代理内部错误: {str(e)}'}]
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
    with ReuseAddrTCPServer(("", PORT), Handler) as httpd:
        print(f"Server running at http://localhost:{PORT}")
        print(f"Health check: http://localhost:{PORT}/api/health")
        httpd.serve_forever()
