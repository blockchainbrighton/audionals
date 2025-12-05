import subprocess
import os
import shutil

def build():
    print("Building WASM...")
    
    # Path to bvst_engine
    # This script is in scripts/, so engine is in ../bvst_engine
    base_dir = os.path.dirname(os.path.abspath(__file__))
    root_dir = os.path.dirname(base_dir)
    engine_dir = os.path.join(root_dir, "bvst_engine")
    pkg_dir = os.path.join(engine_dir, "pkg")
    
    # 1. Run wasm-pack
    # Ensure wasm-pack is installed
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
    glue_js_path = os.path.join(base_dir, "processor_glue.js")
    output_js_path = os.path.join(root_dir, "processor.js")
    
    print(f"Combining JS files into {output_js_path}...")
    
    if not os.path.exists(generated_js_path):
        print(f"Error: {generated_js_path} not found.")
        return

    with open(generated_js_path, 'r') as f:
        gen_js = f.read()
        
    # Remove 'export default ...' and other exports to avoid issues in AudioWorklet
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
    wasm_dest = os.path.join(root_dir, "bvst_engine_bg.wasm")
    
    print(f"Moving WASM to {wasm_dest}...")
    shutil.copy(wasm_src, wasm_dest)
    
    print("Build Success! You can now run 'python3 server.py' to test.")

if __name__ == "__main__":
    build()
