import argparse
import os
import shutil
import sys

# Import VideoFileClip directly
from moviepy.video.io.VideoFileClip import VideoFileClip

def create_directories():
    """Create necessary directories if they don't exist"""
    gif_folder = "gifs"
    processed_folder = "processed_videos"
    
    if not os.path.exists(gif_folder):
        os.makedirs(gif_folder)
        print(f"Created folder: {gif_folder}")
    
    if not os.path.exists(processed_folder):
        os.makedirs(processed_folder)
        print(f"Created folder: {processed_folder}")
    
    return gif_folder, processed_folder

def mp4_to_gif(input_file, output_file, duration=None, fps=15, scale=1.0):
    """
    Convert an MP4 file to a looping GIF.
    """
    try:
        # Load the video file
        print(f"Loading video: {input_file}")
        clip = VideoFileClip(input_file)
        
        # Store original fps
        original_fps = clip.fps if hasattr(clip, 'fps') and clip.fps else 30
        
        # Set duration if specified
        if duration is not None:
            end_time = min(duration, clip.duration)
            # Create a subclip with start and end time
            new_clip = clip.subclip(0, end_time)
            clip.close()  # Close the original clip
            clip = new_clip
        
        # Resize if scale is not 1.0
        if scale != 1.0:
            try:
                from moviepy.video.fx.all import resize
                clip = resize(clip, scale)
            except ImportError:
                print("Warning: Could not import resize function. Skipping resize.")
        
        # For controlling output FPS in write_gif, we'll specify it in the write_gif call
        print(f"Converting to GIF: {output_file}")
        print(f"Settings: Duration={clip.duration:.2f}s, Target FPS={fps}, Scale={scale}")
        
        # FIX: Removed the 'program' argument from this line
        clip.write_gif(output_file, fps=fps, loop=0)
        
        # Close the clip
        clip.close()
        
        print(f"Conversion completed: {output_file}")
        try:
            file_size = os.path.getsize(output_file) / (1024*1024)
            print(f"Output file size: {file_size:.2f} MB")
        except:
            print("Could not determine output file size")
        
        return True
        
    except Exception as e:
        print(f"Error during conversion of {input_file}: {str(e)}")
        return False

def process_all_videos(duration=None, fps=15, scale=1.0):
    """Process all video files in the current directory"""
    # Create output directories
    gif_folder, processed_folder = create_directories()
    
    # Define supported video extensions
    video_extensions = ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv', '.wmv', '.m4v']
    
    # Get all video files in current directory
    video_files = [f for f in os.listdir('.') 
                   if os.path.isfile(f) and 
                   os.path.splitext(f)[1].lower() in video_extensions and
                   not f.startswith('.')]  # Skip hidden files
    
    if not video_files:
        print("No video files found in the current directory.")
        return
    
    print(f"Found {len(video_files)} video file(s) to process:")
    for i, video_file in enumerate(video_files, 1):
        print(f"{i}. {video_file}")
    
    # Process each video file
    successful_conversions = 0
    failed_conversions = 0
    
    for video_file in video_files:
        try:
            # Create output filename
            base_name = os.path.splitext(video_file)[0]
            output_file = os.path.join(gif_folder, base_name + ".gif")
            
            print(f"\n--- Processing: {video_file} ---")
            
            # Convert to GIF
            success = mp4_to_gif(video_file, output_file, duration, fps, scale)
            
            if success:
                # Move processed video to archive folder
                destination = os.path.join(processed_folder, video_file)
                
                # Handle case where file with same name already exists
                counter = 1
                while os.path.exists(destination):
                    name, ext = os.path.splitext(video_file)
                    destination = os.path.join(processed_folder, f"{name}_{counter}{ext}")
                    counter += 1
                
                shutil.move(video_file, destination)
                print(f"Moved processed video to: {destination}")
                successful_conversions += 1
            else:
                failed_conversions += 1
                
        except Exception as e:
            print(f"Error processing {video_file}: {str(e)}")
            failed_conversions += 1
    
    # Print summary
    print(f"\n--- Processing Summary ---")
    print(f"Total videos: {len(video_files)}")
    print(f"Successful conversions: {successful_conversions}")
    print(f"Failed conversions: {failed_conversions}")
    
    if successful_conversions > 0:
        print(f"\nGIFs saved in: {os.path.abspath(gif_folder)}")
        print(f"Processed videos moved to: {os.path.abspath(processed_folder)}")

def main():
    parser = argparse.ArgumentParser(description='Convert all videos in folder to looping GIFs')
    parser.add_argument('-d', '--duration', type=float, help='Duration in seconds (optional)')
    parser.add_argument('-f', '--fps', type=int, default=15, help='Frames per second (default: 15)')
    parser.add_argument('-s', '--scale', type=float, default=1.0, help='Scale factor (default: 1.0)')
    
    args = parser.parse_args()
    
    process_all_videos(args.duration, args.fps, args.scale)

if __name__ == "__main__":
    main()