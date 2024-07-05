import math
import random

# Function to generate a pseudo-random number using a seed
def random_with_seed(seed):
    return 10000 * math.sin(seed) - math.floor(10000 * math.sin(seed))

# Function to generate the access level based on the seed
def generate_access_level(seed):
    t = math.pow(random_with_seed(seed), 0.3)
    return min(max(math.floor(10 * (1 - t)) + 1, 1), 10)

# Dictionary with the required counts for each level
nft_counts = {
    10: 3,
    9: 5,
    8: 10,
    7: 20,
    6: 40,
    5: 80,
    4: 142,
    3: 200,
    2: 250,
    1: 250
}

# Function to generate seeds for the given access levels
def generate_seeds_for_access_levels(nft_counts):
    seeds = {level: [] for level in nft_counts}
    used_seeds = set()
    while any(len(seeds[level]) < count for level, count in nft_counts.items()):
        seed = random.randint(0, 10000)  # Generate an integer seed
        if seed in used_seeds:
            continue
        access_level = generate_access_level(seed)
        if len(seeds[access_level]) < nft_counts[access_level]:
            seeds[access_level].append(seed)
            used_seeds.add(seed)
    return seeds

# Generate the seeds
seed_distribution = generate_seeds_for_access_levels(nft_counts)

# Write the seeds to a text file in a neat format
with open("gZipPLayerDocs/seed_values.txt", "w") as file:
    for level in sorted(seed_distribution.keys()):
        file.write(f"Level {level}: {len(seed_distribution[level])} seeds\n")
        seed_list = ', '.join(str(seed) for seed in seed_distribution[level])
        file.write(seed_list + "\n\n")

print("Seed values have been written to gZipPLayerDocs/seed_values.txt")
