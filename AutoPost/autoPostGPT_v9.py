import time
import logging
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.options import Options as ChromeOptions
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.action_chains import ActionChains
from webdriver_manager.chrome import ChromeDriverManager

logging.basicConfig(level=logging.INFO)

def initialize_driver():
    """
    Initializes the Selenium WebDriver with specified options.
    Returns: webdriver.Chrome: Chrome WebDriver instance.
    """
    try:
        # Configure Chrome options
        options = ChromeOptions()
        user_data_dir = "/Users/jim.btc/Library/Application Support/Google/Chrome"
        profile_directory = "Profile 1"  # Use your desired profile

        options.add_argument(f"--user-data-dir={user_data_dir}")
        options.add_argument(f"--profile-directory={profile_directory}")

        # Additional options to prevent common errors
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--disable-gpu")

        # Optional: Run in headless mode
        # options.add_argument("--headless")

        # Initialize the Chrome WebDriver using webdriver-manager
        driver = webdriver.Chrome(
            service=webdriver.chrome.service.Service(ChromeDriverManager().install()),
            options=options
        )
        logging.info("Chrome WebDriver initialized successfully.")
        return driver
    except Exception as e:
        logging.error(f"Error initializing WebDriver: {e}")
        return None


def main():
    # Initialize the Chrome WebDriver
    logging.info("Setting up Selenium WebDriver with separate Chrome profile...")
    driver = initialize_driver()
    if not driver:
        logging.error("Failed to initialize the WebDriver. Exiting.")
        return

    try:
        # Navigate to the ChatGPT website
        logging.info("Navigating to ChatGPT website...")
        driver.get("https://chat.openai.com")

        # Confirm the page has loaded
        logging.info("Waiting for the page title to contain 'ChatGPT'...")
        WebDriverWait(driver, 10).until(EC.title_contains("ChatGPT"))
        logging.info("Page title confirmed. Page has loaded.")

        # Wait for the prompt textarea to load
        logging.info("Waiting for the prompt textarea to load...")
        prompt_area = WebDriverWait(driver, 20).until(
            EC.presence_of_element_located((By.ID, "prompt-textarea"))
        )
        logging.info("Found the prompt textarea.")

        # Move to the prompt textarea and click it to ensure the cursor is activated
        actions = ActionChains(driver)
        actions.move_to_element(prompt_area).click().perform()
        time.sleep(1)

        # Clear any existing text
        logging.info("Clearing existing text in the prompt textarea...")
        prompt_area.send_keys(Keys.CONTROL + "a")  # Use CMD on macOS if needed
        prompt_area.send_keys(Keys.DELETE)

        # Type "TEST" one character at a time with a 1-second delay between each
        text_to_type = "TEST"
        logging.info("Typing 'TEST' character by character...")
        for char in text_to_type:
            prompt_area.send_keys(char)
            logging.info(f"Typed '{char}'")
            time.sleep(1)  # 1-second delay between characters

        logging.info("Typing complete.")

    except Exception as e:
        logging.error(f"An error occurred: {e}")

    finally:
        # Close the browser after a short delay
        time.sleep(5)
        logging.info("Closing the browser...")
        driver.quit()


if __name__ == "__main__":
    main()
