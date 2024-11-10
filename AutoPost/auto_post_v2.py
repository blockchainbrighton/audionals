import random
import time
import os
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from dotenv import load_dotenv



# Initialize the WebDriver (using Chrome in this example)
driver = webdriver.Chrome()

# Logging function
def log_message(message):
    print(f"[INFO] {message}")

# Random delay function to mimic human interaction
def random_delay(min_time=1, max_time=3):
    delay = random.uniform(min_time, max_time)
    time.sleep(delay)

log_message("Starting Twitter automation script.")

# Open Twitter login page
driver.get("https://twitter.com/login")
log_message("Opened Twitter login page.")
random_delay()  # Random delay after loading the login page


# Load environment variables from .env file
load_dotenv()

# Retrieve the credentials
username = os.getenv("TWITTER_USERNAME")
password = os.getenv("TWITTER_PASSWORD")
phone_number = os.getenv("TWITTER_PHONE_NUMBER")



# Login process
try:
    # Wait until the username field is present and enter the username
    log_message("Waiting for username field.")
    username_field = WebDriverWait(driver, 15).until(
        EC.presence_of_element_located((By.NAME, "text"))
    )
    log_message("Username field found. Entering username.")
    username_field.send_keys(username)
    username_field.send_keys(Keys.RETURN)
    random_delay()  # Random delay after entering the username

    # Check for unusual login activity prompt
    verification_required = False
    attempt_count = 0
    max_attempts = 3

    while not verification_required and attempt_count < max_attempts:
        attempt_count += 1
        try:
            log_message("Checking for unusual login activity prompt.")
            phone_username_field = WebDriverWait(driver, 5).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "input[name='text']"))
            )
            log_message("Unusual login activity prompt found. Entering username or phone number.")
            phone_username_field.send_keys(username)
            phone_username_field.send_keys(Keys.RETURN)
            verification_required = True
            random_delay(2, 4)
        except:
            log_message("No unusual login activity prompt found on this attempt. Continuing.")
            break

    # Retry logic for password field
    password_filled = False
    attempt_count = 0
    max_attempts = 3

    while not password_filled and attempt_count < max_attempts:
        attempt_count += 1
        try:
            log_message(f"Attempt {attempt_count}: Waiting for password field.")
            password_field = WebDriverWait(driver, 15).until(
                EC.presence_of_element_located((By.NAME, "password"))
            )
            log_message("Password field found. Entering password.")
            password_field.send_keys(password)
            password_field.send_keys(Keys.RETURN)
            password_filled = True
            random_delay()  # Random delay after entering the password
        except:
            log_message("Password field not located on this attempt. Retrying...")
            random_delay(2, 4)  # Small delay before retrying

    if not password_filled:
        log_message("Failed to fill password field after multiple attempts.")
        driver.quit()
        raise Exception("Could not locate password field.")

    # Wait for the home page to load
    log_message("Waiting to confirm login and access Twitter home page.")
    WebDriverWait(driver, 15).until(
        EC.url_contains("twitter.com/home")
    )
    log_message("Login successful. Navigating to tweet composer.")
    random_delay()  # Random delay after login

    # Navigate to the tweet composer
    driver.get("https://twitter.com/compose/tweet")
    log_message("Opened tweet composer page.")
    random_delay(2, 5)  # Longer delay for tweet composer to load

    # Define the tweet content
    tweet_text = "Hello, Twitter! This is an automated tweet."

    # Try the primary selector first, then fall back if not found
    try:
        log_message("Attempting to locate tweet box with primary selector.")
        tweet_box = WebDriverWait(driver, 15).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "div[aria-label='Tweet text']"))
        )
        log_message("Primary tweet box located.")
    except:
        log_message("Primary tweet box not found. Trying alternative selector.")
        tweet_box = WebDriverWait(driver, 15).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "div.public-DraftStyleDefault-block"))
        )
        log_message("Alternative tweet box located.")

    # Input the tweet text
    tweet_box.send_keys(tweet_text)
    log_message("Tweet text entered.")
    random_delay()  # Random delay after entering tweet text

    # Wait and find the "Tweet" button, then click it
    log_message("Waiting for the Tweet button to be clickable.")
    tweet_button = WebDriverWait(driver, 10).until(
        EC.element_to_be_clickable((By.CSS_SELECTOR, "div[data-testid='tweetButtonInline']"))
    )
    log_message("Tweet button found. Clicking the Tweet button.")
    tweet_button.click()

    # Wait and confirm that the tweet was sent
    log_message("Tweet sent. Waiting a few seconds to verify before closing.")
    random_delay(5, 8)  # Additional wait time to verify if tweet appears in the feed
finally:
    driver.quit()
    log_message("Closed the browser and finished the script.")