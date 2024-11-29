import random
import time
import logging
import re
import platform
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.chrome.options import Options as ChromeOptions
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import (
    SessionNotCreatedException,
    NoSuchElementException,
    TimeoutException
)

# ===========================
# Configuration and Setup
# ===========================

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("selenium_automation.log"),
        logging.StreamHandler()
    ]
)

# Define the modular components (central_styles, headphone_types, themes, settings)
central_styles = [
    "Electric Blue", "Mirror-Finished", "Glow-in-the-Dark", "Monochrome Block",
    "Crystal-Clear Glass", "Digital Circuit", "Rustic Wooden", "Graffiti Green",
    "Liquid Metal", "Holographic Rainbow", "Bronze-Plated", "Camo-Print",
    "Fiery Lava", "Space Nebula", "Metal Gear", "Crystalized Ice", "Emerald",
    "Vintage Radio", "Candy", "Weathered Stone", "Steampunk Brass",
    "Neon Sign", "Solar Flare", "Coral Reef", "Galactic", "Stealth",
    "Retro Video Game", "Lava Lamp", "Origami", "Neon Jungle", "Galaxy Marble",
    "Ice Crystal", "Vortex", "Bioluminescent", "Tribal", "Digital Pixel",
    "Rainbow Prism", "Space-Time", "Floral", "Hologram", "Sandstone", "Marble",
    "Cyberpunk", "Galaxy Swirl", "Doodle", "Firework", "Magma",
    "Aurora Borealis", "Mosaic", "Metallic Silver", "Vintage Vinyl", "Pop Art",
    "Fiber Optic", "Gothic", "Circuit Board", "Lightning", "Pastel",
    "Liquid Crystal", "Galaxy Dust", "Electric Circuit", "Wooden Carved",
    "Futuristic Holographic", "Psychedelic", "Metallic Gold",
    "Retro Futurism", "Dystopian", "Underwater", "Light Beam",
    "Frosted Glass", "Electric Vine", "Galaxy Fog", "Industrial",
    "Holographic Pixel", "Celtic", "Sunset", "Circuit Neon", "Biomechanical",
    "Chalkboard", "Magma Flow", "Venetian Mask", "Frozen",
    "Futuristic Alloy", "Electric Pulse", "Graffiti Yellow", "Electric Spider",
    "Rainbow Liquid", "Star Cluster", "Ocean Wave", "Fire Blaze",
    "Aurora Lights", "Digital Grid", "Solar Radiance", "Swirling Vortex",
    "Futuristic Alloy", "Solar Eclipse", "Crystalline", "Pixel Matrix",
    "Electric Prism", "Dark Graffiti", "Bioluminescent Ocean",
    "Digital Hologram", "Steampunk Iron", "Bitcoin Orange", "Stacks (STX) Blue",
    "Crypto Green"
]

