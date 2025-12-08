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
    engine_dir = os.path.join(synth_dir, "audio_engine")
    pkg_dir = os.path.join(engine_dir, "pkg")
    manifest_path = os.path.join(synth_dir, "manifest.json")
    
    # Helper script for AudioWorklet
    processor_glue_path = os.path.join(project_root, "System", "scripts", "processor_glue.js")
    
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
    # We need 'bvst_engine.js' (the bindings)
    cmd = ["wasm-pack", "build", "--target", "web", "--out-dir", "pkg", "--out-name", "bvst_engine", "--no-typescript"]
    try:
        subprocess.check_call(cmd, cwd=engine_dir)
    except FileNotFoundError:
        print("Error: 'wasm-pack' not found. Please install it via 'cargo install wasm-pack'.")
        return
    except subprocess.CalledProcessError as e:
        print(f"Error building WASM: {e}")
        return
    
    print("WASM Build complete.")
    
    # 2. Combine Bindings + Glue -> processor.js
    print("Generating processor.js...")
    
    # Read Bindings
    bindings_path = os.path.join(pkg_dir, "bvst_engine.js")
    with open(bindings_path, 'r') as f:
        bindings_code = f.read()
        
    # Read Glue
    with open(processor_glue_path, 'r') as f:
        glue_code = f.read()
        
    # Combine
    full_processor_code = bindings_code + "\n\n" + glue_code
    
    # Write to Synth Dir
    processor_dest = os.path.join(synth_dir, "processor.js")
    with open(processor_dest, 'w') as f:
        f.write(full_processor_code)
    
    print(f"Generated {processor_dest}")
        
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
    shutil.copy(processor_dest, os.path.join(dist_dir, "processor.js"))
    shutil.copy(wasm_dest, os.path.join(dist_dir, "bvst_engine_bg.wasm"))
    
    # Process GUI
    gui_src = os.path.join(synth_dir, "gui.html")
    gui_dest = os.path.join(dist_dir, "gui.html")
    
    if os.path.exists(gui_src):
        with open(gui_src, 'r') as f:
            gui_content = f.read()
            
        # Update paths for testing in Dist if needed, or just leave for instruction.
        # The default paths in gui.html usually point to ../../../System/shared
        # In dist/vX/gui.html, it's 2 levels deeper than src/gui.html
        # src: Synths/MySynth/gui.html (needs ../../System)
        # dist: Synths/MySynth/dist/v1/gui.html (needs ../../../../System)
        
        # But usually dist is for Inscription where these become valid URL paths or content IDs.
        
        gui_content = gui_content.replace("../../System/shared/", "../../../../System/shared/")
        
        with open(gui_dest, 'w') as f:
            f.write(gui_content)
            
    print(f"Build Success! v{new_version} ready in dist/v{new_version}/")

if __name__ == "__main__":
    build()