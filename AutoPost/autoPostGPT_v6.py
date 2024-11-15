import subprocess
import time
import pyautogui
from selenium import webdriver
from selenium.webdriver.firefox.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

def open_separate_firefox_instance():
    firefox_path = "/Applications/Firefox.app/Contents/MacOS/firefox"
    chatgpt_url = "https://chat.openai.com"

    # Check if Firefox is already running
    try:
        result = subprocess.run(["pgrep", "-f", firefox_path], capture_output=True, text=True)
        if result.stdout:
            print("Firefox is already running.")
            return True  # Firefox is already running
        else:
            # Launch Firefox and open ChatGPT
            subprocess.Popen([firefox_path, "--new-instance", chatgpt_url])
            print("Started Firefox with ChatGPT.")
            return False  # Firefox was not running, so we started it
    except Exception as e:
        print(f"An error occurred while checking Firefox: {e}")
        return False

def ensure_chatgpt_tab(driver):
    chatgpt_url = "https://chat.openai.com"
    tab_opened = False

    # Check if ChatGPT is open in a tab and make it active if found
    for handle in driver.window_handles:
        driver.switch_to.window(handle)
        if driver.current_url.startswith(chatgpt_url):
            print("ChatGPT is already open in a tab.")
            tab_opened = True
            break

    # If ChatGPT was not found, open it in a new tab
    if not tab_opened:
        driver.execute_script(f"window.open('{chatgpt_url}', '_blank');")
        driver.switch_to.window(driver.window_handles[-1])
        print("Opened ChatGPT in a new tab.")
    
    return tab_opened

def activate_chatgpt_tab_applescript():
    """Use AppleScript to activate the ChatGPT tab in Firefox."""
    applescript = '''
    tell application "Firefox"
        activate
        tell window 1
            set chatgptTab to first tab whose URL starts with "https://chat.openai.com"
            if chatgptTab exists then
                set active tab to chatgptTab
                return "ChatGPT tab activated."
            else
                make new tab with properties {URL:"https://chat.openai.com"}
                return "ChatGPT tab opened."
            end if
        end tell
    end tell
    '''
    try:
        result = subprocess.run(['osascript', '-e', applescript], capture_output=True, text=True)
        print(result.stdout.strip())
    except Exception as e:
        print(f"Failed to execute AppleScript: {e}")

def type_test_with_pyautogui(input_box_image):
    """Use pyautogui to type 'test' in the ChatGPT input box using image recognition."""
    try:
        # Wait to ensure the tab is active and page is loaded
        time.sleep(5)

        # Bring Firefox to the foreground
        subprocess.run(['osascript', '-e', 'tell application "Firefox" to activate'])
        time.sleep(1)  # Wait for Firefox to be active

        # Locate the input box on the screen
        print("Locating the ChatGPT input box on the screen...")
        input_box_location = None
        max_attempts = 10
        attempt = 0

        while attempt < max_attempts and input_box_location is None:
            input_box_location = pyautogui.locateOnScreen(input_box_image, confidence=0.8)
            if input_box_location is not None:
                print(f"Input box found at location: {input_box_location}")
                break
            else:
                print("Input box not found. Retrying...")
                time.sleep(1)
                attempt += 1

        if input_box_location is None:
            print("Failed to locate the ChatGPT input box on the screen.")
            return

        # Move the mouse to the center of the input box and click to focus
        input_box_point = pyautogui.center(input_box_location)
        pyautogui.click(input_box_point)
        print(f"Clicked on the input box at coordinates {input_box_point}.")

        time.sleep(0.5)  # Short pause to ensure focus

        # Type "test" and press Enter
        pyautogui.write("test", interval=0.05)
        pyautogui.press('enter')
        print("Typed 'test' in chat input via pyautogui.")
    except Exception as e:
        print(f"Failed to type using pyautogui: {e}")

def type_test_in_chatgpt():
    firefox_service = Service("/Applications/Firefox.app/Contents/MacOS/geckodriver")  # Ensure correct path
    options = webdriver.FirefoxOptions()
    options.add_argument("--new-instance")
    options.set_preference("webgl.disabled", True)
    
    try:
        driver = webdriver.Firefox(service=firefox_service, options=options)
        print("Selenium WebDriver initialized.")
    except Exception as e:
        print(f"Failed to initialize WebDriver: {e}")
        return

    # Confirm ChatGPT tab is open and active
    if ensure_chatgpt_tab(driver):
        print("ChatGPT tab confirmed.")
    else:
        print("Navigated to ChatGPT.")

    # Wait for ChatGPT to fully load
    try:
        WebDriverWait(driver, 20).until(
            EC.presence_of_element_located((By.XPATH, "//h1[contains(text(), 'ChatGPT')]"))
        )
        print("ChatGPT page has fully loaded.")
    except Exception as e:
        print(f"Error waiting for ChatGPT page to load: {e}")
        driver.quit()
        return

    # Define selectors for chat input and attempt to type
    possible_selectors = [
        (By.TAG_NAME, "textarea"),
        (By.CSS_SELECTOR, "input[placeholder*='chat']"),
        (By.CSS_SELECTOR, "div#prompt-textarea")  # Updated selector based on provided HTML
    ]

    for selector_type, selector_value in possible_selectors:
        try:
            input_elements = driver.find_elements(selector_type, selector_value)
            if input_elements:
                for input_box in input_elements:
                    input_box.click()  # Ensure the input box is focused
                    input_box.send_keys("test")
                    print("Typed 'test' in chat input.")
                    break
            else:
                print(f"No elements found for selector ({selector_type}, '{selector_value}').")
        except Exception as e:
            print(f"Error while testing selector ({selector_type}, '{selector_value}'): {e}")

    driver.quit()

def main():
    firefox_path = "/Applications/Firefox.app/Contents/MacOS/firefox"
    chatgpt_url = "https://chat.openai.com"
    input_box_image = "input_box.png"  # Ensure this image exists in the script's directory

    firefox_running = open_separate_firefox_instance()

    if firefox_running:
        print("Firefox is already running. Activating ChatGPT tab and typing 'test'.")
        # Activate ChatGPT tab using AppleScript
        activate_chatgpt_tab_applescript()

        # Type "test" into the input box using pyautogui
        type_test_with_pyautogui(input_box_image)
    else:
        print("Firefox was not running. Launched Firefox and opened ChatGPT.")
        # Allow some time for Firefox to open
        time.sleep(5)
        # Type "test" in the ChatGPT input using Selenium
        type_test_in_chatgpt()

if __name__ == "__main__":
    main()