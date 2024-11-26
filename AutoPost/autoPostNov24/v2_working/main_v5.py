import subprocess
import time
import logging
import sys
import random
from pathlib import Path
import fcntl
import uuid

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
LOCK_FILE_PATH = Path("/Users/jim.btc/Documents/GitHub/audionals/AutoPost/autoPostNov24/v2_working/script.lock")
TARGET_PROFILE_DIRECTORY = "Profile 1"
TARGET_URL = ""  # Will be set uniquely each cycle
SEND_CONFIRMATION_KEYWORD = "Message sent successfully."
EXECUTION_INTERVAL_SECONDS = 3600  # 1 hour
WAIT_BEFORE_CLOSE_SECONDS = 300    # 5 minutes

def generate_unique_url():
    unique_id = uuid.uuid4()
    return f"https://chatgpt.com/?uid={unique_id}"

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
        return None

def release_lock(lock_file):
    """
    Releases the acquired lock.
    """
    try:
        fcntl.flock(lock_file, fcntl.LOCK_UN)
        lock_file.close()
        logging.debug("Lock released successfully.")
    except Exception as e:
        logging.error(f"Error releasing lock: {e}")

def launch_chrome():
    """
    Launches Chrome with the specified profile and navigates to the unique target URL.
    """
    try:
        # Open a new Chrome window with the specified profile and unique URL
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

def close_chrome_window():
    """
    Closes the Chrome window that contains the TARGET_URL using AppleScript.
    """
    try:
        applescript_commands = f'''
        tell application "Google Chrome"
            set target_url to "{TARGET_URL}"
            set window_list to every window
            repeat with the_window in window_list
                set tab_list to every tab of the_window
                repeat with the_tab in tab_list
                    if URL of the_tab starts with target_url then
                        close the_window
                        return
                    end if
                end repeat
            end repeat
        end tell
        '''
        subprocess.run(["osascript", "-e", applescript_commands], check=True)
        logging.info("Specific Chrome window closed successfully.")
    except subprocess.CalledProcessError as e:
        logging.error(f"Failed to close the specific Chrome window: {e}")

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
            return None, None
        
        first_block = blocks[0]
        remaining_content = "\n\n".join(blocks[1:])
        
        return first_block, remaining_content
    
    except FileNotFoundError:
        logging.error(f"Prompts file not found at {file_path}.")
        return None, None
    except Exception as e:
        logging.error(f"Error reading prompts file: {e}")
        return None, None

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
        raise

def send_message_via_gui(block):
    """
    Uses AppleScript to send the block of prompts to Chrome.
    """
    try:
        # Replace double quotes with escaped double quotes for AppleScript
        escaped_block = block.replace('"', '\\"').replace('\n', '\\n')
        
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
        raise

def confirm_message_sent():
    """
    Waits for a short duration to allow the message to be sent.
    """
    logging.info("Waiting for confirmation that the message has been sent.")
    time.sleep(5)  # Adjust based on network speed and ChatGPT's response time
    # Optionally, implement checks to verify the message was sent

def execute_once():
    """
    Executes the main automation steps once.
    """
    global TARGET_URL  # Declare as global to modify the constant
    logging.info("=== Starting a new automation cycle ===")
    
    # Step 0: Acquire lock to prevent concurrent executions
    lock_file = acquire_lock(LOCK_FILE_PATH)
    if not lock_file:
        return  # Another instance is running; skip this cycle
    
    try:
        # Step 1: Generate a unique URL
        TARGET_URL = generate_unique_url()
        
        # Step 2: Launch Chrome
        launch_chrome()
        
        # Step 3: Wait for Chrome to load the page
        logging.info("Waiting for Chrome to launch and load the page.")
        human_pause(5, 7)  # Adjust based on your system's performance
        
        # Step 4: Focus on the input field
        logging.info("Attempting to focus on the input field via Tab navigation.")
        focus_input_field_via_tab(tabs_to_press=10)  # Adjust based on your interface
        
        # Step 5: Read the first block of prompts
        first_block, remaining_content = read_first_block(PROMPTS_FILE_PATH)
        if not first_block:
            logging.info("No prompts to send. Skipping this cycle.")
            return
        
        logging.debug(f"First block to send:\n{first_block}")
        
        # Step 6: Send the first block via GUI scripting
        send_message_via_gui(first_block)
        
        # Step 7: Confirm the message was sent
        confirm_message_sent()
        
        # Step 8: Remove the sent block from the file
        write_remaining_content(PROMPTS_FILE_PATH, remaining_content)
        
        # Step 9: Wait for 5 minutes before closing the Chrome window
        logging.info(f"Waiting for {WAIT_BEFORE_CLOSE_SECONDS / 60} minutes before closing the Chrome window.")
        time.sleep(WAIT_BEFORE_CLOSE_SECONDS)
        logging.info("Resuming to close the Chrome window.")
        
    except Exception as e:
        logging.error(f"An error occurred during automation cycle: {e}")
    finally:
        # Step 10: Close the specific Chrome window
        close_chrome_window()
        
        # Step 11: Release the lock
        release_lock(lock_file)
        
        logging.info("=== Automation cycle completed ===")

def main():
    logging.info("=== Starting Google Chrome Automation Scheduler ===")
    
    while True:
        execute_once()
        logging.info(f"Sleeping for {EXECUTION_INTERVAL_SECONDS / 60} minutes before next cycle.")
        time.sleep(EXECUTION_INTERVAL_SECONDS)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        logging.info("Script terminated by user.")
        sys.exit(0)
    except Exception as e:
        logging.error(f"An unexpected error occurred in the scheduler: {e}")
        sys.exit(1)
