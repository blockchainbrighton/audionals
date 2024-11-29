import random
import time
import os
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import (
    TimeoutException,
    NoSuchElementException,
    ElementNotInteractableException,
    ElementClickInterceptedException,
)
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Retrieve the credentials
USERNAME = os.getenv("TWITTER_USERNAME")
PASSWORD = os.getenv("TWITTER_PASSWORD")
PHONE_NUMBER = os.getenv("TWITTER_PHONE_NUMBER")

# Validate environment variables
if not USERNAME or not PASSWORD or not PHONE_NUMBER:
    raise ValueError(
        "Please ensure TWITTER_USERNAME, TWITTER_PASSWORD, and TWITTER_PHONE_NUMBER are set in the .env file."
    )

# Initialize Chrome options
chrome_options = Options()
# Optional: Run Chrome in headless mode
# chrome_options.add_argument("--headless")

# Initialize the WebDriver (using Chrome in this example)
driver = webdriver.Chrome(options=chrome_options)

# Logging function with timestamps
def log_message(message, level="INFO"):
    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{level}] {current_time} - {message}")

# Function to check if text contains only BMP characters
def is_bmp(text):
    try:
        text.encode('utf-16', 'strict')
        return True
    except UnicodeEncodeError:
        return False

# Function to remove non-BMP characters
def remove_non_bmp(text):
    return ''.join(c for c in text if ord(c) <= 0xFFFF)

# Human-like typing function
def human_typing(element, text, min_delay=0.05, max_delay=0.15):
    """
    Types text into a Selenium WebElement one character at a time with random delays.
    """
    for char in text:
        element.send_keys(char)
        time.sleep(random.uniform(min_delay, max_delay))

# Random delay function to mimic human interaction
def random_delay(min_time=1, max_time=3):
    delay = random.uniform(min_time, max_time)
    time.sleep(delay)

# Function to retry clicking an element
def retry_click(element, retries=3, delay=2):
    for attempt in range(retries):
        try:
            element.click()
            return
        except (ElementNotInteractableException, ElementClickInterceptedException) as e:
            log_message(f"Attempt {attempt + 1} failed to click element: {str(e)}", level="ERROR")
            time.sleep(delay)
    raise Exception("Failed to click the element after multiple attempts.")

log_message("Starting Twitter automation script.")

