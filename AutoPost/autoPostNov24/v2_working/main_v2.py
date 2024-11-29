import subprocess
import time
import logging
import sys
import random
from pathlib import Path
import fcntl

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,  # Change to INFO for less verbosity
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("manage_chrome_profile.log"),
        logging.StreamHandler(sys.stdout)
    ]
)

# Constants
CHROME_APP_PATH = "/Applications/Google Chrome.app"
PROMPTS_FILE_PATH = Path("/Users/jim.btc/Documents/GitHub/audionals/AutoPost/autoPostNov24/v2_working/prompts.txt")
LOCK_FILE_PATH = Path("/Users/jim.btc/Documents/GitHub/audionals/AutoPost/autoPostNov24/v1/script.lock")
TARGET_PROFILE_DIRECTORY = "Profile 1"
TARGET_URL = "https://chatgpt.com/"
SEND_CONFIRMATION_KEYWORD = "Message sent successfully."

def human_pause(min_seconds=1, max_seconds=3):
    """
    Simulates a human-like pause by sleeping for a random duration between min_seconds and max_seconds.
    """
    pause_duration = random.uniform(min_seconds, max_seconds)
    time.sleep(pause_duration)

def acquire_lock(lock_file_path):
    """
    Acquires an exclusive lock on the specified file.
    """
    lock_file = open(lock_file_path, 'w')
    try:
        fcntl.flock(lock_file, fcntl.LOCK_EX | fcntl.LOCK_NB)
        logging.debug("Lock acquired successfully.")
        return lock_file
    except IOError:
        logging.error("Another instance of the script is already running.")
        sys.exit(1)

def launch_chrome():
    """
    Launches Chrome with the specified profile and navigates to the target URL.
    """
    try:
        subprocess.run([
            "open",
            "-na",
            CHROME_APP_PATH,
            "--args",
            f"--profile-directory={TARGET_PROFILE_DIRECTORY}",
            TARGET_URL
        ], check=True)
        logging.info(f"Chrome launched with profile '{TARGET_PROFILE_DIRECTORY}' and navigating to '{TARGET_URL}'.")
    except subprocess.CalledProcessError as e:
        logging.error(f"Failed to launch Chrome: {e}")
        sys.exit(1)

def read_first_block(file_path):
    """
    Reads the first block of prompts from the file.
    Returns the block as a single string and the remaining content.
    """
    try:
        with file_path.open("r", encoding="utf-8") as file:
            content = file.read()
        
        # Split blocks by two consecutive newline characters
        blocks = content.strip().split("\n\n")
        
        if not blocks:
            logging.info("No prompts found in the file.")
            sys.exit(0)
        
        first_block = blocks[0]
        remaining_content = "\n\n".join(blocks[1:])
        
        return first_block, remaining_content
    
    except FileNotFoundError:
        logging.error(f"Prompts file not found at {file_path}.")
        sys.exit(1)
    except Exception as e:
        logging.error(f"Error reading prompts file: {e}")
        sys.exit(1)

def write_remaining_content(file_path, content):
    """
    Writes the remaining content back to the prompts file.
    """
    try:
        with file_path.open("w", encoding="utf-8") as file:
            file.write(content)
        logging.info("Sent block removed from prompts file.")
    except Exception as e:
        logging.error(f"Error writing to prompts file: {e}")
        sys.exit(1)

def focus_input_field_via_tab(tabs_to_press=5):
    """
    Uses AppleScript to press the Tab key multiple times to focus the input field.
    Adjust the number of Tab presses based on the ChatGPT interface.
    """
    try:
        for _ in range(tabs_to_press):
            applescript_commands = 'tell application "System Events" to keystroke tab'
            subprocess.run(["osascript", "-e", applescript_commands], check=True)
            human_pause(0.1, 0.3)
        logging.info("Focused on the input field via Tab key navigation.")
    except subprocess.CalledProcessError as e:
        logging.error(f"AppleScript execution failed while focusing input field: {e}")
        sys.exit(1)

def send_message_via_gui(block):
    """
    Uses AppleScript to send the block of prompts to Chrome.
    """
    try:
        # Replace double quotes with escaped double quotes for AppleScript
        escaped_block = block.replace('"', '\\"')
        
        # AppleScript commands to type the block and send
        applescript_commands = f'''
        tell application "System Events"
            keystroke "{escaped_block}"
            delay 0.5
            keystroke return
        end tell
        '''
        subprocess.run(["osascript", "-e", applescript_commands], check=True)
        logging.info("AppleScript executed successfully to send the message.")
    except subprocess.CalledProcessError as e:
        logging.error(f"AppleScript execution failed: {e}")
        sys.exit(1)

def confirm_message_sent():
    """
    Waits for a short duration to allow the message to be sent.
    """
    logging.info("Waiting for confirmation that the message has been sent.")
    time.sleep(5)  # Adjust based on network speed and ChatGPT's response time
    # Optionally, implement checks to verify the message was sent

def main():
    logging.info("=== Starting Google Chrome Automation ===")
    
    # Step 0: Acquire lock to prevent concurrent executions
    lock_file = acquire_lock(LOCK_FILE_PATH)
    
    # Step 1: Launch Chrome
    launch_chrome()
    
    # Step 2: Wait for Chrome to load the page
    logging.info("Waiting for Chrome to launch and load the page.")
    human_pause(5, 7)  # Adjust based on your system's performance
    
    # Step 3: Focus on the input field
    logging.info("Attempting to focus on the input field via Tab navigation.")
    focus_input_field_via_tab(tabs_to_press=10)  # Adjust based on your interface
    
    # Step 4: Read the first block of prompts
    first_block, remaining_content = read_first_block(PROMPTS_FILE_PATH)
    logging.debug(f"First block to send:\n{first_block}")
    
    # Step 5: Send the first block via GUI scripting
    send_message_via_gui(first_block)
    
    # Step 6: Confirm the message was sent
    confirm_message_sent()
    
    # Step 7: Remove the sent block from the file
    write_remaining_content(PROMPTS_FILE_PATH, remaining_content)
    
    logging.info("Operation completed successfully. Keeping the browser open for 30 seconds.")
    time.sleep(30)
    logging.info("=== Automation Completed ===")
    
    # Step 8: Release the lock by closing the lock file
    lock_file.close()

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        logging.error(f"An unexpected error occurred: {e}")
        sys.exit(1)