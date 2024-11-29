import subprocess
import time
import logging
import sys
import random

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("manage_chrome_profile.log"),
        logging.StreamHandler(sys.stdout)
    ]
)

# Constants
TARGET_PROFILE_DIRECTORY = "Profile 1"
TARGET_URL = "https://chatgpt.com/"
MESSAGE_TEXT = "Please create an image of a Crypto Green 'Letter A' wearing Wooden Ear-Cup Headphones. Theme: Holographic Display. Set in a Vibrant Underwater Reef."

def human_pause(min_seconds=1, max_seconds=3):
    """
    Simulates a human-like pause by sleeping for a random duration between min_seconds and max_seconds.
    """
    pause_duration = random.uniform(min_seconds, max_seconds)
    time.sleep(pause_duration)

def launch_chrome():
    """
    Launches Chrome with the specified profile and navigates to the target URL.
    """
    try:
        subprocess.run([
            "open",
            "-na",
            "/Applications/Google Chrome.app",
            "--args",
            f"--profile-directory={TARGET_PROFILE_DIRECTORY}",
            TARGET_URL
        ], check=True)
        logging.info(f"Chrome launched with profile '{TARGET_PROFILE_DIRECTORY}' and navigating to '{TARGET_URL}'.")
    except subprocess.CalledProcessError as e:
        logging.error(f"Failed to launch Chrome: {e}")
        sys.exit(1)

def click_input_field():
    """
    Uses AppleScript to click on the ChatGPT input field.
    Adjust the coordinates based on your screen resolution and window position.
    Alternatively, use keyboard navigation to focus the input field.
    """
    try:
        # Example: Use keyboard navigation (Tab) to focus the input field
        # Number of tabs required may vary; adjust as needed
        tabs_to_press = 5  # Example: Press Tab 5 times to reach the input field
        for _ in range(tabs_to_press):
            applescript_commands = 'tell application "System Events" to keystroke tab'
            subprocess.run(["osascript", "-e", applescript_commands], check=True)
            human_pause(0.1, 0.3)
        logging.info("Focused on the input field via keyboard navigation.")
    except subprocess.CalledProcessError as e:
        logging.error(f"AppleScript execution failed while focusing input field: {e}")
        sys.exit(1)

def type_message_gui(message):
    """
    Uses AppleScript GUI scripting to type a message into Chrome.
    """
    try:
        # Split the message into words to simulate typing
        words = message.split()
        for word in words:
            # Type each word followed by a space
            applescript_commands = f'''
            tell application "System Events"
                keystroke "{word}"
                keystroke " "
            end tell
            '''
            subprocess.run(["osascript", "-e", applescript_commands], check=True)
            # Random pause between words
            human_pause(0.3, 0.6)
        # Press return to send the message
        applescript_commands = 'tell application "System Events" to keystroke return'
        subprocess.run(["osascript", "-e", applescript_commands], check=True)
        logging.info("Message typed successfully via GUI scripting.")
    except subprocess.CalledProcessError as e:
        logging.error(f"AppleScript execution failed while typing message: {e}")
        sys.exit(1)

def main():
    logging.info("=== Starting Google Chrome Automation with GUI Scripting ===")
    launch_chrome()
    logging.info("Waiting for Chrome to launch and load the page.")
    human_pause(5, 7)  # Adjust based on your system's performance
    logging.info("Attempting to focus on the input field.")
    click_input_field()
    logging.info("Starting to type the message in a human-like manner.")
    type_message_gui(MESSAGE_TEXT)
    logging.info("Operation completed successfully. Keeping the browser open for 30 seconds.")
    time.sleep(30)
    logging.info("=== Automation Completed ===")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        logging.error(f"An unexpected error occurred: {e}")
        sys.exit(1)