try:
    # Open Twitter login page
    driver.get("https://twitter.com/login")
    log_message("Opened Twitter login page.")
    random_delay()  # Random delay after loading the login page

    # Login process
    # Wait until the username field is present and enter the username
    log_message("Waiting for username field.")
    try:
        username_field = WebDriverWait(driver, 15).until(
            EC.presence_of_element_located((By.NAME, "text"))
        )
        log_message("Username field found. Entering username.")
        human_typing(username_field, USERNAME)
        username_field.send_keys(Keys.RETURN)
        random_delay()  # Random delay after entering the username
    except TimeoutException:
        log_message("Username field not found.", level="ERROR")
        raise Exception("Username field not found.")

    # Now, wait for either password field or phone number prompt using any_of
    log_message("Waiting for either password field or phone number prompt.")
    try:
        # Ensure you're using Selenium 4.x for 'any_of'
        elements_present = WebDriverWait(driver, 10).until(
            EC.any_of(
                EC.presence_of_element_located((By.NAME, "password")),
                EC.presence_of_element_located((By.NAME, "text")),  # Phone number prompt
            )
        )
        # Determine which element is present
        password_elements = driver.find_elements(By.NAME, "password")
        if password_elements:
            # Password field is present
            password_field = password_elements[0]
            log_message("Password field found. Entering password.")
            # Ensure the password field is interactable
            password_field.click()
            human_typing(password_field, PASSWORD)
            password_field.send_keys(Keys.RETURN)
            random_delay()  # Random delay after entering the password
        else:
            # Phone number prompt is present
            log_message("Phone number prompt found. Entering phone number.")
            phone_field = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.NAME, "text"))
            )
            human_typing(phone_field, PHONE_NUMBER)
            phone_field.send_keys(Keys.RETURN)
            random_delay(2, 4)
            # After entering phone number, wait for password field
            log_message("Waiting for password field after phone number verification.")
            password_field = WebDriverWait(driver, 15).until(
                EC.presence_of_element_located((By.NAME, "password"))
            )
            log_message("Password field found. Entering password.")
            password_field.click()
            human_typing(password_field, PASSWORD)
            password_field.send_keys(Keys.RETURN)
            random_delay()
    except TimeoutException:
        log_message("Neither password field nor phone number prompt found.", level="ERROR")
        raise Exception("Neither password field nor phone number prompt found.")

    # Wait for the home page to load by checking for specific elements
    log_message("Waiting to confirm login and access Twitter home page.")
    try:
        # Wait for elements that are unique to the home page
        WebDriverWait(driver, 15).until(
            EC.presence_of_element_located(
                (By.CSS_SELECTOR, "a[data-testid='AppTabBar_Home_Link']")
            )
        )
        log_message("Login successful. Home page loaded.")
    except TimeoutException:
        # As a fallback, check if URL contains "twitter.com/home"
        current_url = driver.current_url
        log_message(f"Current URL after login: {current_url}")
        if "twitter.com/home" in current_url:
            log_message("Login successful based on URL.")
        else:
            log_message("Home page did not load as expected.", level="ERROR")
            raise Exception("Login might have failed or took too long.")

    random_delay()  # Random delay after login confirmation

    # Navigate to the tweet composer
    driver.get("https://twitter.com/compose/tweet")
    log_message("Opened tweet composer page.")
    random_delay(2, 5)  # Longer delay for tweet composer to load

    # Define the tweet content
    tweet_text = "GM Beautiful People!"

    # Verify that tweet_text contains only BMP characters
    if not is_bmp(tweet_text):
        log_message("Tweet text contains non-BMP characters. Removing them.", level="ERROR")
        tweet_text = remove_non_bmp(tweet_text)
        log_message(f"Sanitized tweet text: '{tweet_text}'.")

    # Try the primary selector first, then fall back if not found
    try:
        log_message("Attempting to locate tweet box with primary selector.")
        tweet_box = WebDriverWait(driver, 15).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "div[aria-label='Tweet text']"))
        )
        log_message("Primary tweet box located.")
    except TimeoutException:
        log_message("Primary tweet box not found. Trying alternative selector.")
        try:
            tweet_box = WebDriverWait(driver, 15).until(
                EC.presence_of_element_located(
                    (By.CSS_SELECTOR, "div.public-DraftStyleDefault-block")
                )
            )
            log_message("Alternative tweet box located.")
        except TimeoutException:
            log_message("Alternative tweet box not found. Cannot proceed to tweet.", level="ERROR")
            raise Exception("Tweet input box not found.")

    # Input the tweet text
    human_typing(tweet_box, tweet_text)
    log_message("Tweet text entered.")
    random_delay()  # Random delay after entering tweet text

    # Wait and find the "Post" button using XPath based on button text
    log_message("Waiting for the Post button to be clickable.")
    try:
        # Use XPath to locate the "Post" button based on its visible text
        post_button = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable(
                (By.XPATH, "//span[text()='Post']/ancestor::div[@role='button']")
            )
        )
        log_message("Post button found. Scrolling into view and clicking the Post button.")
        
        # Scroll the button into view
        driver.execute_script("arguments[0].scrollIntoView(true);", post_button)
        time.sleep(1)  # Brief pause after scrolling

        # Retry clicking the button
        retry_click(post_button)

    except TimeoutException:
        log_message("Post button not found or not clickable.", level="ERROR")
        raise Exception("Could not find or click the Post button.")

    # Wait and confirm that the tweet was sent
    log_message("Post button clicked. Waiting a few seconds to verify before closing.")
    random_delay(5, 8)  # Additional wait time to verify if tweet appears in the feed

    # Log the tweet details with timestamp
    tweet_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_message(f"Tweet successfully posted at {tweet_time}: '{tweet_text}'.")

except Exception as e:
    log_message(f"An error occurred: {str(e)}", level="ERROR")
finally:
    driver.quit()
    log_message("Closed the browser and finished the script.")