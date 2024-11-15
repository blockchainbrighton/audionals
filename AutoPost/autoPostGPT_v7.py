import subprocess
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.firefox.service import Service
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.action_chains import ActionChains

def open_separate_firefox_instance():
    # Path to Firefox executable
    firefox_path = "/Applications/Firefox.app/Contents/MacOS/firefox"
    # URL to open
    url = "https://chat.openai.com"  # ChatGPT URL

    # Check if Firefox is already running
    try:
        print("Checking if Firefox is already running...")
        result = subprocess.run(["pgrep", "-f", firefox_path], capture_output=True, text=True)
        if result.stdout:
            print("Firefox is already running.")
        else:
            print("Launching new Firefox instance.")
            subprocess.run([firefox_path, "--new-instance", url])
    except Exception as e:
        print(f"An error occurred while launching Firefox: {e}")

# First, open a Firefox instance
open_separate_firefox_instance()

# Set up Selenium WebDriver (Firefox) with the existing profile
print("Setting up Selenium WebDriver with existing Firefox profile...")
service = Service("./geckodriver")  # Use the relative path if geckodriver is in the current directory

# Configure Firefox options to use your existing profile
options = Options()
profile_path = "/Users/jim.btc/Library/Application Support/Firefox/Profiles/lfbz22cm.default-release"
options.set_preference("profile", profile_path)

driver = webdriver.Firefox(service=service, options=options)

# Navigate to the ChatGPT website
print("Navigating to ChatGPT website...")
driver.get("https://chat.openai.com")

try:
    # Confirm the page has loaded
    print("Waiting for the page title to be ChatGPT...")
    WebDriverWait(driver, 10).until(EC.title_contains("ChatGPT"))
    print("Page title confirmed. Page has loaded.")

    # Wait for the ProseMirror div to load
    print("Waiting for the ProseMirror div to load...")
    wait = WebDriverWait(driver, 20)  # Increased timeout to 20 seconds
    prompt_area = wait.until(EC.presence_of_element_located((By.ID, "prompt-textarea")))
    print("Found the ProseMirror div.")

    # Move to the ProseMirror div and click it to ensure the cursor is activated
    print("Moving to the ProseMirror div and clicking to focus...")
    actions = ActionChains(driver)
    actions.move_to_element(prompt_area).click().perform()
    time.sleep(1)  # Short delay to ensure focus

    # JavaScript click as a fallback to ensure activation
    print("Ensuring activation with JavaScript click...")
    driver.execute_script("arguments[0].click();", prompt_area)
    time.sleep(1)  # Additional delay to ensure the cursor appears

    # Clear any existing text
    print("Clearing existing text in the ProseMirror div...")
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