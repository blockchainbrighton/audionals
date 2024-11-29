# chrome.exe --remote-debugging-port=9222 --user-data-dir="C:\ChromeDebug"
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
import time

# Attach to an already running Chrome instance
options = webdriver.ChromeOptions()
options.debugger_address = "localhost:9222"  # Port used in remote debugging

# Initialize the WebDriver to use the existing instance
driver = webdriver.Chrome(options=options)

# Wait for the page to load
time.sleep(2)  # Adjust based on your page load speed or use WebDriverWait for dynamic loading

try:
    # Locate the <p> element with the specified data-placeholder
    element = driver.find_element(By.CSS_SELECTOR, 'p[data-placeholder="Message ChatGPT"]')
    
    # Clear any existing text (optional)
    element.clear()

    # Send the text "FOUND IT"
    element.send_keys("FOUND IT")

    # For browsers that require Enter to confirm input
    element.send_keys(Keys.ENTER)

    print("Text 'FOUND IT' has been entered.")

except Exception as e:
    print(f"An error occurred: {e}")

# Optional: Wait before closing if you need time to see the result
time.sleep(20)  # Allows you to see the result before closing
driver.quit()
