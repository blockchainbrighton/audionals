import shutil
import os
import sys

def create_project(name):
    if not name:
        print("Usage: python3 create_new_plugin.py <plugin_name>")
        return

    # Assuming the script is run from the directory containing BVST_Template
    base_dir = os.path.dirname(os.path.abspath(__file__))
    template_dir = os.path.join(base_dir, "BVST_Template")
    target_dir = os.path.join(base_dir, name)
    
    if not os.path.exists(template_dir):
         print(f"Error: Template directory '{template_dir}' not found.")
         return
    
    if os.path.exists(target_dir):
        print(f"Error: Directory '{name}' already exists.")
        return

    print(f"Creating new BVST plugin '{name}' from template...")
    shutil.copytree(template_dir, target_dir)
    
    # Update manifest.json
    manifest_path = os.path.join(target_dir, "manifest.json")
    try:
        with open(manifest_path, 'r') as f:
            content = f.read()
        
        content = content.replace("My Custom Synth", name)
        
        with open(manifest_path, 'w') as f:
            f.write(content)
    except Exception as e:
        print(f"Warning: Could not update manifest.json: {e}")

    # Update Cargo.toml to change package name? 
    # Optional, but good practice.
    cargo_toml_path = os.path.join(target_dir, "bvst_engine", "Cargo.toml")
    try:
        with open(cargo_toml_path, 'r') as f:
            cargo_content = f.read()
        
        # Simple replace, assuming "name = \"bvst_engine\"" is standard in template
        # Using a generic name in template "bvst_engine" is fine, 
        # but maybe we want to change it to "bvst_engine_<plugin_name>" or similar.
        # For now, we'll keep it simple or user might get confused if folders don't match.
        # But 'bvst_engine' is the folder name.
        pass 
    except Exception:
        pass
        
    print(f"Project '{name}' created successfully!")
    print("\nNext steps:")
    print(f"1. cd {name}")
    print("2. Edit bvst_engine/src/lib.rs to create your sound.")
    print("3. Edit gui.html to create your interface.")
    print("4. Run 'python3 scripts/build.py' to compile.")
    print("5. Run 'python3 server.py' to test.")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        create_project(sys.argv[1])
    else:
        name = input("Enter plugin name: ")
        create_project(name)
