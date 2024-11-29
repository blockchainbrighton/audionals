#!/usr/bin/env python3
"""
This script manages Google Chrome on a MacBook Air by ensuring it runs with a specific profile.
It performs the following tasks:
1. Checks if Google Chrome is installed.
2. Verifies if the installed Chrome version matches the target version.
3. Determines if Chrome is currently running.
4. Retrieves the directory path of the specified profile.
5. Launches Chrome with the specified profile if it's not running.
6. If Chrome is running, opens a new window with the specified profile without disrupting other profiles.
7. Handles various error scenarios gracefully.
"""

import os
import subprocess
import json
import sys
import shutil
import logging

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
LOCAL_STATE_PATH = os.path.expanduser("~/Library/Application Support/Google/Chrome/Local State")
TARGET_CHROME_VERSION = "131.0.6778.86"
TARGET_PROFILE_NAME = "Autumn Ady"

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

def is_chrome_running():
    """
    Check if Google Chrome is currently running using AppleScript.
    """
    logging.debug("Checking if Google Chrome is currently running.")
    try:
        script = 'tell application "System Events" to (name of processes) contains "Google Chrome"'
        result = subprocess.check_output(['osascript', '-e', script]).strip()
        is_running = result.lower() == b'true'
        logging.info(f"Is Chrome running? {'Yes' if is_running else 'No'}")
        return is_running
    except subprocess.CalledProcessError as e:
        logging.error(f"AppleScript execution failed: {e}")
        return False
    except Exception as e:
        logging.error(f"Unexpected error while checking if Chrome is running: {e}")
        return False

def get_profile_directory(profile_name):
    """
    Parse the Local State file to find the directory of the specified profile name.
    """
    logging.debug(f"Retrieving profile directory for profile name: {profile_name}")
    if not os.path.exists(LOCAL_STATE_PATH):
        logging.error("Local State file not found. Chrome might not have been run yet.")
        return None

    try:
        with open(LOCAL_STATE_PATH, 'r', encoding='utf-8') as f:
            data = json.load(f)

        # Navigate the JSON structure to find profiles
        profiles_info = data.get('profile', {}).get('info_cache', {})
        for profile_id, profile_info in profiles_info.items():
            name = profile_info.get('name')
            path = profile_info.get('profile_path')
            logging.debug(f"Found profile - Name: {name}, Path: {path}")
            if name == profile_name:
                logging.info(f"Profile '{profile_name}' found with directory '{path}'.")
                return path

        logging.error(f"Profile '{profile_name}' not found.")
        return None

    except json.JSONDecodeError:
        logging.error("Failed to parse Local State file. It may be corrupted.")
        return None
    except Exception as e:
        logging.error(f"Unexpected error while reading Local State file: {e}")
        return None

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
        logging.info(f"Chrome launched with profile '{TARGET_PROFILE_NAME}'.")
        return True
    except Exception as e:
        logging.error(f"Failed to launch Chrome with profile '{TARGET_PROFILE_NAME}': {e}")
        return False

def open_new_window_with_profile(profile_directory):
    """
    Open a new Chrome window with the specified profile using AppleScript.
    This avoids disrupting existing Chrome windows and profiles.
    """
    logging.debug(f"Opening new Chrome window with profile directory: {profile_directory}")
    try:
        # AppleScript to open a new window with the specified profile
        script = f'''
        tell application "Google Chrome"
            make new window with properties {{profile:"{profile_directory}"}}
            activate
        end tell
        '''
        subprocess.run(['osascript', '-e', script], check=True)
        logging.info(f"Opened new Chrome window with profile '{TARGET_PROFILE_NAME}'.")
        return True
    except subprocess.CalledProcessError as e:
        logging.error(f"AppleScript failed to open new window with profile '{TARGET_PROFILE_NAME}': {e}")
        return False
    except Exception as e:
        logging.error(f"Unexpected error while opening new window with profile '{TARGET_PROFILE_NAME}': {e}")
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

    # Step 3: Get profile directory for the specified profile name
    profile_directory = get_profile_directory(TARGET_PROFILE_NAME)
    if not profile_directory:
        sys.exit(1)  # Error message already printed in get_profile_directory

    # Step 4: Check if Chrome is running
    chrome_running = is_chrome_running()

    if not chrome_running:
        logging.info("Chrome is not running. Attempting to launch Chrome with the specified profile.")
        # Chrome is not running; launch it with the specified profile
        success = launch_chrome_with_profile(profile_directory)
        if not success:
            sys.exit(1)
    else:
        logging.info("Chrome is already running. Attempting to open a new window with the specified profile.")
        # Chrome is running; attempt to open a new window with the specified profile
        success = open_new_window_with_profile(profile_directory)
        if not success:
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