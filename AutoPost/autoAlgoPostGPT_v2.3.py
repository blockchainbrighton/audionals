import random
import time
import re
import logging
import os
import platform

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.options import Options as ChromeOptions
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import (
    SessionNotCreatedException,
    NoSuchElementException,
    TimeoutException
)
import undetected_chromedriver as uc

# ===========================
# Configuration and Setup
# ===========================

# Function to expand user path
def expand_path(path):
    return os.path.expanduser(path)

# Set path to your cloned Chrome user data directory and profile directory
user_data_dir = expand_path("~/Library/Application Support/Google/Chrome Auto")
profile_dir = "Default"  # Change if your cloned profile uses a different directory

# Path to the "Google Chrome Auto" executable
chrome_binary_path = "/Applications/Google Chrome Auto.app/Contents/MacOS/Google Chrome"

# Verify that the Chrome executable exists
if not os.path.exists(chrome_binary_path):
    raise FileNotFoundError(f"Chrome executable not found at {chrome_binary_path}")

# Create Chrome options
options = ChromeOptions()
options.add_argument(f"user-data-dir={user_data_dir}")          # Path to Chrome user data
options.add_argument(f"profile-directory={profile_dir}")       # Path to your specific profile
options.binary_location = chrome_binary_path                    # Specify the Chrome binary

# Additional options to ensure a fresh window and proper navigation
options.add_argument("--start-maximized")                       # Start maximized
options.add_argument("--disable-extensions")                    # Disable extensions for consistency
options.add_argument("--disable-popup-blocking")                # Disable popup blocking
options.add_argument("--disable-infobars")                      # Disable infobars
options.add_argument("--disable-notifications")                 # Disable notifications
options.add_argument("--no-sandbox")                            # Bypass OS security model
options.add_argument("--disable-dev-shm-usage")                 # Overcome limited resource problems

# Optional: Ensure Selenium opens a new window instead of a new tab
options.add_argument("--new-window")                            # Force opening a new window

# Initialize logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("selenium_automation.log"),
        logging.StreamHandler()
    ]
)

def initialize_driver():
    """
    Initializes the Selenium WebDriver with specified options.
    Returns: webdriver.Chrome: Chrome WebDriver instance.
    """
    try:
        # Initialize undetected_chromedriver with the specified options
        driver = uc.Chrome(options=options)
        logging.info("Chrome WebDriver initialized successfully.")
        return driver
    except SessionNotCreatedException as e:
        logging.error(f"Session not created: {e}")
    except Exception as e:
        logging.error(f"Error initializing WebDriver: {e}")
    return None

# ===========================
# Define Prompt Components
# ===========================

central_styles = ["Electric Blue", "Mirror-Finished", "Glow-in-the-Dark", "Monochrome Block", "Steampunk Iron"]
headphone_types = ["Oversized LED Headphones", "Classic 70s Over-Ear Headphones", "Colorful Spectrum Headphones"]
themes = ["Cyber Graffiti", "Vintage Chrome", "Bio-Nature Fusion", "Minimalist Noir", "Venetian Elegance", "Glacier Chill"]
settings = ["Vibrant Street Graffiti Wall", "Victorian Machinery Background", "Dynamic Electric Field", "Luminous Energy Vortex"]

def generate_prompt():
    """
    Generates a single prompt by selecting one element from each category.
    """
    central_style = random.choice(central_styles)
    headphone_type = random.choice(headphone_types)
    theme = random.choice(themes)
    setting = random.choice(settings)
    return f"\"{central_style} 'Letter A' wearing {headphone_type}. Theme: {theme}. Set in a {setting}.\""

def generate_unique_prompts(n):
    """
    Generates a specified number of unique prompts.
    Parameters: n (int): Number of unique prompts to generate.
    Returns: list: A list containing unique prompt strings.
    """
    prompts = set()
    attempts = 0
    max_attempts = n * 10
    while len(prompts) < n and attempts < max_attempts:
        prompts.add(generate_prompt())
        attempts += 1
    if len(prompts) < n:
        logging.warning(f"Only generated {len(prompts)} unique prompts out of requested {n}.")
    return list(prompts)

def human_typing(element, text, min_delay=0.05, max_delay=0.2):
    """
    Types text into a Selenium WebElement one character at a time with random delays.
    """
    for char in text:
        element.send_keys(char)
        time.sleep(random.uniform(min_delay, max_delay))

def recursive_print_prompts(prompts, current=0, max_count=100):
    """
    Recursively prints the first max_count prompts from the prompts list.
    """
    if current >= max_count or current >= len(prompts):
        return
    print(f"{current + 1}. {prompts[current]}")
    recursive_print_prompts(prompts, current + 1, max_count)

