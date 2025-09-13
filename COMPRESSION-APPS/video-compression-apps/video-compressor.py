import os
import subprocess

def compress_videos():
    """
    Compresses MP4 videos in the current directory using FFmpeg at a user-selected
    compression level.
    """
    # Get user input for compression level
    while True:
        level = input("Choose a compression level (light, medium, heavy): ").lower()
        if level in ["light", "medium", "heavy"]:
            break
        else:
            print("Invalid input. Please choose from 'light', 'medium', or 'heavy'.")

    # Define CRF values for each compression level. Higher CRF means more compression.
    # A sane range for H.264 is 18-28. 23 is the default.
    crf_values = {
        "light": "28",
        "medium": "32",
        "heavy": "35"
    }
    crf = crf_values[level]

    # Define output folder names
    output_folder = f"compressed_{level}"
    processed_folder = "processed_videos"

    # Create necessary folders if they don't exist
    for folder in [output_folder, processed_folder]:
        if not os.path.exists(folder):
            os.makedirs(folder)

    # Find all MP4 files in the current directory
    video_files = [f for f in os.listdir('.') if f.lower().endswith('.mp4')]

    if not video_files:
        print("No .mp4 files found in the current directory.")
        return

    # Process each video file
    for filename in video_files:
        input_path = os.path.join(os.getcwd(), filename)
        output_filename = f"{os.path.splitext(filename)[0]}_compressed.mp4"
        output_path = os.path.join(output_folder, output_filename)
        processed_path = os.path.join(processed_folder, filename)

        print(f"Processing {filename}...")

        try:
            # Construct the FFmpeg command
            # This command uses the H.264 video codec and AAC for audio.
            # The -crf option controls the quality/compression.
            # The -preset veryfast option is a good balance of speed and compression.
            command = [
                "ffmpeg",
                "-i", input_path,
                "-vcodec", "libx264",
                "-crf", crf,
                "-preset", "veryfast",
                "-acodec", "aac",
                "-b:a", "128k",
                output_path
            ]

            # Execute the command
            subprocess.run(command, check=True)

            print(f"Successfully compressed {filename} to {output_path}")

            # Move the original file to the processed folder
            os.rename(input_path, processed_path)
            print(f"Moved original file to {processed_path}\n")

        except FileNotFoundError:
            print("FFmpeg not found. Please make sure it's installed and in your system's PATH.")
            break
        except subprocess.CalledProcessError as e:
            print(f"An error occurred during compression of {filename}: {e}")
        except Exception as e:
            print(f"An unexpected error occurred with {filename}: {e}")

if __name__ == "__main__":
    compress_videos()