headphone_types = [
    "Oversized LED Headphones", "Classic 70s Over-Ear Headphones",
    "Organic Leafy Headphones", "Sleek Black Headphones",
    "Transparent Over-Ear Headphones", "Floating Virtual Headphones",
    "Leather-Banded Headphones", "Metallic Wrapped Headphones",
    "Shimmering Water Droplet Headphones", "Circular Transparent Headphones",
    "Ancient-Style Curving Headphones", "Military-Style with Mic",
    "Molten Headphones with Smoke", "Asteroid-Shaped Floating Headphones",
    "Riveted Industrial Headphones", "Frosted Encasing Headphones",
    "Coiled Vine Headphones", "Wooden Ear-Cup Headphones",
    "Gummy-Like Bright Headphones", "Mossy Rock Gripping Headphones",
    "Gear-Filled Steampunk Headphones", "Flickering Neon Headphones",
    "Sunburst Radiating Headphones", "Marine Coral Headphones",
    "Starship Orbiting Headphones", "Tactical Stealth Headphones",
    "Pixelated Retro Headphones", "Flowing Lava Liquid Headphones",
    "Folded Paper Headphones", "Exotic Plant Glowing Headphones",
    "Swirling Celestial Headphones", "Prismatic Refraction Headphones",
    "Spiral Movement Headphones", "Bioluminescent Organic Headphones",
    "Traditional Tribal Motif Headphones", "Binary Code Streaming Headphones",
    "Multi-Colored Spectrum Headphones", "Molten Rock Flow Headphones",
    "Temporal Space-Time Headphones", "Petal and Leaf Delicate Headphones",
    "Light-Based Transparent Headphones", "Spray Paint Aerosol Headphones",
    "Reflective Shiny Headphones", "Vinyl Disc Headphones",
    "Flowing Magma Stream Headphones", "Bold Pop Art Vibrant Headphones",
    "Fiber Optic Strand Headphones", "Dark Gothic Ornate Headphones",
    "Electronic Circuitry Headphones", "Electric Sparks Emitting Headphones",
    "Soft Fluffy Pastel Headphones", "Shimmering Liquid Crystal Headphones",
    "Sparkling Stardust Headphones", "Tiled Mosaic Pattern Headphones",
    "Neon-Colored Pulsing Headphones", "Rustic Handcrafted Headphones",
    "Holographic Light Shape Headphones", "Trippy Swirling Color Headphones",
    "Luxurious Gold Accent Headphones", "Spray Can Urban Art Headphones",
    "Classic-Future Blend Headphones", "Rugged Industrial Headphones",
    "Transparent Bubble Headphones", "Laser Beam Emitting Headphones",
    "High-Tech Sleek Headphones", "Spray Pattern Urban Headphones",
    "Intertwined Leaf and Vine Headphones", "Flowing Data Stream Headphones",
    "Heatwave Emitting Headphones", "Electric Spark Headphones",
    "Kaleidoscope Reflective Headphones", "Sophisticated Marble Headphones",
    "Bold Street Art Headphones", "Pixel Block Headphones",
    "Synthesizer-Inspired Headphones", "Lunar Motif Headphones",
    "Robotic Integration Headphones", "Desert Sand Oasis Headphones",
    "Vibrant Floral Headphones", "8-Bit Retro Headphones",
    "Audio Waveform Headphones", "Spectrum Refraction Headphones",
    "Flowing Lava Headphones", "Celestial Star Constellation Headphones",
    "Icy Shimmer Headphones", "Prism Refracting Headphones",
    "Dark Edgy Headphones", "Glowing Bioluminescent Headphones",
    "Holographic Projection Headphones", "Mechanical Heavy-Duty Headphones",
    "Flowing Rainbow Color Headphones", "Spark-Emitting Headphones",
    "Colorful Spectrum Headphones", "Orange Bitcoin Style Headphones", 
    "Blue Stacks (STX) Style Headphones", "Green Crypto Style Headphones"
]

