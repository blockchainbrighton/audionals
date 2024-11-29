
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
import time
import random

# Define the list of prompts
prompts = [
    "Electric Blue 'A' in Graffiti Style Wearing Oversized LED Headphones. Theme: Cyber Graffiti. Design an electric blue 'A' with oversized LED headphones snugly encasing it, set against vibrant street graffiti.",
    "Mirror-Finished 'A' with Classic 70s Headphones Sitting Over the Top Edge. Theme: Vintage Chrome. Create a shiny mirror-finished 'A' with classic 70s over-ear headphones placed at a slight angle above the top corners.",
    "Glow-in-the-Dark 'A' with Organic, Leafy Headphones Wrapping Around Sides. Theme: Bio-Nature Fusion. Design a glow-in-the-dark 'A' with leafy, organic headphones snugly wrapping around each side.",
    "Monochrome Block 'A' with Sleek Black Headphones Fully Enclosing the Top and Sides. Theme: Minimalist Noir. Present a monochrome block 'A' fully encased in sleek black headphones, emphasizing modern design.",
    "Crystal-Clear Glass 'A' with Transparent Over-Ear Headphones Encasing Sides and Top. Theme: Futuristic Transparency. Design a glass-clear 'A' with transparent over-ear headphones positioned firmly around the top and sides.",
    "Digital Circuit 'A' with Floating Virtual Headphones Circling Above. Theme: Digital Future. Show a digital circuit-themed 'A' with glowing virtual headphones hovering closely over its top corners.",
    "Rustic Wooden 'A' in Barn Setting with Leather-Banded Headphones Over Its Sides. Theme: Vintage Rustic. Design a rustic, wooden-textured 'A' wearing classic leather-banded headphones that fully surround its sides.",
    "Graffiti Green 'A' in Grunge Style with Metallic Headphones Wrapped Over the Top. Theme: Grunge Street. Create a graffiti-style green 'A' with metallic headphones settled above its top edge.",
    "Liquid Metal 'A' with Headphones as Shimmering Water Droplets Fully Encasing It. Theme: Liquid Metal. Design a liquid metal 'A' surrounded by headphones designed as shimmering water droplets covering its top and sides.",
    "Holographic Rainbow 'A' with Circular Transparent Headphones Floating Around It. Theme: Holographic Pop. Present a holographic rainbow 'A' with transparent circular headphones positioned snugly over its top.",
    "Bronze-Plated 'A' with Ancient-Style Headphones Curving Around Its Sides. Theme: Ancient Bronze. Display a bronze-plated 'A' with ancient-style headphones that curve around the sides, giving a mythical look.",
    "Camo-Print 'A' with Military-Style Headphones on Top, with Mic Arm Extended. Theme: Tactical Camo. Design a camo-print 'A' with military-style headphones securely placed over the top with an extended mic arm.",
    "Fiery Lava 'A' with Molten Headphones Surrounding It, Hints of Smoke Rising. Theme: Volcanic Heat. Create a lava-textured 'A' with molten headphones positioned over the top and sides, emitting a smoky effect.",
    "Space Nebula 'A' with Headphones Designed as Floating Asteroids Encircling It. Theme: Cosmic Nebula. Show an 'A' filled with space nebula patterns, surrounded by asteroid-shaped headphones floating around it.",
    "Metal Gear 'A' with Riveted Industrial Headphones Clamped to Its Sides. Theme: Industrial Steampunk. Create a metal gear-styled 'A' with riveted headphones firmly clamping its sides in a steampunk-inspired look.",
    "Crystalized Ice 'A' with Frosted Headphones Encasing Its Upper Curve and Sides. Theme: Frozen Tundra. Design a crystallized ice 'A' with frosted headphones placed tightly over its top and sides.",
    "Emerald 'A' with Headphones Made of Coiled Vines Encompassing It. Theme: Mystical Forest. Display an emerald-colored 'A' wrapped in headphones designed as coiled vines encompassing its top and sides.",
    "Vintage Radio 'A' with Wooden Ear-Cup Headphones Firmly Placed Over Sides. Theme: Retro Radio. Present a vintage radio-themed 'A' with wooden ear-cup headphones set firmly over each side.",
    "Candy 'A' with Bright, Gummy-Like Headphones Wrapped Over Its Top Corners. Theme: Candy Pop. Create a candy-colored 'A' with gummy-like headphones gently wrapped over its top corners in bright colors.",
    "Weathered Stone 'A' with Mossy Rock Headphones Gripping Its Sides and Top. Theme: Natural Earth. Design a weathered stone 'A' with headphones made of mossy rocks, positioned closely around its top and sides.",
    "Steampunk 'A' with Gear-Filled Headphones. Theme: Steampunk Machinery. Design a steampunk-inspired 'A' adorned with intricate gear-filled headphones featuring brass and copper accents, set against a Victorian machinery background.",
    "Neon Sign 'A' with Flickering Headphones. Theme: Retro Neon. Create an 'A' resembling a neon sign with bright, flickering headphones integrated into its structure, glowing against a dark urban nightscape.",
    "Solar Flare 'A' with Sunburst Headphones. Theme: Solar Energy. Design an 'A' with a solar flare texture and headphones that radiate sunburst patterns, set against a backdrop of the sun's corona.",
    "Coral Reef 'A' with Marine Headphones. Theme: Underwater Life. Present a coral-colored 'A' surrounded by headphones designed with coral and marine life elements, floating in a vibrant underwater reef.",
    "Galactic 'A' with Starship Headphones. Theme: Space Exploration. Show an 'A' with a galaxy pattern, featuring headphones styled like starships orbiting around it, set against a vast outer space scene.",
    "Stealth 'A' with Black Camouflage Headphones. Theme: Military Stealth. Create a black, camouflaged 'A' wearing stealth headphones designed with tactical patterns, blending into a night operation environment.",
    "Retro Video Game 'A' with Pixelated Headphones. Theme: 8-Bit Nostalgia. Design a pixelated 'A' reminiscent of classic video games, paired with chunky, retro-style headphones, set in a digital game world.",
    "Lava Lamp 'A' with Flowing Headphones. Theme: Psychedelic Flow. Present an 'A' with a lava lamp texture and headphones made of flowing, colorful liquid shapes, set against a psychedelic background.",
    "Origami 'A' with Paper Headphones. Theme: Paper Art. Create an origami-style 'A' with intricately folded paper headphones, set on a delicate paper-textured surface.",
    "Neon Jungle 'A' with Glowing Headphones. Theme: Futuristic Jungle. Design an 'A' with neon jungle patterns, wearing glowing headphones shaped like exotic plants, set in a vibrant, illuminated rainforest.",
    "Galaxy Marble 'A' with Swirling Headphones. Theme: Cosmic Marble. Present a marble-textured 'A' with swirling galaxy patterns, paired with headphones that mimic the motion of celestial bodies.",
    "Ice Crystal 'A' with Prismatic Headphones. Theme: Arctic Sparkle. Design an 'A' made of ice crystals, wearing prismatic headphones that refract light into colorful patterns, set in a frozen landscape.",
    "Vortex 'A' with Spiral Headphones. Theme: Whirlwind. Show an 'A' designed with vortex patterns, encircled by spiral headphones that give the illusion of movement, set against a dynamic stormy background.",
    "Bioluminescent 'A' with Glowing Headphones. Theme: Deep Sea Glow. Create a bioluminescent 'A' with glowing, organic headphones inspired by deep-sea creatures, set in a dark oceanic environment.",
    "Tribal 'A' with Patterned Headphones. Theme: Tribal Heritage. Design an 'A' adorned with intricate tribal patterns, wearing headphones featuring traditional tribal motifs, set against a cultural backdrop.",
    "Digital Pixel 'A' with Binary Headphones. Theme: Digital Binary. Present a pixelated 'A' interwoven with binary code, paired with headphones made of binary digits streaming around it.",
    "Rainbow Prism 'A' with Multi-Colored Headphones. Theme: Prism Spectrum. Design a rainbow prism 'A' with multi-colored, refractive headphones that disperse light into a spectrum.",
    "Lava Rock 'A' with Molten Headphones. Theme: Molten Earth. Create a lava rock-textured 'A' wearing headphones that appear to be made of flowing molten rock, set against a volcanic backdrop.",
    "Space-Time 'A' with Temporal Headphones. Theme: Time Warp. Design an 'A' surrounded by headphones designed with space-time fabric patterns, set against a swirling time vortex.",
    "Floral 'A' with Petal Headphones. Theme: Spring Bloom. Design a floral-patterned 'A' wearing headphones made of delicate petals and leaves, set in a blossoming garden.",
    "Hologram 'A' with Transparent Headphones. Theme: Holographic Display. Present a holographic 'A' with transparent, light-based headphones that appear to float above it, set against a futuristic hologram grid.",
    "Sandstone 'A' with Desert Headphones. Theme: Desert Mirage. Create a sandstone-textured 'A' with headphones designed to resemble desert landscapes, complete with sand dunes and mirage effects.",
    "Marble 'A' with Sculpted Headphones. Theme: Classical Sculpture. Design a marble 'A' with sculpted, ornate headphones inspired by classical art, set in a grand marble hall.",
    "Cyberpunk 'A' with LED Light Headphones. Theme: Cyberpunk City. Show a cyberpunk-styled 'A' wearing LED-lit headphones with vibrant colors, set against a futuristic cityscape with neon lights.",
    "Galaxy Swirl 'A' with Starry Headphones. Theme: Starry Cosmos. Present an 'A' featuring galaxy swirl patterns, paired with headphones adorned with twinkling stars, set in a cosmic space environment.",
    "Doodle 'A' with Sketchy Headphones. Theme: Artistic Doodles. Create a doodle-style 'A' with sketchy, hand-drawn headphones, set against a paper filled with artistic sketches.",
    "Firework 'A' with Explosive Headphones. Theme: Celebration Sparkle. Design an 'A' with firework patterns, wearing headphones that resemble exploding fireworks, set against a night sky lit by celebrations.",
    "Magma 'A' with Volcanic Headphones. Theme: Volcanic Activity. Show an 'A' designed with magma flows, encased in volcanic headphones emitting heat and light, set in a fiery landscape.",
    "Aurora Borealis 'A' with Northern Lights Headphones. Theme: Polar Lights. Create an 'A' with aurora borealis colors and patterns, wearing headphones that reflect the northern lights, set in an icy polar scene.",
    "Steampunk Brass 'A' with Cogs Headphones. Theme: Brass Machinery. Design a steampunk brass 'A' with cogs and gears, wearing matching headphones with intricate mechanical details, set against a steampunk factory backdrop.",
    "Mosaic 'A' with Tiled Headphones. Theme: Mediterranean Mosaic. Present a mosaic-patterned 'A' with tiled headphones featuring colorful geometric shapes, set against a Mediterranean-style mosaic wall.",
    "Graffiti Purple 'A' with Spray Paint Headphones. Theme: Urban Street Art. Create a graffiti purple 'A' with headphones designed from spray paint cans and aerosol art, set on a vibrant urban wall.",
    "Metallic Silver 'A' with Shiny Headphones. Theme: Shiny Metals. Design a metallic silver 'A' wearing shiny, reflective headphones that gleam under bright lights, set in a modern metallic environment.",
    "Vintage Vinyl 'A' with Record Headphones. Theme: Retro Music. Show an 'A' inspired by vintage vinyl records, wearing headphones made from vinyl discs, set in a classic music studio.",
    "Lava Flow 'A' with Glowing Headphones. Theme: Flowing Lava. Create an 'A' with flowing lava textures, wearing glowing headphones that mimic the movement of flowing magma, set in a fiery volcanic area.",
    "Pop Art 'A' with Bold Headphones. Theme: Pop Art Explosion. Design a pop art-style 'A' with bold colors and patterns, wearing vibrant headphones, set against a dynamic pop art background.",
    "Fiber Optic 'A' with Light-Up Headphones. Theme: Fiber Optics. Present a fiber optic 'A' with light-up headphones made of fiber optic strands, set in a high-tech environment with glowing lights.",
    "Gothic 'A' with Dark Headphones. Theme: Gothic Elegance. Create a gothic-styled 'A' with dark, ornate headphones featuring gothic arches and motifs, set against a shadowy, medieval backdrop.",
    "Circuit Board 'A' with Electronic Headphones. Theme: Tech Circuitry. Show an 'A' designed with circuit board patterns, wearing headphones that integrate electronic components and wiring, set in a digital tech environment.",
    "Lightning 'A' with Electric Headphones. Theme: Electric Storm. Design an 'A' with lightning bolt patterns, paired with headphones that emit electric sparks, set against a stormy sky.",
    "Pastel 'A' with Soft Headphones. Theme: Pastel Dream. Present a pastel-colored 'A' wearing soft, fluffy headphones, set in a dreamy, light-colored background.",
    "Liquid Crystal 'A' with Shimmering Headphones. Theme: Liquid Crystal Display. Create an 'A' with liquid crystal textures, wearing shimmering headphones that change colors based on angles, set against a futuristic display.",
    "Galaxy Dust 'A' with Stardust Headphones. Theme: Stardust Universe. Design an 'A' filled with galaxy dust patterns, paired with headphones made of sparkling stardust, set in a cosmic space scene.",
    "Mosaic Tile 'A' with Patterned Headphones. Theme: Artistic Mosaic. Show a tile-mosaic 'A' with patterned headphones featuring intricate mosaic designs, set against a colorful tiled wall.",
    "Electric Circuit 'A' with Neon Headphones. Theme: Electric Neon. Create an 'A' with electric circuit designs, wearing neon-colored headphones that pulse with light, set in a high-energy tech environment.",
    "Wooden Carved 'A' with Rustic Headphones. Theme: Rustic Woodcraft. Design a wooden-carved 'A' with rustic, handcrafted headphones, set in a cozy, wood-filled workshop.",
    "Futuristic Holographic 'A' with Light Headphones. Theme: Holographic Future. Present a holographic 'A' with transparent, light-based headphones that appear to float and change shape, set in a high-tech cityscape.",
    "Psychedelic 'A' with Trippy Headphones. Theme: Psychedelic Art. Create a psychedelic 'A' with vibrant, trippy patterns, wearing headphones with swirling, colorful designs, set against a kaleidoscopic background.",
    "Metallic Gold 'A' with Luxurious Headphones. Theme: Golden Elegance. Design a metallic gold 'A' with luxurious, ornate headphones adorned with gold accents, set against a lavish golden backdrop.",
    "Graffiti Orange 'A' with Spray Can Headphones. Theme: Urban Graffiti. Show a graffiti orange 'A' with headphones made from spray cans and urban art elements, set on a vibrant street art wall.",
    "Retro Futurism 'A' with Classic Headphones. Theme: Retro Future. Create a retro-futuristic 'A' with classic-style headphones, blending past and future design elements, set against a vintage-futuristic background.",
    "Dystopian 'A' with Industrial Headphones. Theme: Dystopian Future. Design a dystopian-themed 'A' with industrial, rugged headphones, set against a bleak, industrial wasteland.",
    "Underwater 'A' with Bubble Headphones. Theme: Aquatic Bubbles. Present an underwater 'A' with bubble patterns, wearing headphones made of transparent bubbles, set in a serene aquatic environment.",
    "Light Beam 'A' with Laser Headphones. Theme: Laser Light Show. Create an 'A' with light beam textures, paired with headphones that emit laser beams, set against a dynamic light show background.",
    "Futuristic Metal 'A' with High-Tech Headphones. Theme: Futuristic Technology. Design a metallic 'A' with high-tech, sleek headphones featuring advanced technology elements, set in a futuristic city.",
    "Graffiti Pink 'A' with Spray Headphones. Theme: Pink Street Art. Show a graffiti pink 'A' with headphones designed from spray paint patterns and urban art, set on a colorful graffiti wall.",
    "Leafy 'A' with Eco Headphones. Theme: Eco Green. Create a leafy 'A' covered in greenery, wearing headphones made of intertwined leaves and vines, set in a lush, eco-friendly environment.",
    "Digital Matrix 'A' with Data Headphones. Theme: Digital Matrix. Design an 'A' with digital matrix codes, wearing headphones made of flowing data streams, set against a high-tech digital grid.",
    "Thermal 'A' with Heatwave Headphones. Theme: Thermal Energy. Present a thermal-patterned 'A' with headphones that emit heatwaves and thermal gradients, set in a high-temperature environment.",
    "Lightning Bolt 'A' with Electric Headphones. Theme: Electric Power. Create an 'A' with lightning bolt designs, paired with electric headphones that feature dynamic energy effects, set against a stormy sky.",
    "Kaleidoscope 'A' with Multi-Pattern Headphones. Theme: Kaleidoscopic Vision. Design a kaleidoscope 'A' with intricate, multi-pattern designs, wearing headphones that reflect the kaleidoscope's vibrant colors, set against a shifting pattern background.",
    "Marble Swirl 'A' with Elegant Headphones. Theme: Elegant Marble. Show an 'A' with elegant marble swirls, paired with sophisticated headphones adorned with marble textures, set in a luxurious marble hall.",
    "Graffiti Red 'A' with Bold Headphones. Theme: Bold Street Art. Create a graffiti red 'A' with bold, striking headphones featuring vibrant street art elements, set against a dynamic urban wall.",
    "Pixelated 'A' with Digital Headphones. Theme: Digital Pixels. Design a pixelated 'A' with digital-style headphones made of pixel blocks, set in a digital pixelated environment.",
    "Retro Synth 'A' with Synthesizer Headphones. Theme: Synthwave. Present a retro synth-style 'A' with headphones inspired by synthesizer designs, set against a neon-lit synthwave background.",
    "Celestial 'A' with Moon Headphones. Theme: Lunar Elegance. Create a celestial 'A' with moon phase patterns, wearing headphones adorned with lunar motifs, set against a starry night sky.",
    "Cybernetic 'A' with Robotic Headphones. Theme: Cybernetic Fusion. Design a cybernetic 'A' with robotic enhancements, wearing high-tech headphones integrated into its metallic structure, set in a futuristic cyber environment.",
    "Desert 'A' with Mirage Headphones. Theme: Desert Mirage. Present a desert-themed 'A' with mirage-like patterns, paired with headphones that resemble desert sands and oases, set in a vast desert landscape.",
    "Sunflower 'A' with Floral Headphones. Theme: Sunny Bloom. Create a sunflower-inspired 'A' with vibrant floral headphones, set in a bright, sunny meadow.",
    "Pixel Art 'A' with 8-Bit Headphones. Theme: Retro Gaming. Design a pixel art 'A' with 8-bit styled headphones, set against a retro video game background.",
    "Digital Wave 'A' with Waveform Headphones. Theme: Digital Waves. Show an 'A' with digital wave patterns, wearing headphones that mimic audio waveforms, set in a high-tech audio studio.",
    "Frosted Glass 'A' with Icy Headphones. Theme: Icy Elegance. Create a frosted glass 'A' with icy headphones that shimmer with frost patterns, set in a chilly winter landscape.",
    "Electric Vine 'A' with Neon Headphones. Theme: Electric Nature. Design an 'A' with electric vine patterns, wearing neon-colored headphones that glow amidst a futuristic botanical garden.",
    "Galaxy Fog 'A' with Misty Headphones. Theme: Cosmic Fog. Present an 'A' enveloped in galaxy fog, paired with headphones that resemble swirling cosmic mist, set in a mystical space environment.",
    "Industrial 'A' with Mechanical Headphones. Theme: Industrial Strength. Create an industrial-themed 'A' with mechanical headphones featuring heavy-duty designs, set in a rugged factory setting.",
    "Holographic Pixel 'A' with Light Headphones. Theme: Holographic Pixels. Design a holographic 'A' with pixelated light patterns, wearing headphones that project holographic images, set against a futuristic digital backdrop.",
    "Celtic 'A' with Knot Headphones. Theme: Celtic Heritage. Show a Celtic-styled 'A' adorned with knot patterns, paired with headphones featuring intricate Celtic designs, set against a historical Celtic background.",
    "Sunset 'A' with Gradient Headphones. Theme: Sunset Gradient. Create an 'A' with sunset color gradients, wearing headphones that blend seamlessly with the sunset hues, set against a beautiful sunset sky.",
    "Circuit Neon 'A' with Glowing Headphones. Theme: Neon Circuitry. Design a neon circuit 'A' with glowing circuitry patterns, paired with headphones that emit bright neon lights, set in a vibrant cyberpunk environment.",
    "Biomechanical 'A' with Organic Headphones. Theme: Organic Tech. Present a biomechanical 'A' with organic and technological elements intertwined, wearing headphones that merge nature and technology, set in a hybrid environment.",
    "Chalkboard 'A' with Erased Headphones. Theme: Classroom Chalkboard. Create a chalkboard-textured 'A' with headphones that look like they've been partially erased, set in a nostalgic classroom setting.",
    "Magma Flow 'A' with Flowing Headphones. Theme: Dynamic Magma. Design an 'A' with dynamic magma flow patterns, wearing headphones that resemble flowing magma streams, set in a volcanic hotspot.",
    "Venetian Mask 'A' with Elegant Headphones. Theme: Masquerade Ball. Show a Venetian mask-inspired 'A', adorned with ornate, elegant headphones, set against a lavish masquerade ball backdrop.",
    "Frozen 'A' with Icicle Headphones. Theme: Frozen Wilderness. Create a frozen 'A' with icicle textures, wearing headphones that are made of hanging icicles, set in a snowy wilderness.",
    "Futuristic Alloy 'A' with Metallic Headphones. Theme: Futuristic Alloy. Design a futuristic alloy 'A' with sleek metallic headphones integrated into its structure, set against a high-tech metallic environment.",
    "Electric Pulse 'A' with Pulsing Headphones. Theme: Electric Pulse. Present an 'A' with electric pulse patterns, wearing headphones that emit visible pulsing energy waves, set in a vibrant energy field.",
    "Graffiti Yellow 'A' with Bright Headphones. Theme: Bright Street Art. Create a graffiti yellow 'A' with bright, eye-catching headphones featuring bold street art designs, set against a lively urban wall.",
    "Electric Spider 'A' with Web Headphones. Theme: Cyber Spider. Design an 'A' inspired by electric spiders, wearing headphones that resemble intricate spider webs, set in a high-tech web environment.",
    "Rainbow Liquid 'A' with Flowing Headphones. Theme: Liquid Rainbow. Show a rainbow-liquid 'A' with flowing, liquid-like headphones that shimmer with rainbow colors, set in a vibrant liquid background.",
    "Futuristic Alloy 'A' with Sleek Headphones. Theme: Futuristic Sleek. Create a sleek, futuristic alloy 'A' with streamlined headphones, set against a high-tech metallic environment.",
    "Star Cluster 'A' with Sparkling Headphones. Theme: Star Clusters. Design an 'A' featuring star cluster patterns, paired with sparkling headphones that resemble star constellations, set in a celestial space scene.",
    "Electric Vine 'A' with Neon Headphones. Theme: Electric Flora. Present an 'A' with electric vine motifs, wearing neon-colored headphones that glow amidst a futuristic botanical garden.",
    "Graffiti Blue 'A' with Urban Headphones. Theme: Urban Graffiti. Create a graffiti blue 'A' with urban-style headphones featuring spray paint and street art elements, set in a dynamic urban wall.",
    "Digital Pixel 'A' with Retro Headphones. Theme: Retro Digital. Design a pixelated 'A' with retro-style headphones, set in a digital pixel art environment.",
    "Ocean Wave 'A' with Surf Headphones. Theme: Surf Vibes. Show an 'A' with ocean wave patterns, wearing headphones designed like surfboards, set against a sunny beach scene.",
    "Fire Blaze 'A' with Flaming Headphones. Theme: Fire Blaze. Create an 'A' with fire blaze textures, paired with flaming headphones that emit dynamic fire effects, set against a fiery background.",
    "Aurora 'A' with Light Show Headphones. Theme: Aurora Lights. Design an 'A' inspired by the aurora lights, wearing headphones that reflect the colors and patterns of the northern lights, set in a snowy arctic landscape.",
    "Digital Grid 'A' with Tech Headphones. Theme: Digital Grid. Present a digital grid-patterned 'A' with tech-inspired headphones, set against a futuristic digital grid background.",
    "Solar Eclipse 'A' with Dark Headphones. Theme: Solar Eclipse. Create a solar eclipse-themed 'A' with dark, eclipse-like headphones, set against a dramatic sky during an eclipse.",
    "Crystalline 'A' with Gem Headphones. Theme: Crystal Gems. Design a crystalline 'A' with headphones made of various gemstones, set in a sparkling crystal environment.",
    "Steampunk Copper 'A' with Gear Headphones. Theme: Copper Steampunk. Show a copper-toned steampunk 'A' with gear-adorned headphones, set against an industrial steampunk backdrop.",
    "Electric Graffiti 'A' with Light Headphones. Theme: Electric Graffiti. Create an electric graffiti-styled 'A' with light-infused headphones, set against a vibrant, electrified urban wall.",
    "Nebula 'A' with Cosmic Headphones. Theme: Nebula Space. Design a nebula-patterned 'A' with cosmic headphones that mimic the colors and swirls of interstellar nebulae, set in deep space.",
    "Frostbite 'A' with Frozen Headphones. Theme: Frostbite. Present a frostbite-themed 'A' with frozen, icy headphones, set in a chilling, snowy environment.",
    "Pixel Matrix 'A' with Digital Headphones. Theme: Pixel Matrix. Create a pixel matrix 'A' with digital-style headphones, set in a complex digital matrix background.",
    "Electric Prism 'A' with Prism Headphones. Theme: Electric Prism. Show an 'A' with electric prism patterns, wearing prism-shaped headphones that refract light, set against a vibrant, electric background.",
    "Graffiti Black 'A' with Dark Headphones. Theme: Dark Graffiti. Create a graffiti black 'A' with dark, edgy headphones, set against a moody urban wall.",
    "Bioluminescent Ocean 'A' with Glowing Headphones. Theme: Bioluminescent Ocean. Design a bioluminescent ocean-themed 'A' with glowing headphones, set in a sparkling, bioluminescent underwater scene.",
    "Digital Hologram 'A' with Light Headphones. Theme: Holographic Digital. Present a digital hologram 'A' with light-based headphones that project holographic images, set against a futuristic holographic display.",
    "Steampunk Iron 'A' with Riveted Headphones. Theme: Iron Steampunk. Create a steampunk iron 'A' with riveted, mechanical headphones, set in an industrial steampunk environment.",
    "Rainbow Liquid 'A' with Flowing Headphones. Theme: Rainbow Liquid. Design a rainbow liquid 'A' with flowing, liquid-like headphones that shimmer with rainbow colors, set in a vibrant liquid background.",
    "Electric Lightning 'A' with Spark Headphones. Theme: Electric Lightning. Show an 'A' with electric lightning patterns, wearing headphones that emit sparks, set against a stormy sky.",
    "Digital Spectrum 'A' with Colorful Headphones. Theme: Digital Spectrum. Create a digital spectrum 'A' with colorful, spectrum-based headphones, set in a vibrant digital environment.",
    "Volcanic Rock 'A' with Molten Headphones. Theme: Volcanic Rock. Design a volcanic rock-textured 'A' with molten headphones that resemble flowing lava, set in a volcanic landscape.",
    "Astral 'A' with Celestial Headphones. Theme: Astral Celestial. Present an astral 'A' with celestial patterns, wearing headphones adorned with stars and constellations, set in a vast cosmic space.",
    "Glacier 'A' with Icy Headphones. Theme: Glacier. Create a glacier-themed 'A' with icy headphones, set against a massive glacier backdrop.",
    "Digital Wave 'A' with Audio Headphones. Theme: Audio Wave. Design a digital wave 'A' with audio waveform patterns, wearing headphones that mimic sound waves, set in a dynamic audio environment.",
    "Chromatic 'A' with Rainbow Headphones. Theme: Chromatic Rainbow. Show a chromatic 'A' with rainbow-colored headphones, set against a vibrant, colorful background.",
    "Solar Flare 'A' with Radiant Headphones. Theme: Solar Radiance. Design an 'A' with solar flare textures, paired with radiant headphones that emit bright light patterns, set against a blazing solar backdrop.",
    "Vortex 'A' with Swirling Headphones. Theme: Swirling Vortex. Create a vortex-themed 'A' with swirling patterns, wearing headphones that appear to be caught in a vortex, set against a dynamic swirling background.",
    "Futuristic Alloy 'A' with Sleek Headphones. Theme: Futuristic Alloy. Design a sleek, futuristic alloy 'A' with streamlined headphones, set against a high-tech metallic environment.",
    "Solar Eclipse 'A' with Dark Headphones. Theme: Solar Eclipse. Present a solar eclipse-themed 'A' with dark, eclipse-like headphones, set against a dramatic sky during an eclipse.",
    "Crystalline 'A' with Gem Headphones. Theme: Crystal Gems. Create a crystalline 'A' with headphones made of various gemstones, set in a sparkling crystal environment.",
    "Pixel Matrix 'A' with Digital Headphones. Theme: Pixel Matrix. Design a pixel matrix 'A' with digital-style headphones, set in a complex digital matrix background.",
    "Electric Prism 'A' with Prism Headphones. Theme: Electric Prism. Show an 'A' with electric prism patterns, wearing prism-shaped headphones that refract light, set against a vibrant, electric background.",
    "Graffiti Black 'A' with Dark Headphones. Theme: Dark Graffiti. Create a graffiti black 'A' with dark, edgy headphones, set against a moody urban wall.",
    "Bioluminescent Ocean 'A' with Glowing Headphones. Theme: Bioluminescent Ocean. Design a bioluminescent ocean-themed 'A' with glowing headphones, set in a sparkling, bioluminescent underwater scene.",
    "Digital Hologram 'A' with Light Headphones. Theme: Holographic Digital. Present a digital hologram 'A' with light-based headphones that project holographic images, set against a futuristic holographic display.",
    "Steampunk Iron 'A' with Riveted Headphones. Theme: Iron Steampunk. Create a steampunk iron 'A' with riveted, mechanical headphones, set in an industrial steampunk environment.",
    "Rainbow Liquid 'A' with Flowing Headphones. Theme: Rainbow Liquid. Design a rainbow liquid 'A' with flowing, liquid-like headphones that shimmer with rainbow colors, set in a vibrant liquid background.",
    "Electric Lightning 'A' with Spark Headphones. Theme: Electric Lightning. Show an 'A' with electric lightning patterns, wearing headphones that emit sparks, set against a stormy sky.",
    "Digital Spectrum 'A' with Colorful Headphones. Theme: Digital Spectrum. Create a digital spectrum 'A' with colorful, spectrum-based headphones, set in a vibrant digital environment.",
    "Volcanic Rock 'A' with Molten Headphones. Theme: Volcanic Rock. Design a volcanic rock-textured 'A' with molten headphones that resemble flowing lava, set in a volcanic landscape.",
    "Astral 'A' with Celestial Headphones. Theme: Astral Celestial. Present an astral 'A' with celestial patterns, wearing headphones adorned with stars and constellations, set in a vast cosmic space.",
    "Glacier 'A' with Icy Headphones. Theme: Glacier. Create a glacier-themed 'A' with icy headphones, set against a massive glacier backdrop.",
    "Digital Wave 'A' with Audio Headphones. Theme: Audio Wave. Design a digital wave 'A' with audio waveform patterns, wearing headphones that mimic sound waves, set in a dynamic audio environment.",
    "Chromatic 'A' with Rainbow Headphones. Theme: Chromatic Rainbow. Show a chromatic 'A' with rainbow-colored headphones, set against a vibrant, colorful background.",
]


