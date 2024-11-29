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

user_data_dir = "https://chatgpt.com/"
profile_dir = "Default"

# Chrome Options
options = ChromeOptions()
options.add_argument(f"{user_data_dir}")
options.add_argument(f"profile-directory={profile_dir}")
options.add_argument("--start-maximized")
options.add_argument("--disable-extensions")
options.add_argument("--disable-popup-blocking")
options.add_argument("--disable-infobars")
options.add_argument("--disable-notifications")

# Logging Setup
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
        driver.get("https://chat.openai.com/chat")
        logging.info("Navigated to ChatGPT.")

        wait = WebDriverWait(driver, 60)
        try:
            message_box = wait.until(EC.presence_of_element_located((By.TAG_NAME, "textarea")))
            logging.info("ChatGPT message box located.")
        except TimeoutException:
            logging.error("ChatGPT interface did not load in time.")
            return

        MESSAGE_CONTAINER_SELECTOR = 'div[class*="message"]'
        try:
            messages_container = driver.find_element(By.CSS_SELECTOR, MESSAGE_CONTAINER_SELECTOR)
            logging.info("Message container found.")
        except NoSuchElementException:
            logging.error("Message container not found.")
            return

        previous_message_count = len(messages_container.find_elements(By.CSS_SELECTOR, '.message'))
        logging.info(f"Initial message count: {previous_message_count}")

        for prompt in prompts:
            try:
                message_box.clear()
                full_message = preamble + prompt
                human_typing(message_box, full_message)
                message_box.send_keys(Keys.ENTER)
                logging.info(f"Sent message: {full_message}")

                wait.until(lambda d: len(d.find_elements(By.CSS_SELECTOR, MESSAGE_CONTAINER_SELECTOR + ' .message')) > previous_message_count)
                all_messages = messages_container.find_elements(By.CSS_SELECTOR, '.message')
                latest_message = all_messages[-1].text.strip()
                logging.info(f"Received message: {latest_message}")
                previous_message_count = len(all_messages)

                if "generating images too quickly" in latest_message.lower():
                    match = re.search(r'wait for (\d+) minutes?', latest_message, re.IGNORECASE)
                    wait_minutes = int(match.group(1)) if match else 20
                    total_wait = wait_minutes * 2 * 60
                    logging.info(f"Pausing for {total_wait / 60} minutes due to rate limiting.")
                    time.sleep(total_wait)

                time.sleep(random.uniform(63, 122))

            except Exception as e:
                logging.error(f"An error occurred while sending prompts: {e}")
                continue

    except Exception as e:
        logging.error(f"An unexpected error occurred: {e}")
    finally:
        logging.info("All messages have been sent or an error occurred. Closing the browser.")
        driver.quit()

def main():
    """
    Main function to generate prompts, print them, and optionally send them via Selenium.
    """
    production_mode = False
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

if __name__ == "__main__":
    main()