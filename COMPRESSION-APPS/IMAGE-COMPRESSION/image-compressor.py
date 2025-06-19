import os
import shutil
from PIL import Image

# Compression settings: (quality for JPEGs, optimize for PNGs)
COMPRESSION_LEVELS = {
    "heavy": {"quality": 25, "desc": "Heavy compression, lowest quality."},
    "medium": {"quality": 50, "desc": "Medium compression, balanced."},
    "light": {"quality": 80, "desc": "Light compression, best quality."},
}
SUPPORTED_EXTS = (".jpg", ".jpeg", ".png")

def get_user_choice():
    print("Select compression level:")
    for idx, key in enumerate(COMPRESSION_LEVELS, 1):
        print(f"{idx}. {key.capitalize()} – {COMPRESSION_LEVELS[key]['desc']}")
    while True:
        choice = input("Enter 1, 2, or 3: ").strip()
        if choice in ("1", "2", "3"):
            return list(COMPRESSION_LEVELS.keys())[int(choice)-1]
        print("Invalid input. Try again.")

def ensure_folders_exist(levels):
    for level in levels:
        os.makedirs(level, exist_ok=True)
    os.makedirs("processed", exist_ok=True)

def compress_image(src_path, out_path, quality):
    try:
        with Image.open(src_path) as img:
            img_format = img.format or 'JPEG'
            if img_format.upper() in ("JPEG", "JPG"):
                img = img.convert("RGB")
                img.save(out_path, "JPEG", quality=quality, optimize=True)
            elif img_format.upper() == "PNG":
                img.save(out_path, "PNG", optimize=True, compress_level=9 if quality<50 else 5)
            else:
                print(f"Unsupported format: {src_path}")
                return False
        return True
    except Exception as e:
        print(f"Error compressing {src_path}: {e}")
        return False

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    files = [f for f in os.listdir(script_dir)
             if f.lower().endswith(SUPPORTED_EXTS) and os.path.isfile(f)]
    if not files:
        print("No images found to compress in the current directory.")
        return
    level = get_user_choice()
    out_folder = level
    ensure_folders_exist(COMPRESSION_LEVELS.keys())
    for fname in files:
        src_path = os.path.join(script_dir, fname)
        out_path = os.path.join(script_dir, out_folder, fname)
        print(f"Compressing {fname} → {out_folder}/")
        ok = compress_image(src_path, out_path, COMPRESSION_LEVELS[level]["quality"])
        if ok:
            shutil.move(src_path, os.path.join(script_dir, "processed", fname))
    print("\nDone. Compressed images saved in their respective folders.")

if __name__ == "__main__":
    main()
