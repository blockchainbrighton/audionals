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

    def _infer_subgroup(self, manifest, plugin_dir, top_category):
        name = (manifest.get("name") or os.path.basename(plugin_dir) or "").strip()
        plugin_type = (manifest.get("type") or "").strip().lower()

        # Instruments: Synths / Samplers / Sequencers
        if plugin_type == "instrument" or top_category.lower() == "instruments":
            patch_path = os.path.join(plugin_dir, "patch.json")
            if os.path.exists(patch_path):
                try:
                    with open(patch_path, "r") as f:
                        patch_doc = json.load(f)
                    config = patch_doc.get("config", patch_doc) if isinstance(patch_doc, dict) else {}

                    sampler_cfg = config.get("sampler")
                    if isinstance(sampler_cfg, dict) and sampler_cfg.get("enabled", True) is not False:
                        return "Samplers"

                    seq_cfg = config.get("sequencer")
                    if isinstance(seq_cfg, dict):
                        return "Sequencers"
                except Exception:
                    pass
            return "Synths"

        # Effects: light heuristics for nicer grouping
        if plugin_type == "effect":
            lname = name.lower()
            if "delay" in lname:
                return "Delay"
            if "chorus" in lname:
                return "Chorus"
            if "comp" in lname or "compress" in lname:
                return "Compression"
            return "Effects"

        return top_category

    def do_GET(self):
        if self.path == '/':
            # Redirect root to host.html
            self.send_response(302)
            self.send_header('Location', '/System/host.html')
            self.end_headers()
            return

        if self.path == '/api/synths':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            
            entries = []

            # Legacy Synths directory (kept for fallback)
            if os.path.exists('Synths'):
                for d in os.listdir('Synths'):
                    synth_path = os.path.join('Synths', d)
                    if not os.path.isdir(synth_path) or d.startswith('.'):
                        continue
                    manifest_path = os.path.join(synth_path, "manifest.json")
                    if not os.path.exists(manifest_path):
                        continue
                    plugin_type = "Synth"
                    try:
                        with open(manifest_path, 'r') as f:
                            manifest = json.load(f)
                            plugin_type = manifest.get("type", plugin_type)
                    except Exception:
                        pass
                    entries.append({
                        "name": d,
                        "path": f"Synths/{d}",
                        "type": plugin_type,
                        "category": "Legacy",
                        "subgroup": "Synths"
                    })

            # Plugins directory with category subfolders
            if os.path.exists('Plugins'):
                for category in os.listdir('Plugins'):
                    cat_path = os.path.join('Plugins', category)
                    if not os.path.isdir(cat_path) or category.startswith('.'):
                        continue
                    for d in os.listdir(cat_path):
                        plugin_path = os.path.join(cat_path, d)
                        if not os.path.isdir(plugin_path) or d.startswith('.'):
                            continue
                        manifest_path = os.path.join(plugin_path, "manifest.json")
                        if not os.path.exists(manifest_path):
                            continue
                        plugin_type = category  # fallback to category name
                        manifest = {}
                        try:
                            with open(manifest_path, 'r') as f:
                                manifest = json.load(f)
                                plugin_type = manifest.get("type", plugin_type)
                        except Exception:
                            pass
                        subgroup = self._infer_subgroup(manifest, plugin_path, category)
                        entries.append({
                            "name": d,
                            "path": f"Plugins/{category}/{d}",
                            "type": plugin_type,
                            "category": category,
                            "subgroup": subgroup
                        })

            entries.sort(key=lambda x: x["name"].lower())
            self.wfile.write(json.dumps(entries).encode())
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
    allow_reuse_address = True

if __name__ == "__main__":
    print(f"Serving at http://localhost:{PORT}/System/host.html")
    with ReusableTCPServer(("", PORT), Handler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server...")
