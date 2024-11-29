import random
import time
import re
import logging
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

# Specify the profile directory
profile_dir = "Default"  # Replace "Default" with "Profile 1", "Profile 2", etc., if needed

# Chrome Options
options = ChromeOptions()
options.add_argument(f"user-data-dir=/Users/<your-username>/Library/Application Support/Google/Chrome")
options.add_argument(f"profile-directory={profile_dir}")
options.add_argument("--start-maximized")
options.add_argument("--disable-extensions")
options.add_argument("--disable-popup-blocking")
options.add_argument("--disable-infobars")
options.add_argument("--disable-notifications")
# Uncomment the next line if you want to see the browser actions
# options.add_argument("--headless")  # Headless mode can be disabled for observation

# Logging Setup
logging.basicConfig(
    level=logging.INFO,  # Change to DEBUG for more verbose logs
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
        driver = uc.Chrome(options=options)
        logging.info("Chrome WebDriver initialized successfully.")
        # Add a delay to allow the browser to open
        time.sleep(5)
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

def human_typing(element, text, min_delay=0.1, max_delay=0.3):
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
        logging.info("Navigating to ChatGPT...")
        driver.get("https://chat.openai.com/chat")
        # Allow time for the page to load
        time.sleep(10)  # Adjust as necessary

        logging.info("Waiting for ChatGPT message box to load...")
        wait = WebDriverWait(driver, 120)  # Increased wait time
        try:
            message_box = wait.until(EC.presence_of_element_located((By.TAG_NAME, "textarea")))
            logging.info("ChatGPT message box located.")
            # Optional: Highlight the message box
            driver.execute_script("arguments[0].style.border='3px solid red'", message_box)
            time.sleep(2)  # Allow time to see the highlighted box
        except TimeoutException:
            logging.error("ChatGPT interface did not load in time.")
            # Capture screenshot for debugging
            driver.save_screenshot("timeout_error.png")
            logging.info("Screenshot saved as 'timeout_error.png'. Please inspect the page.")
            # Pause the script to allow manual inspection
            input("Press Enter after inspecting the page to continue...")
            return

        MESSAGE_CONTAINER_SELECTOR = 'div[class*="message"]'
        try:
            messages_container = driver.find_element(By.CSS_SELECTOR, MESSAGE_CONTAINER_SELECTOR)
            logging.info("Message container found.")
            # Optional: Highlight the messages container
            driver.execute_script("arguments[0].style.border='3px solid green'", messages_container)
            time.sleep(2)  # Allow time to see the highlighted container
        except NoSuchElementException:
            logging.error("Message container not found.")
            # Capture screenshot for debugging
            driver.save_screenshot("message_container_not_found.png")
            logging.info("Screenshot saved as 'message_container_not_found.png'. Please inspect the page.")
            # Pause the script to allow manual inspection
            input("Press Enter after inspecting the page to continue...")
            return

        previous_message_count = len(messages_container.find_elements(By.CSS_SELECTOR, '.message'))
        logging.info(f"Initial message count: {previous_message_count}")
        time.sleep(2)  # Allow time before starting to send prompts

        for idx, prompt in enumerate(prompts, start=1):
            try:
                logging.info(f"Processing prompt {idx}/{len(prompts)}")
                message_box.clear()
                full_message = preamble + prompt
                logging.info(f"Typing message: {full_message}")
                human_typing(message_box, full_message)
                time.sleep(1)  # Short pause before sending
                message_box.send_keys(Keys.ENTER)
                logging.info(f"Sent message: {full_message}")

                # Wait for the response message to appear
                wait.until(lambda d: len(d.find_elements(By.CSS_SELECTOR, MESSAGE_CONTAINER_SELECTOR + ' .message')) > previous_message_count)
                all_messages = messages_container.find_elements(By.CSS_SELECTOR, '.message')
                latest_message = all_messages[-1].text.strip()
                logging.info(f"Received message: {latest_message}")
                previous_message_count = len(all_messages)

                if "generating images too quickly" in latest_message.lower():
                    match = re.search(r'wait for (\d+) minutes?', latest_message, re.IGNORECASE)
                    wait_minutes = int(match.group(1)) if match else 20
                    total_wait = wait_minutes * 2 * 60  # Multiply by 2 for safety
                    logging.warning(f"Rate limiting detected. Pausing for {total_wait / 60} minutes.")
                    time.sleep(total_wait)

                # Add a longer delay to observe the interaction
                time.sleep(random.uniform(65, 125))  # Increased delay

            except TimeoutException as e:
                logging.error(f"Timeout while waiting for the response to prompt '{prompt}': {e}")
                driver.save_screenshot(f"timeout_prompt_{idx}.png")
                logging.info(f"Screenshot saved as 'timeout_prompt_{idx}.png'.")
                input("Press Enter after inspecting the page to continue...")
                continue
            except NoSuchElementException as e:
                logging.error(f"Element not found while processing prompt '{prompt}': {e}")
                driver.save_screenshot(f"no_element_prompt_{idx}.png")
                logging.info(f"Screenshot saved as 'no_element_prompt_{idx}.png'.")
                input("Press Enter after inspecting the page to continue...")
                continue
            except Exception as e:
                logging.error(f"An unexpected error occurred while processing prompt '{prompt}': {e}")
                driver.save_screenshot(f"error_prompt_{idx}.png")
                logging.info(f"Screenshot saved as 'error_prompt_{idx}.png'.")
                input("Press Enter after inspecting the page to continue...")
                continue

    except Exception as e:
        logging.error(f"An unexpected error occurred in send_prompts_via_selenium: {e}")
        driver.save_screenshot("unexpected_error.png")
        logging.info("Screenshot saved as 'unexpected_error.png'. Please inspect the page.")
        input("Press Enter after inspecting the page to continue...")
    finally:
        logging.info("Script has completed execution. The browser will remain open for inspection.")
        # Optionally, keep the browser open or allow the user to close it manually
        # To automatically close after a delay, uncomment the next line
        # time.sleep(10)
        # driver.quit()

def main():
    """
    Main function to generate prompts, print them, and optionally send them via Selenium.
    """
    production_mode = False  # Set to True to disable automation
    number_of_prompts = 100
    preamble = "Please create the following image: "
    prompts = generate_unique_prompts(number_of_prompts)
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
        # Keep the browser open after automation completes
        logging.info("Automation completed. You can inspect the browser manually.")
        input("Press Enter to close the browser and exit the script...")
        driver.quit()

if __name__ == "__main__":
    main()