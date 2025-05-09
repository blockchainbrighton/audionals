import random
import time
import re

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


# Define the modular components
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
    "Digital Hologram", "Steampunk Iron"
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
    "Colorful Spectrum Headphones"
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
    "Venetian Elegance", "Glacier Chill"
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
    "Dynamic Electric Field", "Luminous Energy Vortex",
    # Add more settings as needed to expand the variety
]

def generate_prompt():
    """
    Generates a single prompt by randomly selecting one element from each category.
    """
    central_style = random.choice(central_styles)
    headphone_type = random.choice(headphone_types)
    theme = random.choice(themes)
    setting = random.choice(settings)
    
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
        print(f"Only generated {len(prompts)} unique prompts out of requested {n}.")
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

def send_prompts_via_selenium(prompts, preamble):
    """
    Sends the prompts via Selenium automation.

    Parameters:
        prompts (list): List of prompt strings.
        preamble (str): The preamble string to prepend to each prompt.
    """
    # Configure Selenium to connect to the existing Chrome instance
    options = webdriver.ChromeOptions()
    options.debugger_address = "localhost:9222"  # Ensure this matches the remote debugging port

    # Initialize the WebDriver
    driver = webdriver.Chrome(options=options)

    # Wait for the page to load completely
    time.sleep(2)  # Adjust as needed or implement WebDriverWait for better reliability

    try:
        # Locate the message input element
        # Note: Update the CSS_SELECTOR as per the actual webpage's structure
        message_box = driver.find_element(By.CSS_SELECTOR, 'p[data-placeholder="Message ChatGPT"]')

        # Locate the message container to monitor incoming messages
        # Note: Update the MESSAGE_CONTAINER_SELECTOR as per the actual webpage's structure
        MESSAGE_CONTAINER_SELECTOR = 'div.message-container'  # Placeholder selector
        messages_container = driver.find_element(By.CSS_SELECTOR, MESSAGE_CONTAINER_SELECTOR)

        # Initialize message count
        previous_message_count = len(messages_container.find_elements(By.CSS_SELECTOR, '.message'))

        for prompt in prompts:
            # Clear the message box before typing (optional)
            message_box.clear()

            # Combine preamble with the prompt
            full_message = preamble + prompt

            # Type the full message with human-like delays
            human_typing(message_box, full_message)

            # Press Enter to send the message
            message_box.send_keys(Keys.ENTER)

            print(f"Sent message: {full_message}")

            # Wait for the response message to appear
            try:
                # Define a wait with a timeout (e.g., 60 seconds)
                wait = WebDriverWait(driver, 60)

                # Wait until the number of messages increases
                wait.until(lambda d: len(d.find_elements(By.CSS_SELECTOR, MESSAGE_CONTAINER_SELECTOR + ' .message')) > previous_message_count)

                # After the new message appears, get all messages
                all_messages = messages_container.find_elements(By.CSS_SELECTOR, '.message')

                # Get the latest message
                latest_message = all_messages[-1].text.strip()

                print(f"Received message: {latest_message}")

                # Update the previous_message_count
                previous_message_count = len(all_messages)

                # Check for rate limit message
                if "generating images too quickly" in latest_message.lower():
                    print("Rate limit message detected.")

                    # Try to extract the wait time in minutes
                    match = re.search(r'wait for (\d+) minutes?', latest_message, re.IGNORECASE)
                    if match:
                        wait_minutes = int(match.group(1))
                        total_wait = (wait_minutes * 2) * 60  # Convert to seconds and double for safety
                        print(f"Detected wait time: {wait_minutes} minutes. Pausing for {wait_minutes + 2} minutes for safety.")
                    else:
                        # Default wait time if specific time not mentioned
                        total_wait = 20 * 60  # 20 minutes in seconds
                        print("No specific wait time detected. Pausing for 20 minutes.")

                    print(f"Pausing for {total_wait / 60} minutes due to rate limiting.")
                    time.sleep(total_wait)
                    print("Resuming after pause.")

            except Exception as e:
                print(f"An error occurred while waiting for the response: {e}")
                print("Proceeding to the next prompt.")

            # Wait for a random duration before sending the next prompt
            wait_time = random.uniform(63, 122)  # 33 to 62 seconds
            print(f"Waiting for {int(wait_time)} seconds before next message...\n")
            time.sleep(wait_time)

    except Exception as e:
        print(f"An error occurred: {e}")

    finally:
        # Optional: Close the browser after all prompts are sent
        print("All messages have been sent or an error occurred. Closing the browser.")
        driver.quit()

def main():
    """
    Main function to generate prompts, print them, and optionally send them via Selenium.
    """
    # Configuration Settings
    production_mode = False  # Set to True to only print prompts; False to enable Selenium automation

    # Number of unique prompts to generate
    number_of_prompts = 100  # Adjust as needed

    # Define the preamble to add before each prompt
    preamble = "Please create the following image: "

    # Generate unique prompts
    prompts = generate_unique_prompts(number_of_prompts)

    # Print the first 100 prompts for verification
    print("\n--- First 100 Generated Prompts ---\n")
    recursive_print_prompts(prompts, 0, 100)
    print("\n--- End of Prompts ---\n")

    if production_mode:
        print("Production Mode: ON\n")
        print("Automation is disabled. Only prompts have been printed.\n")
    else:
        print("Production Mode: OFF\n")
        print("Automation is enabled. Sending prompts via Selenium...\n")
        send_prompts_via_selenium(prompts, preamble)

if __name__ == "__main__":
    main()