themes = [
    "Cyber Graffiti", "Vintage Chrome", "Bio-Nature Fusion", "Minimalist Noir",
    "Futuristic Transparency", "Digital Future", "Vintage Rustic", "Grunge Street",
    "Liquid Metal", "Holographic Pop", "Ancient Bronze", "Tactical Camo",
    "Volcanic Heat", "Cosmic Nebula", "Industrial Steampunk", "Frozen Tundra",
    "Mystical Forest", "Retro Radio", "Candy Pop", "Natural Earth",
    "Steampunk Machinery", "Retro Neon", "Solar Energy", "Underwater Life",
    "Space Exploration", "Military Stealth", "8-Bit Nostalgia", "Psychedelic Flow",
    "Paper Art", "Futuristic Jungle", "Cosmic Marble", "Arctic Sparkle",
    "Whirlwind", "Deep Sea Glow", "Tribal Heritage", "Digital Binary",
    "Prism Spectrum", "Molten Earth", "Time Warp", "Spring Bloom",
    "Holographic Display", "Desert Mirage", "Classical Sculpture",
    "Cyberpunk City", "Starry Cosmos", "Artistic Doodles", "Celebration Sparkle",
    "Volcanic Activity", "Polar Lights", "Brass Machinery",
    "Mediterranean Mosaic", "Urban Street Art", "Shiny Metals", "Retro Music",
    "Flowing Lava", "Pop Art Explosion", "Fiber Optics", "Gothic Elegance",
    "Tech Circuitry", "Electric Storm", "Pastel Dream", "Liquid Crystal Display",
    "Stardust Universe", "Artistic Mosaic", "Electric Neon", "Rustic Woodcraft",
    "Holographic Future", "Psychedelic Art", "Golden Elegance",
    "Urban Graffiti", "Retro Futuristic", "Dystopian Future", "Aquatic Bubbles",
    "Laser Light Show", "Futuristic Technology", "Pink Street Art", "Eco Green",
    "Digital Matrix", "Thermal Energy", "Electric Power",
    "Kaleidoscopic Vision", "Elegant Marble", "Bold Street Art",
    "Digital Pixels", "Synthwave", "Lunar Elegance", "Cybernetic Fusion",
    "Desert Mirage", "Sunny Bloom", "Retro Gaming", "Digital Waves",
    "Icy Elegance", "Electric Nature", "Cosmic Fog", "Industrial Strength",
    "Holographic Pixels", "Celtic Heritage", "Sunset Gradient",
    "Neon Circuitry", "Organic Tech", "Classroom Nostalgia",
    "Dynamic Magma", "Masquerade Ball", "Frozen Wilderness",
    "High-Tech Metallic", "Electric Pulse", "Bright Street Art",
    "Cyber Spider", "Liquid Rainbow", "Star Clusters", "Surf Vibes",
    "Fire Blaze", "Aurora Lights", "Digital Grid", "Solar Radiance",
    "Swirling Vortex", "Biomechanical", "Chalkboard Nostalgia",
    "Venetian Elegance", "Glacier Chill", "Bitcoin Orange", 
    "Stacks (STX) Blue", "Crypto Green"
]

settings = [
    "Vibrant Street Graffiti Wall", "Victorian Machinery Background",
    "Dark Urban Nightscape", "Sun's Corona Backdrop", "Vibrant Underwater Reef",
    "Vast Outer Space", "Night Operation Environment", "Digital Game World",
    "Psychedelic Background", "Delicate Paper Surface", "Illuminated Rainforest",
    "Celestial Space Environment", "Moody Urban Wall", "Classic Music Studio",
    "Volcanic Hotspot", "Lavish Golden Hall", "Cozy Wood-Filled Workshop",
    "High-Tech Cityscape", "Stormy Sky", "Dreamy Light-Colored Background",
    "Futuristic Display Grid", "Desert Landscape", "Grand Marble Hall",
    "Neon-Lit Cyberpunk City", "Paper-Filled Artistic Sketches",
    "Night Sky with Fireworks", "Fiery Volcanic Area", "Icy Polar Scene",
    "Industrial Factory", "Complex Digital Matrix", "Stormy Sky During Eclipse",
    "Sparkling Crystal Environment", "Industrial Steampunk Factory",
    "Electrified Urban Wall", "Deep Space", "Chilling Snowy Wilderness",
    "Vibrant Liquid Background", "High-Tech Metallic Environment",
    "Dynamic Swirling Background", "Bright Sunny Meadow",
    "Retro Video Game Background", "High-Tech Audio Studio",
    "Chilly Winter Landscape", "Futuristic Botanical Garden",
    "Mystical Space Environment", "Rugged Factory Setting",
    "Vibrant Liquid Background", "Stormy Sky", "Vibrant Digital Environment",
    "Futuristic Metallic Environment", "Luxurious Marble Hall",
    "Lively Urban Wall", "Digital Pixel Art Environment", "Sunny Beach Scene",
    "Fiery Background", "Snowy Wilderness", "Luxurious High-Tech City",
    "Bioluminescent Underwater Scene", "Futuristic Holographic Display",
    "Industrial Steampunk Environment", "Glowing Cyberpunk Wall",
    "Sparkling Crystal Cave", "Stormy Volcanic Landscape",
    "Neon-Lit Urban Street", "Frozen Arctic Landscape", "Retro-Futuristic Cityscape",
    "Bioluminescent Ocean", "High-Energy Tech Lab", "Vibrant Rainbow Liquid Background",
    "Dynamic Electric Field", "Luminous Energy Vortex", "Bitcoin Orange Background Scene", 
    "Stacks (STX) Blue Background Scene", "Crypto Green Background Scene"
    # Add more settings as needed to expand the variety
]

