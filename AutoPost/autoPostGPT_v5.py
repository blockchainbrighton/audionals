import subprocess
import time
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

def open_separate_chrome_instance():
    # Path to the "Google Chrome Auto" executable
    chrome_path = "/Applications/Google Chrome Auto.app/Contents/MacOS/Google Chrome"
    # Unique user data directory for isolated sessions
    user_data_dir = "~/Library/Application Support/Google/Chrome Auto"
    # URL to open
    url = "https://chat.openai.com"  # ChatGPT URL

    # Check if "Google Chrome Auto" is already running
    try:
        result = subprocess.run(["pgrep", "-f", chrome_path], capture_output=True, text=True)
        if result.stdout:
            print("Google Chrome Auto is already running.")
        else:
            # Launch "Google Chrome Auto" with the specified user data directory and open ChatGPT.com
            subprocess.run([chrome_path, f"--user-data-dir={user_data_dir}", url])
    except Exception as e:
        print(f"An error occurred: {e}")

def type_test_in_chatgpt():
    # Set up Selenium to use "Google Chrome Auto"
    chrome_service = Service("/Applications/Google Chrome Auto.app/Contents/MacOS/Google Chrome")
    options = webdriver.ChromeOptions()
    options.add_argument(f"--user-data-dir=~/Library/Application Support/Google/Chrome Auto")
    
    # Initialize WebDriver
    driver = webdriver.Chrome(service=chrome_service, options=options)
    
    # Navigate to ChatGPT.com
    driver.get("https://chat.openai.com")
    
    # Wait for a specific element on the page that confirms ChatGPT has loaded, such as a header or logo
    try:
        WebDriverWait(driver, 20).until(
            EC.presence_of_element_located((By.XPATH, "//h1[contains(text(), 'ChatGPT')]"))
        )
        print("Page has fully loaded and is ready for input.")
    except Exception as e:
        print(f"Error waiting for page to load: {e}")
        driver.quit()
        return

    # Define possible selectors for the chat input area
    possible_selectors = [
        (By.TAG_NAME, "textarea"),               # Standard <textarea>
        (By.CSS_SELECTOR, "input[name='post']"), # Hypothetical element with 'post' name
        (By.CSS_SELECTOR, "input[name='chat post']"),
        (By.CSS_SELECTOR, "input[name='GPT post']"),
        (By.CSS_SELECTOR, "input[placeholder*='chat']")  # General placeholder search for 'chat'
    ]
    
    # Search and attempt to type in each identified input area
    for selector_type, selector_value in possible_selectors:
        try:
            # Attempt to find the element with the current selector
            input_elements = driver.find_elements(selector_type, selector_value)
            if input_elements:
                print(f"Found {len(input_elements)} elements with selector ({selector_type}, '{selector_value}').")
                for index, input_box in enumerate(input_elements):
                    # Log the area being tested
                    print(f"Testing input area {index + 1} for selector ({selector_type}, '{selector_value}').")
                    # Attempt to type "test" in the input box
                    input_box.send_keys("test")
                    time.sleep(1)  # Brief pause to observe input
            else:
                print(f"No elements found with selector ({selector_type}, '{selector_value}').")
        except Exception as e:
            print(f"An error occurred while testing selector ({selector_type}, '{selector_value}'): {e}")

    # Close the browser after testing
    driver.quit()

# First, open Google Chrome Auto instance
open_separate_chrome_instance()

# Then, type "test" in the input box
type_test_in_chatgpt()