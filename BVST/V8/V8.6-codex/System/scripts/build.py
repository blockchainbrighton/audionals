import subprocess
import os
import shutil
import sys
import json
import re
from pathlib import Path


def increment_version(version_str: str) -> str:
    try:
        major, minor, patch = map(int, version_str.split('.'))
        return f"{major}.{minor}.{patch + 1}"
    except Exception:
        print(f"Warning: Could not parse version '{version_str}'. Keeping as-is.")
        return version_str


def minify_html(content: str) -> str:
    content = re.sub(r'<!--[\s\S]*?-->', '', content)
    cleaned = [line.strip() for line in content.splitlines() if line.strip()]
    return chr(10).join(cleaned)


def find_plugin_dir(project_root: str, name: str):
    synth_dir = os.path.join(project_root, 'Synths', name)
    if os.path.isdir(synth_dir):
        return synth_dir

    plugins_root = os.path.join(project_root, 'Plugins')
    if os.path.isdir(plugins_root):
        for category in os.listdir(plugins_root):
            candidate = os.path.join(plugins_root, category, name)
            if os.path.isdir(candidate):
                return candidate

    return None


def rebuild_unified_wasm(project_root: str) -> bool:
    engine_dir = os.path.join(project_root, 'System', 'unified_audio_engine')
    out_wasm = os.path.join(project_root, 'System', 'shared', 'bvst_unified_bg.wasm')

    if not os.path.isdir(engine_dir):
        print(f"Error: unified audio engine directory not found at: {engine_dir}")
        return False

    print('Rebuilding unified WASM (single shared engine)...')
    cmd = [
        'wasm-pack', 'build',
        '--target', 'web',
        '--out-dir', 'pkg',
        '--out-name', 'bvst_unified',
        '--no-typescript',
    ]
    try:
        subprocess.check_call(cmd, cwd=engine_dir)
    except FileNotFoundError:
        print("Error: 'wasm-pack' not found. Install via: cargo install wasm-pack")
        return False
    except subprocess.CalledProcessError as e:
        print(f"Error building unified WASM: {e}")
        return False

    wasm_src = os.path.join(engine_dir, 'pkg', 'bvst_unified_bg.wasm')
    if not os.path.exists(wasm_src):
        print(f"Error: expected build output not found: {wasm_src}")
        return False

    os.makedirs(os.path.dirname(out_wasm), exist_ok=True)
    shutil.copy(wasm_src, out_wasm)
    print(f"Updated shared WASM: {out_wasm}")

    pkg_dir = os.path.join(engine_dir, 'pkg')
    if os.path.isdir(pkg_dir):
        shutil.rmtree(pkg_dir)

    return True


def rebuild_shared_processor(project_root: str) -> bool:
    loader_path = os.path.join(project_root, 'System', 'shared', 'wasm_loader_unified.js')
    glue_path = os.path.join(project_root, 'System', 'scripts', 'processor_glue.js')
    out_path = os.path.join(project_root, 'System', 'shared', 'processor_unified.js')

    if not os.path.exists(loader_path):
        print(f"Error: unified loader not found at: {loader_path}")
        return False
    if not os.path.exists(glue_path):
        print(f"Error: processor glue not found at: {glue_path}")
        return False

    loader = Path(loader_path).read_text(encoding='utf-8')
    glue = Path(glue_path).read_text(encoding='utf-8')

    out = (
        '// System/shared/processor_unified.js\n'
        '// Shared BVST AudioWorklet module (single copy for all plugins).\n\n'
        + loader.rstrip() + '\n\n' + glue.lstrip() + '\n'
    )

    Path(out_path).write_text(out, encoding='utf-8')
    print(f"Updated shared processor module: {out_path}")
    return True


def build():
    if len(sys.argv) < 2:
        print('Usage: python3 System/scripts/build.py <PluginName> [--rebuild-wasm] [--rebuild-processor]')
        print('Example: python3 System/scripts/build.py UniversalSynth --rebuild-wasm --rebuild-processor')
        return

    name = sys.argv[1]
    args = set(sys.argv[2:])
    rebuild_wasm = '--rebuild-wasm' in args
    rebuild_processor = '--rebuild-processor' in args

    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(os.path.dirname(script_dir))

    plugin_dir = find_plugin_dir(project_root, name)
    if not plugin_dir:
        print(f"Error: plugin directory not found for '{name}'")
        return

    if rebuild_wasm:
        if not rebuild_unified_wasm(project_root):
            return

    if rebuild_processor:
        if not rebuild_shared_processor(project_root):
            return

    manifest_path = os.path.join(plugin_dir, 'manifest.json')
    new_version = None
    if os.path.exists(manifest_path):
        with open(manifest_path, 'r', encoding='utf-8') as f:
            manifest = json.load(f)

        current_version = manifest.get('version', '1.0.0')
        new_version = increment_version(current_version)
        manifest['version'] = new_version

        with open(manifest_path, 'w', encoding='utf-8') as f:
            json.dump(manifest, f, indent=2)

        print(f"Version incremented to {new_version}")
    else:
        print('Warning: manifest.json not found. Skipping version increment.')
        return

    dist_dir = os.path.join(plugin_dir, 'dist', f"v{new_version}")
    os.makedirs(dist_dir, exist_ok=True)

    gui_src = os.path.join(plugin_dir, 'gui.html')
    gui_dest = os.path.join(dist_dir, 'gui.html')
    if os.path.exists(gui_src):
        gui_content = Path(gui_src).read_text(encoding='utf-8')
        gui_content = gui_content.replace('../../System/shared/', '../../../../System/shared/')
        gui_content = gui_content.replace('../../../System/shared/', '../../../../../System/shared/')
        Path(gui_dest).write_text(minify_html(gui_content), encoding='utf-8')

    patch_src = os.path.join(plugin_dir, 'patch.json')
    if os.path.exists(patch_src):
        shutil.copy(patch_src, os.path.join(dist_dir, 'patch.json'))

    print(f"Build Success! v{new_version} ready in dist/v{new_version}/")


if __name__ == '__main__':
    build()
