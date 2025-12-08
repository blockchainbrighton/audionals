import subprocess
import os
import shutil
import sys

def build():
    if len(sys.argv) < 2:
        print("Usage: python3 build.py <SynthName>")
        print("Example: python3 build.py BasicSynth")
        return

    synth_name = sys.argv[1]
    print(f"Building '{synth_name}'...")
    
    # Paths
    # Script is in Core/scripts/
    script_dir = os.path.dirname(os.path.abspath(__file__))
    # Project root is up two levels: Core/scripts/ -> Core/ -> Root/
    project_root = os.path.dirname(os.path.dirname(script_dir))
    
    synth_dir = os.path.join(project_root, "Synths", synth_name)
    engine_dir = os.path.join(synth_dir, "bvst_engine")
    pkg_dir = os.path.join(engine_dir, "pkg")
    
    if not os.path.exists(synth_dir):
        print(f"Error: Synth directory not found: {synth_dir}")
        return

    print(f"Synth Dir: {synth_dir}")
    
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
    
    # 2. Combine JS
    generated_js_path = os.path.join(pkg_dir, "bvst_engine.js")
    glue_js_path = os.path.join(script_dir, "processor_glue.js")
    output_js_path = os.path.join(synth_dir, "processor.js")
    
    print(f"Combining JS files into {output_js_path}...")
    
    if not os.path.exists(generated_js_path):
        print(f"Error: {generated_js_path} not found.")
        return

    with open(generated_js_path, 'r') as f:
        gen_js = f.read()
        
    # Remove 'export default ...' and other exports
    gen_js = gen_js.replace("export class", "class")
    gen_js = gen_js.replace("export function", "function")
    gen_js = gen_js.replace("export { initSync };", "// export { initSync };")
    
    if "export default __wbg_init;" in gen_js:
        gen_js = gen_js.replace("export default __wbg_init;", "const init = __wbg_init;")
    elif "export default init;" in gen_js:
        gen_js = gen_js.replace("export default init;", "// export default init;")
    
    with open(glue_js_path, 'r') as f:
        glue_js = f.read()
        
    with open(output_js_path, 'w') as f:
        f.write('console.log("BVST: Global script starting...");\n')
        f.write(gen_js)
        f.write("\n\n")
        f.write(glue_js)
        
    # Safe-guard TextDecoder
    with open(output_js_path, 'r') as f:
        content = f.read()
        
    content = content.replace(
        "let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });",
        "let cachedTextDecoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-8', { ignoreBOM: true, fatal: true }) : { decode: () => 'TextDecoder missing' };"
    )
    
    with open(output_js_path, 'w') as f:
        f.write(content)
        
    # 3. Move WASM
    wasm_src = os.path.join(pkg_dir, "bvst_engine_bg.wasm")
    wasm_dest = os.path.join(synth_dir, "bvst_engine_bg.wasm")
    
    print(f"Moving WASM to {wasm_dest}...")
    shutil.copy(wasm_src, wasm_dest)
    
    print("Build Success!")
