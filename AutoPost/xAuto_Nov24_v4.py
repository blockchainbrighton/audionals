# main
#xAuto_Nov24_v4.py

"""
This script manages Google Chrome on a MacBook Air by ensuring it runs with a specific profile.
It performs the following tasks:
1. Checks if Google Chrome is installed.
2. Verifies if the installed Chrome version matches the target version.
3. Closes any existing Chrome sessions.
4. Launches Chrome using the specified profile.
5. Navigates to a target URL.
6. Types a specified message into an input field.
7. Clicks the send button to submit the message.
8. Handles various error scenarios gracefully.
"""

import os
import subprocess
import sys
import logging
import time
from selenium import webdriver
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.common.exceptions import (
    WebDriverException,
    NoSuchElementException,
    TimeoutException,
)
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

import human_simulation  # Import the human_simulation module


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
CHROMEDRIVER_PATH = "/usr/local/bin/chromedriver"  # Update this path if necessary
TARGET_CHROME_VERSION = "131.0.6778.86"
TARGET_PROFILE_DIRECTORY = "Profile 1"  # Corresponding to "Autumn Ady"
TARGET_URL = "https://chatgpt.com/"
MESSAGE_TEXT = "Please create an image of a Crypto Green 'Letter A' wearing Wooden Ear-Cup Headphones. Theme: Holographic Display. Set in a Vibrant Underwater Reef."


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


def setup_selenium_driver(profile_directory):
    """
    Set up the Selenium WebDriver with the specified Chrome profile.
    """
    logging.debug("Setting up Selenium WebDriver.")
    chrome_options = Options()
    chrome_options.add_argument(f'--profile-directory={profile_directory}')
    chrome_options.add_argument("--start-maximized")
    chrome_options.add_argument("--disable-infobars")
    chrome_options.add_argument("--disable-extensions")
    
    # Optional: Run Chrome in headless mode
    # chrome_options.add_argument("--headless")
    
    try:
        service = ChromeService(executable_path=CHROMEDRIVER_PATH)
        driver = webdriver.Chrome(service=service, options=chrome_options)
        logging.info("Selenium WebDriver initialized successfully.")
        return driver
    except FileNotFoundError:
        logging.error(f"ChromeDriver not found at path: {CHROMEDRIVER_PATH}. Please ensure ChromeDriver is installed and the path is correct.")
        sys.exit(1)
    except WebDriverException as e:
        logging.error(f"Failed to initialize Selenium WebDriver: {e}")
        sys.exit(1)
    except Exception as e:
        logging.error(f"Unexpected error while setting up Selenium WebDriver: {e}")
        sys.exit(1)


def navigate_to_url(driver, url):
    """
    Navigate the WebDriver to the specified URL.
    """
    logging.info(f"Navigating to URL: {url}")
    try:
        driver.get(url)
        logging.info("Navigation successful.")
    except WebDriverException as e:
        logging.error(f"Failed to navigate to URL '{url}': {e}")
        driver.quit()
        sys.exit(1)
    except Exception as e:
        logging.error(f"Unexpected error while navigating to URL '{url}': {e}")
        driver.quit()
        sys.exit(1)


def type_message(driver, message):
    """
    Type the specified message into the input field in a human-like manner.
    """
    logging.info("Attempting to locate the message input field.")
    try:
        # Wait until the input field is present and clickable
        wait = WebDriverWait(driver, 20)
        input_field = wait.until(EC.presence_of_element_located(
            (By.CSS_SELECTOR, 'p[data-placeholder="Message ChatGPT"].placeholder')
        ))
        logging.info("Message input field located.")
        
        # Click to focus on the input field
        input_field.click()
        human_simulation.human_pause(0.5, 1.5)  # Pause before typing
        
        # Type the message using human-like simulation
        human_simulation.type_text(driver, input_field, message)
    except TimeoutException:
        logging.error("Timed out waiting for the message input field to appear.")
        driver.quit()
        sys.exit(1)
    except NoSuchElementException:
        logging.error("Message input field not found on the page.")
        driver.quit()
        sys.exit(1)
    except Exception as e:
        logging.error(f"Unexpected error while typing the message: {e}")
        driver.quit()
        sys.exit(1)


def send_message(driver):
    """
    Click the send button to submit the message in a human-like manner.
    """
    logging.info("Attempting to locate the send button.")
    try:
        # Wait until the send button is clickable
        wait = WebDriverWait(driver, 20)
        send_button = wait.until(EC.element_to_be_clickable(
            (By.CSS_SELECTOR, 'svg.icon-2xl')
        ))
        logging.info("Send button located.")
        
        # Click the send button using human-like simulation
        human_simulation.click_element(driver, send_button)
    except TimeoutException:
        logging.error("Timed out waiting for the send button to become clickable.")
        driver.quit()
        sys.exit(1)
    except NoSuchElementException:
        logging.error("Send button not found on the page.")
        driver.quit()
        sys.exit(1)
    except Exception as e:
        logging.error(f"Unexpected error while clicking the send button: {e}")
        driver.quit()
        sys.exit(1)


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

    # Step 4: Set up Selenium WebDriver with the specified profile
    driver = setup_selenium_driver(TARGET_PROFILE_DIRECTORY)

    # Step 5: Navigate to the target URL
    navigate_to_url(driver, TARGET_URL)

    # Optional: Wait for the page to load completely
    human_simulation.human_pause(2, 4)

    # Step 6: Type the specified message into the input field
    type_message(driver, MESSAGE_TEXT)

    # Optional: Pause before sending the message
    human_simulation.human_pause(1, 2)

    # Step 7: Click the send button to submit the message
    send_message(driver)

    # Optional: Keep the browser open for a while to observe the result
    logging.info("Message sent successfully. Keeping the browser open for 30 seconds.")
    time.sleep(30)

    # Close the browser
    logging.info("Closing the browser.")
    driver.quit()

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