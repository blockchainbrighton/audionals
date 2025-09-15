import os
import shutil
import subprocess
import sys

def create_directories():
    """Create necessary directories if they don't exist."""
    output_folder = "mp4_files"
    processed_folder = "processed_mov"
    
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)
        print(f"Created folder: {output_folder}")
    
    if not os.path.exists(processed_folder):
        os.makedirs(processed_folder)
        print(f"Created folder: {processed_folder}")
    
    return output_folder, processed_folder

def convert_mov_to_mp4(input_file, output_file):
    """
    Converts a .mov file to an .mp4 file using ffmpeg.
    
    :param input_file: Path to the input .mov file.
    :param output_file: Path for the output .mp4 file.
    :return: True if conversion was successful, False otherwise.
    """
    # This ffmpeg command uses common codecs for wide compatibility.
    # -vcodec libx264 is for H.264 video.
    # -acodec aac is for AAC audio.
    command = [
        'ffmpeg',
        '-i', input_file,
        '-vcodec', 'libx264',
        '-acodec', 'aac',
        '-pix_fmt', 'yuv420p', # Ensures compatibility with most players
        output_file
    ]
    
    try:
        # Execute the ffmpeg command
        result = subprocess.run(command, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, universal_newlines=True)
        print(f"Successfully converted {input_file} to {output_file}")
        return True
    except subprocess.CalledProcessError as e:
        # Handle errors from ffmpeg
        print(f"Error during conversion of {input_file}: {e}", file=sys.stderr)
        print(f"ffmpeg stderr:\n{e.stderr}", file=sys.stderr)
        return False
    except FileNotFoundError:
        # Handle case where ffmpeg is not installed or not in PATH
        print("Error: ffmpeg not found. Please ensure ffmpeg is installed and in your system's PATH.", file=sys.stderr)
        sys.exit(1) # Exit the script if ffmpeg is not available

def process_all_mov_files():
    """Process all .mov files in the current directory."""
    # Create the output and processed directories
    output_folder, processed_folder = create_directories()
    
    # Find all .mov files in the current directory
    mov_files = [f for f in os.listdir('.') 
                 if os.path.isfile(f) and f.lower().endswith('.mov')]
    
    if not mov_files:
        print("No .mov files found in the current directory.")
        return
    
    print(f"Found {len(mov_files)} .mov file(s) to process:")
    for i, video_file in enumerate(mov_files, 1):
        print(f"{i}. {video_file}")
    
    successful_conversions = 0
    failed_conversions = 0
    
    # Loop through and process each file
    for mov_file in mov_files:
        try:
            # Define the output filename and path
            base_name = os.path.splitext(mov_file)[0]
            output_file = os.path.join(output_folder, base_name + ".mp4")
            
            print(f"\n--- Processing: {mov_file} ---")
            
            # Perform the conversion
            success = convert_mov_to_mp4(mov_file, output_file)
            
            if success:
                # If conversion is successful, move the original file
                destination = os.path.join(processed_folder, mov_file)
                shutil.move(mov_file, destination)
                print(f"Moved original file to: {destination}")
                successful_conversions += 1
            else:
                failed_conversions += 1
                
        except Exception as e:
            print(f"An unexpected error occurred while processing {mov_file}: {e}")
            failed_conversions += 1
            
    # Print a final summary of the operations
    print("\n--- Processing Summary ---")
    print(f"Total files processed: {len(mov_files)}")
    print(f"Successful conversions: {successful_conversions}")
    print(f"Failed conversions: {failed_conversions}")
    
    if successful_conversions > 0:
        print(f"\nNew MP4 files are in: {os.path.abspath(output_folder)}")
        print(f"Original MOV files moved to: {os.path.abspath(processed_folder)}")

def main():
    """Main function to run the script."""
    process_all_mov_files()

if __name__ == "__main__":
    main()