# ===========================
# Helper Functions
# ===========================

def generate_prompt():
    """
    Generates a single prompt by randomly selecting one element from each category.
    """
    central_style = random.sample(central_styles, 1)[0]
    headphone_type = random.sample(headphone_types, 1)[0]
    theme = random.sample(themes, 1)[0]
    setting = random.sample(settings, 1)[0]
    
    prompt = f"\"{central_style} 'Letter A' wearing {headphone_type}. Theme: {theme}. Set in a {setting}.\""
    return prompt

def generate_unique_prompts(n):
    """
    Generates a specified number of unique prompts.
    
    Parameters:
        n (int): Number of unique prompts to generate.
    
    Returns:
        list: A list containing unique prompt strings.
    """
    prompts = set()
    attempts = 0
    max_attempts = n * 10  # Prevent infinite loop in case of insufficient unique combinations
    
    while len(prompts) < n and attempts < max_attempts:
        prompt = generate_prompt()
        prompts.add(prompt)
        attempts += 1
    
    if len(prompts) < n:
        logging.warning(f"Only generated {len(prompts)} unique prompts out of requested {n}.")
    return list(prompts)


def human_typing(element, text, min_delay=0.05, max_delay=0.2):
    """
    Types text into a Selenium WebElement one character at a time with random delays.

    Parameters:
        element (WebElement): The Selenium WebElement to type into.
        text (str): The text to type.
        min_delay (float): Minimum delay between keystrokes in seconds.
        max_delay (float): Maximum delay between keystrokes in seconds.
    """
    for char in text:
        element.send_keys(char)
        time.sleep(random.uniform(min_delay, max_delay))

def recursive_print_prompts(prompts, current=0, max_count=100):
    """
    Recursively prints the first max_count prompts from the prompts list.

    Parameters:
        prompts (list): List of prompt strings.
        current (int): Current index.
        max_count (int): Number of prompts to print.
    """
    if current >= max_count or current >= len(prompts):
        return
    print(f"{current + 1}. {prompts[current]}")
    recursive_print_prompts(prompts, current + 1, max_count)

def analyze_response_text(response_text):
    """
    Analyzes the response text for specific key phrases and determines the wait time.

    Parameters:
        response_text (str): The assistant's response text.

    Returns:
        int: The number of seconds to wait before sending the next prompt. Returns 0 if no wait is needed.
    """
    logging.info("Analyzing response text for key phrases.")
    wait_seconds = 0

    # Pattern for daily maximum hit
    daily_max_pattern = r"you've hit your daily maximum.*reset in (\d+) hours? and (\d+) minutes?"
    match = re.search(daily_max_pattern, response_text, re.IGNORECASE)
    if match:
        hours = int(match.group(1))
        minutes = int(match.group(2))
        wait_seconds = (hours * 60 + minutes) * 60
        logging.warning(f"Daily maximum hit. Need to wait for {hours} hours and {minutes} minutes ({wait_seconds} seconds).")
        return wait_seconds * 2  # Double the wait time

    # Pattern for generating images too fast
    too_fast_pattern = r"you're generating images too fast.*please wait for (\d+) minutes?"
    match = re.search(too_fast_pattern, response_text, re.IGNORECASE)
    if match:
        minutes = int(match.group(1))
        wait_seconds = minutes * 60
        logging.warning(f"Generating images too fast. Need to wait for {minutes} minutes ({wait_seconds} seconds).")
        return wait_seconds * 2  # Double the wait time

    # Add more patterns as needed

    logging.info("No key phrases detected. No additional wait required.")
    return wait_seconds

