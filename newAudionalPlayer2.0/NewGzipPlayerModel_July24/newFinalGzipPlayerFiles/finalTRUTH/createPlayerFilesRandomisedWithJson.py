import os
import random
import json

# Relative path to the text file containing seed values
seed_file_path = 'seed_values.txt'

# Directory where the HTML files will be saved
output_directory = 'truth_by_melophonic'

# JSON output file
json_output_file = 'metadata.json'

# HTML template
html_template = '''<!DOCTYPE html>
<script>window.seed={seed}</script>
<script src="/content/2645c7edb4140c53e80624ff9294150fb041526fef3ea37a2a5906b7288735bfi0" defer></script>
'''

# Create the output directory if it doesn't exist
os.makedirs(output_directory, exist_ok=True)

# Read the seed values from the text file and parse them into a dictionary
seeds_by_level = {}
with open(seed_file_path, 'r') as file:
    lines = file.readlines()

current_level = None
for line in lines:
    line = line.strip()
    if line.startswith("Level"):
        current_level = int(line.split()[1][:-1])
        seeds_by_level[current_level] = []
    elif line:
        seeds = map(int, line.split(', '))
        seeds_by_level[current_level].extend(seeds)

# Combine all seeds into a list with their corresponding levels
all_seeds = [(seed, level) for level, seeds in seeds_by_level.items() for seed in seeds]

# Ensure there are 1000 seeds
assert len(all_seeds) == 1000, "The seed file does not contain 1000 seeds."

# Shuffle the combined list to mix up the rarities
random.shuffle(all_seeds)

# Generate HTML files for each seed and record their metadata
file_metadata = []

for i, (seed, level) in enumerate(all_seeds):
    html_content = html_template.format(seed=seed)
    html_file_path = os.path.join(output_directory, f'truth_{i + 1}.html')
    with open(html_file_path, 'w') as html_file:
        html_file.write(html_content)
    
    file_metadata.append({
        "file": f'{i + 1}.png',
        "meta": {
            "name": f"TRUTH #{i + 1}",
            "attributes": [
                {
                    "trait_type": "LVL",
                    "value": str(level)  # Ensure the level is stored as a string
                }
            ]
        }
    })

# Save the metadata to a JSON file
with open(json_output_file, 'w') as json_file:
    json.dump(file_metadata, json_file, indent=4)

print(f"Generated 1000 HTML files in the '{output_directory}' directory and created metadata JSON file '{json_output_file}'.")
