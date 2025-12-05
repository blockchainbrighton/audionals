import subprocess
import os
import shutil
import sys
import json
import re

def increment_version(version_str):
    try:
        major, minor, patch = map(int, version_str.split('.'))
        return f"{major}.{minor}.{patch + 1}"
    except ValueError:
        print(f"Warning: Could not parse version '{version_str}'. Defaulting to incrementing as string or keeping as is.")
        return version_str + ".1"

def build():
    if len(sys.argv) < 2:
        print("Usage: python3 System/scripts/build.py <SynthName>")
        print("Example: python3 System/scripts/build.py SimpleSynth")
        return

    synth_name = sys.argv[1]
    print(f"Building '{synth_name}'...")
    
    # Paths
    # Script is in System/scripts/
    script_dir = os.path.dirname(os.path.abspath(__file__))
    # Project root is up two levels: System/scripts/ -> System/ -> Root/
    project_root = os.path.dirname(os.path.dirname(script_dir))
    
    synth_dir = os.path.join(project_root, "Synths", synth_name)
    # WAS: bvst_engine, NOW: audio_engine
    engine_dir = os.path.join(synth_dir, "audio_engine")
    pkg_dir = os.path.join(engine_dir, "pkg")
    manifest_path = os.path.join(synth_dir, "manifest.json")
    
    if not os.path.exists(synth_dir):
        print(f"Error: Synth directory not found: {synth_dir}")
        return

    if not os.path.exists(engine_dir):
         print(f"Error: Audio engine directory not found at: {engine_dir}")
         return

    print(f"Synth Dir: {synth_dir}")
    
    # 0. Version Management
    new_version = "1.0.0"
    if os.path.exists(manifest_path):
        with open(manifest_path, 'r') as f:
            manifest = json.load(f)
        
        current_version = manifest.get("version", "1.0.0")
        new_version = increment_version(current_version)
        manifest["version"] = new_version
        
        with open(manifest_path, 'w') as f:
            json.dump(manifest, f, indent=2)
            
        print(f"Version incremented to {new_version}")
    else:
        print("Warning: manifest.json not found. Skipping version increment.")

    
    # 1. Run wasm-pack
    print("Running wasm-pack...")
    cmd = ["wasm-pack", "build", "--target", "web", "--out-dir", "pkg", "--no-typescript"]
    try:
        subprocess.check_call(cmd, cwd=engine_dir)
    except FileNotFoundError:
        print("Error: 'wasm-pack' not found. Please install it via 'cargo install wasm-pack'.")
        return
    except subprocess.CalledProcessError as e:
        print(f"Error building WASM: {e}")
        return
    
    print("WASM Build complete.")
    
    # 2. (Skipped) Local Processor JS
    # We no longer copy processor.js to the local synth dir.
    # The Host now loads it directly from System/shared/processor.js.
        
    # 3. Move WASM
    wasm_src = os.path.join(pkg_dir, "bvst_engine_bg.wasm")
    wasm_dest = os.path.join(synth_dir, "bvst_engine_bg.wasm")
    
    print(f"Moving WASM to {wasm_dest}...")
    shutil.copy(wasm_src, wasm_dest)
    
    # 4. Create Inscription-Ready Distribution Folder
    dist_dir = os.path.join(synth_dir, "dist", f"v{new_version}")
    if not os.path.exists(dist_dir):
        os.makedirs(dist_dir)
        
    print(f"Creating distribution in {dist_dir}...")
    
    # Copy artifacts
    # Copy Shared Processor to Dist (for inscription)
    shared_proc_path = os.path.join(project_root, "System", "shared", "processor.js")
    shutil.copy(shared_proc_path, os.path.join(dist_dir, "processor.js"))
    
    shutil.copy(wasm_dest, os.path.join(dist_dir, "bvst_engine_bg.wasm"))
    
    # Process GUI
    gui_src = os.path.join(synth_dir, "gui.html")
    gui_dest = os.path.join(dist_dir, "gui.html")
    
    if os.path.exists(gui_src):
        with open(gui_src, 'r') as f:
            gui_content = f.read()
            
        # Update paths: ../../System -> ../../../../System (2 levels deeper)
        # The simple replace handles standard cases.
        gui_content = gui_content.replace("../../System/shared/", "../../../../System/shared/")
        
        # Add Comment Block
        comment_block = """
    <!-- 
        ====== ORDINALS INSCRIPTION INSTRUCTIONS ======
        1. This file 'gui.html' is your main UI entry point.
        2. The script tags below referencing '../../../../System/shared/' are for LOCAL TESTING ONLY.
        3. BEFORE INSCRIBING:
           Replace the local paths with the On-Chain Inscription IDs of the shared libraries.
           
           Example:
           import { Controls } from '/content/<CONTROLS_JS_INSCRIPTION_ID>';
           import { Keyboard } from '/content/<KEYBOARD_JS_INSCRIPTION_ID>';
           import { MidiManager } from '/content/<MIDI_JS_INSCRIPTION_ID>';
           
        4. 'processor.js' and 'bvst_engine_bg.wasm' in this folder should be inscribed as is.
        ===============================================
    -->
"""
        # Insert after <head> or <body>
        if "<body>" in gui_content:
            gui_content = gui_content.replace("<body>", "<body>" + comment_block)
        else:
            gui_content = comment_block + gui_content
            
        with open(gui_dest, 'w') as f:
            f.write(gui_content)
            
    print(f"Build Success! v{new_version} ready in dist/v{new_version}/")

if __name__ == "__main__":
    build()
