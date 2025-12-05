import http.server
import socketserver
import mimetypes
import os

PORT = 8000

mimetypes.init()
mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('application/wasm', '.wasm')

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=".", **kwargs)

    extensions_map = {
        '.html': 'text/html',
        '.js': 'application/javascript',
        '.wasm': 'application/wasm',
        '.json': 'application/json',
        '': 'application/octet-stream',
    }

# Ensure we are serving from the correct directory if run from elsewhere
if __name__ == "__main__":
    print(f"Serving at http://localhost:{PORT}")
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        httpd.serve_forever()
