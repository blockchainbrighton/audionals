import http.server
import socketserver
import mimetypes
import os
import json

PORT = 8000

mimetypes.init()
mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('application/wasm', '.wasm')

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=".", **kwargs)

    def do_GET(self):
        if self.path == '/api/synths':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            
            synths = []
            if os.path.exists('Synths'):
                synths = [
                    d for d in os.listdir('Synths')
                    if os.path.isdir(os.path.join('Synths', d))
                    and not d.startswith('.')
                ]
            synths.sort()
            
            self.wfile.write(json.dumps(synths).encode())
        else:
            super().do_GET()

    extensions_map = {
        '.html': 'text/html',
        '.js': 'application/javascript',
        '.wasm': 'application/wasm',
        '.json': 'application/json',
        '': 'application/octet-stream',
    }

class ReusableTCPServer(socketserver.TCPServer):
    # This is the key bit: lets you restart immediately on the same port
    allow_reuse_address = True

# Ensure we are serving from the correct directory if run from elsewhere
if __name__ == "__main__":
    print(f"Serving at http://localhost:{PORT}")
    with ReusableTCPServer(("", PORT), Handler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server...")
            # serve_forever() loop will exit, and the context manager will close the socket
