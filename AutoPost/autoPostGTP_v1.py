from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
import time

# Initialize the WebDriver (e.g., Chrome, Firefox)
driver = webdriver.Chrome()  # or webdriver.Firefox() if using Firefox

# Open the browser and navigate to the URL where the element is located
driver.get("https://chatgpt.com/")  # Replace with your target URL

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

# Optional: Close the browser
time.sleep(20)  # Allows you to see the result before closing
driver.quit()