# Define the preamble to add before each prompt
preamble = "Please create the following image: "

def human_typing(element, text, min_delay=0.05, max_delay=0.2):
    """
    Types text into a Selenium WebElement one character at a time with random delays.
    """
    for char in text:
        element.send_keys(char)
        time.sleep(random.uniform(min_delay, max_delay))

def main():
    # Configure Selenium to connect to the existing Chrome instance
    options = webdriver.ChromeOptions()
    options.debugger_address = "localhost:9222"  # Ensure this matches the remote debugging port

    # Initialize the WebDriver
    driver = webdriver.Chrome(options=options)

    # Wait for the page to load completely
    time.sleep(2)  # Adjust as needed or implement WebDriverWait for better reliability

    try:
        # Locate the message input element
        message_box = driver.find_element(By.CSS_SELECTOR, 'p[data-placeholder="Message ChatGPT"]')

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

            # Wait for 50 to 70 seconds before sending the next prompt
            wait_time = random.uniform(33, 62)
            print(f"Waiting for {int(wait_time)} seconds before next message...\n")
            time.sleep(wait_time)

    except Exception as e:
        print(f"An error occurred: {e}")

    finally:
        # Optional: Close the browser after all prompts are sent
        print("All messages have been sent. Closing the browser.")
        driver.quit()

if __name__ == "__main__":
    main()
