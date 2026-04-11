#!/bin/bash

ROOT="Universal_Audio_Foundation"
SRC="$ROOT/src"

echo "🔗 Linking Components into Rust Crate (Flat Mode)..."

# 1. Initialize Cargo if missing
if [ ! -f "$ROOT/Cargo.toml" ]; then
    echo "Creating Cargo.toml..."
    cat <<EOF > "$ROOT/Cargo.toml"
[package]
name = "universal_audio_foundation"
version = "0.1.0"
edition = "2021"

[dependencies]
# Add dependencies here
EOF
fi

# 2. Setup Source Directory
mkdir -p "$SRC"

# 3. Create Traits Definition
cat <<EOF > "$SRC/traits.rs"
pub struct InputDescriptor {
    pub name: &'static str,
    pub min: f64,
    pub max: f64,
    pub default: f64,
}

pub struct OutputDescriptor {
    pub name: &'static str,
}

pub struct AudioNodeMetadata {
    pub id: u32,
    pub name: &'static str,
    pub category: &'static str,
    pub inputs: &'static [InputDescriptor],
    pub outputs: &'static [OutputDescriptor],
}

pub trait AudioNode {
    fn metadata(&self) -> AudioNodeMetadata;
    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], sample_rate: f64);
    fn reset(&mut self);
}
EOF

# 4. Generate the Flat lib.rs
LIB_FILE="$SRC/lib.rs"
echo "pub mod traits;" > "$LIB_FILE"

COMP_DIR="$ROOT/01_Components"

# Helper to clean names
clean_name() {
    echo "$1" | sed -E 's/^[0-9]+_//' | tr '[:upper:]' '[:lower:]'
}

echo "" >> "$LIB_FILE"
echo "// Auto-generated flat module mapping" >> "$LIB_FILE"

for cat_path in "$COMP_DIR"/*; do
    if [ -d "$cat_path" ]; then
        cat_folder_name=$(basename "$cat_path")
        cat_clean=$(clean_name "$cat_folder_name")
        
        for comp_path in "$cat_path"/*; do
            if [ -d "$comp_path" ]; then
                comp_folder_name=$(basename "$comp_path")
                comp_clean=$(clean_name "$comp_folder_name")
                
                # Flat name: math_atoms_add
                mod_name="${cat_clean}_${comp_clean}"
                
                # Path relative to src/lib.rs
                # src/lib.rs -> .. -> root -> 01_Components
                REL_PATH="../01_Components/$cat_folder_name/$comp_folder_name/impl.rs"
                
                echo "#[path = \"$REL_PATH\"]" >> "$LIB_FILE"
                echo "pub mod $mod_name;" >> "$LIB_FILE"
            fi
        done
    fi
done

echo "✅ Linkage Complete. Run 'cargo test' in $ROOT to verify."
