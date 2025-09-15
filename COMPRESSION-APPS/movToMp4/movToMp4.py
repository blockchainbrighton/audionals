import subprocess
import os
import sys

def convert_mov_to_mp4(input_path, output_path=None):
    if not os.path.exists(input_path):
        print(f"Error: {input_path} does not exist.")
        return

    if not input_path.lower().endswith(".mov"):
        print("Error: Input file must be a .mov file")
        return

    if output_path is None:
        output_path = os.path.splitext(input_path)[0] + ".mp4"

    try:
        # ffmpeg command: copy streams if possible, else re-encode
        cmd = [
            "ffmpeg",
            "-i", input_path,
            "-c:v", "libx264",
            "-c:a", "aac",
            "-movflags", "+faststart",
            output_path
        ]
        subprocess.run(cmd, check=True)
        print(f"Converted: {input_path} -> {output_path}")
    except subprocess.CalledProcessError as e:
        print(f"Error during conversion: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python convert.py input.mov [output.mp4]")
    else:
        input_file = sys.argv[1]
        output_file = sys.argv[2] if len(sys.argv) > 2 else None
        convert_mov_to_mp4(input_file, output_file)