def get_chrome_version(driver):
    """
    Retrieves the Chrome browser version from the WebDriver.

    Parameters:
        driver (webdriver.Chrome): The Selenium WebDriver instance.

    Returns:
        str: Chrome version as a string.
    """
    try:
        chrome_version = driver.capabilities['browserVersion']
        logging.info(f"Chrome Browser Version: {chrome_version}")
        return chrome_version
    except KeyError:
        logging.error("Unable to retrieve Chrome version from WebDriver capabilities.")
        return "Unknown"

def get_webdriver_version():
    """
    Retrieves the Selenium WebDriver version.

    Returns:
        str: WebDriver version as a string.
    """
    try:
        webdriver_version = webdriver.__version__
        logging.info(f"Selenium WebDriver Version: {webdriver_version}")
        return webdriver_version
    except AttributeError:
        logging.error("Unable to retrieve Selenium WebDriver version.")
        return "Unknown"

def get_user_agent(driver):
    """
    Retrieves the user agent string from the browser.

    Parameters:
        driver (webdriver.Chrome): The Selenium WebDriver instance.

    Returns:
        str: User agent string.
    """
    try:
        user_agent = driver.execute_script("return navigator.userAgent;")
        logging.info(f"User Agent: {user_agent}")
        return user_agent
    except Exception as e:
        logging.error(f"Unable to retrieve user agent: {e}")
        return "Unknown"

def log_system_info():
    """
    Logs system-related information such as OS, Python version, etc.
    """
    try:
        os_info = platform.platform()
        python_version = platform.python_version()
        logging.info(f"Operating System: {os_info}")
        logging.info(f"Python Version: {python_version}")
    except Exception as e:
        logging.error(f"Unable to retrieve system information: {e}")

def log_page_details(driver):
    """
    Logs the current page title and URL.

    Parameters:
        driver (webdriver.Chrome): The Selenium WebDriver instance.
    """
    try:
        page_title = driver.title
        current_url = driver.current_url
        logging.info(f"Page Title: {page_title}")
        logging.info(f"Current URL: {current_url}")
    except Exception as e:
        logging.error(f"Unable to retrieve page details: {e}")

def check_captcha_presence(driver):
    """
    Checks if a CAPTCHA is present on the page.

    Parameters:
        driver (webdriver.Chrome): The Selenium WebDriver instance.

    Returns:
        bool: True if CAPTCHA is detected, False otherwise.
    """
    try:
        # Example: Detect reCAPTCHA (adjust selectors as needed)
        captcha = driver.find_elements(By.CLASS_NAME, "g-recaptcha")
        if captcha:
            logging.warning("CAPTCHA detected on the page.")
            return True
        else:
            logging.info("No CAPTCHA detected on the page.")
            return False
    except Exception as e:
        logging.error(f"Error while checking for CAPTCHA: {e}")
        return False

def perform_login(driver, username, password):
    """
    Automates the login process.

    Parameters:
        driver (webdriver.Chrome): The Selenium WebDriver instance.
        username (str): Username for login.
        password (str): Password for login.

    Returns:
        bool: True if login is successful, False otherwise.
    """
    try:
        # Locate username field (update selector as needed)
        username_field = WebDriverWait(driver, 20).until(
            EC.presence_of_element_located((By.ID, "username"))  # Update selector
        )
        username_field.send_keys(username)
        logging.info("Entered username.")

        # Locate password field (update selector as needed)
        password_field = driver.find_element(By.ID, "password")  # Update selector
        password_field.send_keys(password)
        logging.info("Entered password.")

        # Locate and click the login button (update selector as needed)
        login_button = driver.find_element(By.ID, "login-button")  # Update selector
        login_button.click()
        logging.info("Clicked the login button.")

        # Wait for successful login indication (e.g., presence of a specific element)
        WebDriverWait(driver, 20).until(
            EC.presence_of_element_located((By.ID, "logged-in-element"))  # Update selector
        )
        logging.info("Login successful.")
        return True

    except TimeoutException:
        logging.error("Login elements not found or login timed out.")
        return False
    except NoSuchElementException:
        logging.error("Login elements not found on the page.")
        return False
    except Exception as e:
        logging.error(f"An unexpected error occurred during login: {e}")
        return False