def send_prompts_via_selenium(driver, prompts, preamble):
    """
    Sends the prompts via Selenium automation.
    """
    try:
        # Navigate to ChatGPT
        driver.get("https://chat.openai.com/chat")
        logging.info("Navigated to ChatGPT.")

        # Wait until the page is fully loaded and ChatGPT interface is ready
        wait = WebDriverWait(driver, 60)
        try:
            # Adjust the selector below based on ChatGPT's actual message input box
            message_box = wait.until(EC.presence_of_element_located((By.TAG_NAME, "textarea")))
            logging.info("ChatGPT message box located.")
        except TimeoutException:
            logging.error("ChatGPT interface did not load in time.")
            return

        # Define a selector for the message container (adjust as needed)
        MESSAGE_CONTAINER_SELECTOR = 'div[class*="message"]'  # Example selector; verify with actual ChatGPT HTML
        try:
            messages_container = driver.find_element(By.CSS_SELECTOR, MESSAGE_CONTAINER_SELECTOR)
            logging.info("Message container found.")
        except NoSuchElementException:
            logging.error("Message container not found.")
            return

        # Initialize message count
        previous_message_count = len(messages_container.find_elements(By.CSS_SELECTOR, '.message'))
        logging.info(f"Initial message count: {previous_message_count}")

        for prompt in prompts:
            try:
                # Clear the message box before typing (optional)
                message_box.clear()

                # Combine preamble with the prompt
                full_message = preamble + prompt

                # Type the full message with human-like delays
                human_typing(message_box, full_message)

                # Press Enter to send the message
                message_box.send_keys(Keys.ENTER)

                logging.info(f"Sent message: {full_message}")

                # Wait for the response message to appear
                try:
                    # Define a wait with a timeout (e.g., 60 seconds)
                    wait = WebDriverWait(driver, 60)

                    # Wait until the number of messages increases
                    wait.until(lambda d: len(d.find_elements(By.CSS_SELECTOR, MESSAGE_CONTAINER_SELECTOR + ' .message')) > previous_message_count)

                    # After the new message appears, get all messages
                    all_messages = messages_container.find_elements(By.CSS_SELECTOR, '.message')

                    # Get the latest message
                    latest_message = all_messages[-1].text.strip()

                    logging.info(f"Received message: {latest_message}")

                    # Update the previous_message_count
                    previous_message_count = len(all_messages)

                    # Check for rate limit message
                    if "generating images too quickly" in latest_message.lower():
                        logging.warning("Rate limit message detected.")

                        # Try to extract the wait time in minutes
                        match = re.search(r'wait for (\d+) minutes?', latest_message, re.IGNORECASE)
                        if match:
                            wait_minutes = int(match.group(1))
                            total_wait = (wait_minutes * 2) * 60  # Convert to seconds and double for safety
                            logging.info(f"Detected wait time: {wait_minutes} minutes. Pausing for {wait_minutes + 2} minutes for safety.")
                        else:
                            # Default wait time if specific time not mentioned
                            total_wait = 20 * 60  # 20 minutes in seconds
                            logging.info("No specific wait time detected. Pausing for 20 minutes.")

                        logging.info(f"Pausing for {total_wait / 60} minutes due to rate limiting.")
                        time.sleep(total_wait)
                        logging.info("Resuming after pause.")

                except TimeoutException:
                    logging.error("Timed out waiting for ChatGPT's response.")
                    continue

                # Wait for a random duration before sending the next prompt
                wait_time = random.uniform(63, 122)  # 63 to 122 seconds
                logging.info(f"Waiting for {int(wait_time)} seconds before next message...\n")
                time.sleep(wait_time)

            except Exception as e:
                logging.error(f"An error occurred while sending prompts: {e}")
                continue

    except Exception as e:
        logging.error(f"An unexpected error occurred: {e}")
    finally:
        # Optional: Close the browser after all prompts are sent
        logging.info("All messages have been sent or an error occurred. Closing the browser.")
        driver.quit()

def main():
    """
    Main function to generate prompts, print them, and optionally send them via Selenium.
    """
    production_mode = False  # Set to True to only print prompts; False to enable Selenium automation
    number_of_prompts = 100
    preamble = "Please create the following image: "
    prompts = generate_unique_prompts(number_of_prompts)

    # Print the first 100 prompts for verification
    print("\n--- First 100 Generated Prompts ---\n")
    recursive_print_prompts(prompts, 0, 100)
    print("\n--- End of Prompts ---\n")

    if production_mode:
        print("Production Mode: ON\nAutomation is disabled. Only prompts have been printed.\n")
    else:
        print("Production Mode: OFF\nAutomation is enabled. Sending prompts via Selenium...\n")
        driver = initialize_driver()
        if not driver:
            logging.error("WebDriver initialization failed. Exiting script.")
            return
        send_prompts_via_selenium(driver, prompts, preamble)

if __name__ == "__main__":
    main()
