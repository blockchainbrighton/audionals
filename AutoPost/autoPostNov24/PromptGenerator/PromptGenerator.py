import random
import logging

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
# Constants
# ===========================

HEADER_LINE = "Please create these 10 images, please create all 10 without checking that the first is correct. Please make all 10 the same resolution:"
START_PROMPT_NUMBER = 1  # Starting number for prompts

# ===========================
# Helper Functions
# ===========================

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
        logging.warning(f"Only generated {len(prompts)} unique prompts out of requested {n}.")
    return list(prompts)

# ===========================
# Example Usage
# ===========================

if __name__ == "__main__":
    number_of_prompts = 1000  # Specify how many prompts you want to generate
    unique_prompts = generate_unique_prompts(number_of_prompts)
    
    # Assign numbers to prompts starting from START_PROMPT_NUMBER
    numbered_prompts = list(enumerate(unique_prompts, start=START_PROMPT_NUMBER))
    
    # Group prompts into sections of 10
    grouped_prompts = [numbered_prompts[i:i + 10] for i in range(0, len(numbered_prompts), 10)]
    
    # Save the prompts to a text file with the specified formatting
    try:
        with open("audionalHeadphonePrompts1.txt", "w", encoding="utf-8") as file:
            for group in grouped_prompts:
                # Write the header line before each group of 10 prompts
                file.write(HEADER_LINE + "\n")
                
                # Write each prompt in the group
                for prompt_number, prompt in group:
                    file.write(f"Prompt {prompt_number}: {prompt}\n")
                
                # Add a double line space after each group
                file.write("\n\n")
        
        logging.info(f"Successfully saved {len(unique_prompts)} prompts to 'audionalHeadphonePrompts.txt'.")
    except Exception as e:
        logging.error(f"Failed to write prompts to file: {e}")