# ===========================
# Core Functions
# ===========================

def wait_for_response(driver, timeout=30):
    """
    Waits for the assistant's response and extracts the response text.

    Parameters:
        driver (webdriver.Chrome): The Selenium WebDriver instance.
        timeout (int): Maximum time to wait for the response in seconds.

    Returns:
        str: The extracted response text, or None if not found.
    """
    try:
        logging.info("Starting to wait for the assistant's response.")

        end_time = time.time() + timeout

        # Define precise CSS selectors based on the provided HTML structure
        css_selectors = [
            'div[data-message-author-role="assistant"] div.markdown.prose p',
            'div[data-message-author-role="assistant"] p',
            'div.agent-turn[data-message-author-role="assistant"] div.markdown.prose p',
            'div.agent-turn[data-message-author-role="assistant"] p',
            # Add more selectors if necessary
        ]

        selectors_tried = []

        while time.time() < end_time:
            for selector in css_selectors:
                if selector in selectors_tried:
                    continue  # Skip if already tried
                logging.info(f"Attempting to locate response with CSS selector: '{selector}'")
                try:
                    elements = driver.find_elements(By.CSS_SELECTOR, selector)
                    if elements:
                        for elem in elements:
                            text = elem.text.strip()
                            if text:
                                logging.info(f"Successfully found response text using selector '{selector}': {text}")
                                return text
                            else:
                                logging.debug(f"Element found with selector '{selector}' but contains no text.")
                    else:
                        logging.debug(f"No elements found with CSS selector '{selector}'.")
                except Exception as e:
                    logging.error(f"Exception occurred while using CSS selector '{selector}': {e}")
                finally:
                    selectors_tried.append(selector)

            # If response not found yet, wait briefly before retrying
            logging.debug("Response not found yet. Waiting for 10 seconds before retrying...")
            time.sleep(10)

        # After timeout, log the selectors tried and indicate failure
        logging.warning(f"Could not find the response text within {timeout} seconds.")
        logging.debug(f"Selectors tried: {selectors_tried}")
        return None

    except Exception as e:
        logging.error(f"An unexpected error occurred while waiting for the response: {e}")
        return None

