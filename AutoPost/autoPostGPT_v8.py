import subprocess
import time
import logging
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.action_chains import ActionChains
from webdriver_manager.chrome import ChromeDriverManager

def open_separate_chrome_instance():
    """
    Launches a separate Chrome instance using a specific profile.
    """
    # Chrome profile folder details
    user_data_dir = "/Users/jim.btc/Library/Application Support/Google/Chrome"
    profile_dir = "Profile 1"

    # Chrome Options
    options = ChromeOptions()
    options.add_argument(f"user-data-dir={user_data_dir}")
    options.add_argument(f"profile-directory={profile_dir}")

    # Initialize the driver
    driver = webdriver.Chrome(options=options)


    # Open a website to test
    driver.get ("https://chat.openai.com")  # ChatGPT URL

    # Check if Chrome is already running
    try:
        print("Checking if Chrome is already running...")
        result = subprocess.run(["pgrep", "-f", chrome_path], capture_output=True, text=True)
        if result.stdout:
            print("Chrome is already running.")
        else:
            print("Launching new Chrome instance.")
            subprocess.Popen([chrome_path, "--new-instance", url])
    except Exception as e:
        print(f"An error occurred while launching Chrome: {e}")

def initialize_driver():
    """
    Initializes the Selenium WebDriver with specified options.
    Returns: webdriver.Chrome: Chrome WebDriver instance.
    """
    try:
        # Configure Chrome options to use a separate automation profile
        options = Options()
        # Path to your Chrome user data directory
        user_data_dir = "/Users/jim.btc/Library/Application Support/Google/Chrome"  # Update if necessary
        options.add_argument(f"--user-data-dir={user_data_dir}")
        # Specify the automation profile directory (e.g., "Profile 2")
        profile_directory = "Profile 2"  # Change to your automation profile
        options.add_argument(f"--profile-directory={profile_directory}")

        # Additional options to prevent DevToolsActivePort error
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--disable-gpu")
        options.add_argument("--remote-debugging-port=9222")

        # Optional: Run Chrome in headless mode
        # options.add_argument("--headless")

        # Initialize the Chrome WebDriver using webdriver-manager
        driver = webdriver.Chrome(
            service=webdriver.chrome.service.Service(ChromeDriverManager().install()),
            options=options
        )
        logging.info("Chrome WebDriver initialized successfully.")
        # Add a delay to allow the browser to open
        time.sleep(5)
        return driver
    except Exception as e:
        logging.error(f"Error initializing WebDriver: {e}")
        return None

def main():
    # First, open a Chrome instance
    open_separate_chrome_instance()

    # Initialize the Chrome WebDriver
    print("Setting up Selenium WebDriver with separate Chrome profile...")
    driver = initialize_driver()
    if not driver:
        print("Failed to initialize the WebDriver. Exiting.")
        return

    # Navigate to the ChatGPT website
    print("Navigating to ChatGPT website...")
    driver.get("https://chat.openai.com")

    try:
        # Confirm the page has loaded
        print("Waiting for the page title to contain 'ChatGPT'...")
        WebDriverWait(driver, 10).until(EC.title_contains("ChatGPT"))
        print("Page title confirmed. Page has loaded.")

        # Wait for the prompt textarea to load
        print("Waiting for the prompt textarea to load...")
        wait = WebDriverWait(driver, 20)  # Increased timeout to 20 seconds
        prompt_area = wait.until(EC.presence_of_element_located((By.ID, "prompt-textarea")))
        print("Found the prompt textarea.")

        # Move to the prompt textarea and click it to ensure the cursor is activated
        print("Moving to the prompt textarea and clicking to focus...")
        actions = ActionChains(driver)
        actions.move_to_element(prompt_area).click().perform()
        time.sleep(1)  # Short delay to ensure focus

        # JavaScript click as a fallback to ensure activation
        print("Ensuring activation with JavaScript click...")
        driver.execute_script("arguments[0].click();", prompt_area)
        time.sleep(1)  # Additional delay to ensure the cursor appears

        # Clear any existing text
        print("Clearing existing text in the prompt textarea...")
        prompt_area.send_keys(Keys.CONTROL + "a")
        prompt_area.send_keys(Keys.DELETE)

        # Type "TEST" one character at a time with a 1-second delay between each
        text_to_type = "TEST"
        print("Typing 'TEST' character by character...")
        for char in text_to_type:
            prompt_area.send_keys(char)
            print(f"Typed '{char}'")
            time.sleep(1)  # 1-second delay between characters

        print("Typing complete.")

    except Exception as e:
        print(f"An error occurred: {e}")

    finally:
        # Close the browser after a short delay
        time.sleep(5)
        print("Closing the browser...")
        driver.quit()

if __name__ == "__main__":
    main()