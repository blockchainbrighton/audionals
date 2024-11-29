#!/usr/bin/env python3
"""
This script manages Google Chrome on a MacBook Air by ensuring it runs with a specific profile.
It performs the following tasks:
1. Checks if Google Chrome is installed.
2. Verifies if the installed Chrome version matches the target version.
3. Closes any existing Chrome sessions.
4. Launches Chrome using the specified profile.
5. Handles various error scenarios gracefully.
"""

import os
import subprocess
import sys
import logging
import time

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,  # Set to DEBUG to capture all levels of logs
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("manage_chrome_profile.log"),
        logging.StreamHandler(sys.stdout)
    ]
)

# Constants
CHROME_APP_PATH = "/Applications/Google Chrome.app"
CHROME_EXECUTABLE_PATH = os.path.join(CHROME_APP_PATH, "Contents/MacOS/Google Chrome")
TARGET_CHROME_VERSION = "131.0.6778.86"
TARGET_PROFILE_DIRECTORY = "Profile 1"  # Corresponding to "Autumn Ady"

def check_chrome_installed():
    """
    Check if Google Chrome is installed at the default Applications path.
    """
    logging.debug(f"Checking if Chrome is installed at {CHROME_APP_PATH}")
    if os.path.exists(CHROME_APP_PATH):
        logging.info("Google Chrome is installed.")
        return True
    else:
        logging.error("Google Chrome is not installed at the default Applications path.")
        return False

def get_chrome_version():
    """
    Retrieve the installed Google Chrome version.
    """
    logging.debug(f"Retrieving Chrome version from {CHROME_EXECUTABLE_PATH}")
    if not os.path.exists(CHROME_EXECUTABLE_PATH):
        logging.error("Chrome executable not found.")
        return None

    try:
        output = subprocess.check_output([CHROME_EXECUTABLE_PATH, "--version"], stderr=subprocess.STDOUT)
        version = output.decode('utf-8').strip().split()[-1]
        logging.info(f"Installed Chrome version: {version}")
        return version
    except subprocess.CalledProcessError as e:
        logging.error(f"Failed to get Chrome version: {e.output.decode('utf-8').strip()}")
        return None
    except Exception as e:
        logging.error(f"Unexpected error while getting Chrome version: {e}")
        return None

def close_chrome():
    """
    Close all running instances of Google Chrome using pkill.
    """
    logging.info("Attempting to close any running instances of Google Chrome.")
    try:
        # Use pkill to terminate Google Chrome processes
        subprocess.run(['pkill', '-x', 'Google Chrome'], check=True)
        logging.info("Successfully terminated all Google Chrome processes.")
        
        # Wait briefly to ensure all processes have terminated
        time.sleep(2)
    except subprocess.CalledProcessError:
        # pkill returns non-zero exit status if no processes were killed
        logging.warning("No running Google Chrome processes were found to terminate.")
    except FileNotFoundError:
        logging.error("pkill command not found. Ensure it is available on your system.")
        sys.exit(1)
    except Exception as e:
        logging.error(f"Unexpected error while trying to close Chrome: {e}")
        sys.exit(1)

def launch_chrome_with_profile(profile_directory):
    """
    Launch Google Chrome with the specified profile directory.
    """
    logging.debug(f"Launching Chrome with profile directory: {profile_directory}")
    if not os.path.exists(CHROME_EXECUTABLE_PATH):
        logging.error("Chrome executable not found.")
        return False

    try:
        subprocess.Popen([
            CHROME_EXECUTABLE_PATH,
            f'--profile-directory={profile_directory}'
        ])
        logging.info(f"Chrome launched with profile '{profile_directory}'.")
        return True
    except Exception as e:
        logging.error(f"Failed to launch Chrome with profile '{profile_directory}': {e}")
        return False

def main():
    logging.info("=== Starting Google Chrome Profile Manager ===")

    # Step 1: Check if Chrome is installed
    if not check_chrome_installed():
        sys.exit(1)

    # Step 2: Check Chrome version
    installed_version = get_chrome_version()
    if not installed_version:
        sys.exit(1)

    if installed_version != TARGET_CHROME_VERSION:
        logging.error(f"Installed Chrome version is {installed_version}, but version {TARGET_CHROME_VERSION} is required.")
        sys.exit(1)
    else:
        logging.info(f"Chrome version matches the target version: {TARGET_CHROME_VERSION}")

    # Step 3: Close any existing Chrome sessions
    close_chrome()

    # Step 4: Launch Chrome with the specified profile
    success = launch_chrome_with_profile(TARGET_PROFILE_DIRECTORY)
    if not success:
        logging.error("Failed to launch Chrome with the specified profile.")
        sys.exit(1)

    logging.info("=== Google Chrome Profile Manager completed successfully ===")

if __name__ == "__main__":
    try:
        main()
    except PermissionError:
        logging.error("Permission denied. Please ensure you have the necessary permissions to execute this script.")
        sys.exit(1)
    except Exception as e:
        logging.error(f"An unexpected error occurred: {e}")
        sys.exit(1)