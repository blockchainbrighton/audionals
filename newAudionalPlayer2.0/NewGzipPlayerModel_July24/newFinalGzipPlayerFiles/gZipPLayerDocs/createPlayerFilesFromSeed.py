import os
import random

# Relative path to the text file containing seed values
seed_file_path = 'seed_values.txt'

# Directory where the HTML files will be saved
output_directory = 'truth by melophonic'

# HTML template
html_template = '''<!DOCTYPE html>
<script>window.seed={seed}</script>
<script src="/content/2645c7edb4140c53e80624ff9294150fb041526fef3ea37a2a5906b7288735bfi0" defer></script>
'''

# Create the output directory if it doesn't exist
os.makedirs(output_directory, exist_ok=True)

# Read the seed values from the text file
with open(seed_file_path, 'r') as file:
    lines = file.readlines()

# Extract seeds from the lines, ignoring lines with level information
seeds = []
for line in lines:
    line = line.strip()
    if line and not line.startswith("Level"):
        seeds.extend(map(int, line.split(',')))

# Print the number of seeds parsed for debugging
print(f"Number of seeds parsed: {len(seeds)}")
print("First 5 seeds:", seeds[:5])
print("Last 5 seeds:", seeds[-5:])

# Ensure there are 1000 seeds
assert len(seeds) == 1000, "The seed file does not contain 1000 seeds."

# Shuffle the seeds to mix up the rarities
random.shuffle(seeds)

# Generate HTML files for each seed
for i, seed in enumerate(seeds):
    html_content = html_template.format(seed=seed)
    html_file_path = os.path.join(output_directory, f'truth_{i + 1}.html')
    with open(html_file_path, 'w') as html_file:
        html_file.write(html_content)

print(f"Generated 1000 HTML files in the '{output_directory}' directory.")