def send_prompts_via_selenium(prompts, preamble):
    """
    Sends the prompts via Selenium automation.

    Parameters:
        prompts (list): List of prompt strings.
        preamble (str): The preamble string to prepend to each prompt.
    """
    # Configure Selenium to launch Chrome with remote debugging enabled
    options = ChromeOptions()
    remote_debugging_port = 9222
    user_data_dir = "/tmp/chrome_debug"  # Change to desired path

    options.add_argument(f"--remote-debugging-port={remote_debugging_port}")
    options.add_argument(f"--user-data-dir={user_data_dir}")
    options.add_argument("--no-sandbox")  # Optional: bypass OS security model
    options.add_argument("--disable-dev-shm-usage")  # Overcome limited resource problems
    # options.add_argument('--headless')  # Uncomment to run Chrome in headless mode

    try:
        # Initialize the WebDriver with the configured options
        driver = webdriver.Chrome(options=options)
        logging.info(f"Chrome launched with remote debugging on port {remote_debugging_port}.")
    except SessionNotCreatedException as e:
        logging.error(f"Failed to create a new session: {e}")
        logging.error("Ensure ChromeDriver is compatible with your Chrome version.")
        return
    except Exception as e:
        logging.error(f"An unexpected error occurred while initializing WebDriver: {e}")
        return

    # Log system and browser information
    log_system_info()
    get_webdriver_version()
    get_chrome_version(driver)
    get_user_agent(driver)
    log_page_details(driver)

    # Optionally perform login if required
    # Replace 'your_username' and 'your_password' with actual credentials
    # login_success = perform_login(driver, 'your_username', 'your_password')
    # if not login_success:
    #     logging.error("Login failed. Exiting automation.")
    #     driver.quit()
    #     return

    # Wait for the page to load completely
    time.sleep(5)  # Adjust as needed or implement WebDriverWait for better reliability

    try:
        for prompt in prompts:
            # Check for CAPTCHA before sending a new prompt
            if check_captcha_presence(driver):
                logging.error("CAPTCHA detected. Pausing automation.")
                # Implement pause or manual intervention here
                break

            # Locate the message input element
            try:
                message_box = WebDriverWait(driver, 20).until(
                    EC.presence_of_element_located((
                        By.CSS_SELECTOR,
                        'textarea[data-placeholder="Message ChatGPT"], p[data-placeholder="Message ChatGPT"]'
                    ))
                )
                logging.info("Located the message input box.")
            except TimeoutException:
                logging.error("Timed out waiting for the message input box to appear.")
                continue
            except NoSuchElementException:
                logging.error("Message input box not found.")
                continue
            except Exception as e:
                logging.error(f"Failed to locate the message input box: {e}")
                continue

            # Clear the message box before typing (optional)
            try:
                message_box.clear()
                logging.debug("Cleared the message input box.")
            except Exception as e:
                logging.warning(f"Could not clear the message box: {e}")

            # Combine preamble with the prompt
            full_message = preamble + prompt

            # Type the full message with human-like delays
            human_typing(message_box, full_message)

            # Press Enter to send the message
            message_box.send_keys(Keys.ENTER)

            print(f"Sent message: {full_message}")

            # Start waiting for the response
            response_text = wait_for_response(driver, timeout=60)  # Increased timeout for complex responses

            if response_text:
                logging.info(f"Received response: {response_text}")
                # Analyze the response text for key phrases
                additional_wait = analyze_response_text(response_text)
                if additional_wait > 0:
                    logging.info(f"Adjusting wait time based on response. Waiting for {additional_wait} seconds.")
                    wait_time = additional_wait
                else:
                    # If no additional wait is needed, use the standard random wait time
                    wait_time = random.uniform(63, 122)  # 63 to 122 seconds
            else:
                logging.warning("No response text found for the sent prompt.")
                # If no response was found, proceed with the standard wait time
                wait_time = random.uniform(63, 122)  # 63 to 122 seconds

            print(f"Waiting for {int(wait_time)} seconds before next message...\n")
            time.sleep(wait_time)

    except Exception as e:
        logging.error(f"An error occurred during Selenium automation: {e}")

    finally:
        # Optional: Close the browser after all prompts are sent
        logging.info("All messages have been sent. Closing the browser.")
        driver.quit()

def main():
    """
    Main function to generate prompts, print them, and optionally send them via Selenium.
    """
    # Configuration Settings
    production_mode = True  # Set to True to only print prompts; False to enable Selenium automation

    # Number of unique prompts to generate
    number_of_prompts = 1000  # Adjust as needed

    # Define the preamble to add before each prompt
    preamble = "Please create the following image: "

    # Generate unique prompts
    prompts = generate_unique_prompts(number_of_prompts)

    # Print the prompts in groups of 10
    print("\n--- Generated Prompts ---\n")
    for i in range(0, len(prompts), 10):
        print(f"Please create these 10 images:")
        for j, prompt in enumerate(prompts[i:i+10], start=1):
            print(f"Prompt {i+j}: {prompt}")
        print("\n")  # Separate groups with a blank line

    if production_mode:
        logging.info("Production Mode: ON")
        logging.info("Automation is disabled. Only prompts have been printed.\n")
    else:
        logging.info("Production Mode: OFF")
        logging.info("Automation is enabled. Sending prompts via Selenium...\n")
        send_prompts_via_selenium(prompts, preamble)

if __name__ == "__main__":
    main()