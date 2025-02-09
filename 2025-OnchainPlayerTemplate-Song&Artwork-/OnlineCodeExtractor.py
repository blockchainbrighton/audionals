import re
import requests
from urllib.parse import urljoin

# Regular expression to find the module paths.
# Adjust the regex if your ID pattern differs.
MODULE_REGEX = re.compile(r'(/content/[A-Za-z0-9]+i0)')

def fetch_module(url, visited, aggregated):
    """
    Recursively fetches module code from the given URL, appending it to 'aggregated'.
    'visited' is a set to track URLs that have already been processed.
    """
    if url in visited:
        return
    visited.add(url)

    try:
        response = requests.get(url)
        response.raise_for_status()
    except requests.RequestException as e:
        aggregated.append(f"// Error fetching {url}: {e}\n")
        print(f"Error fetching {url}: {e}")
        return

    module_code = response.text
    aggregated.append(f"// Module: {url}\n")
    aggregated.append("// --------------------------------------------------\n")
    aggregated.append(module_code + "\n\n")
    print(f"Successfully fetched: {url}")

    # Search for additional module links in the module's code.
    new_links = MODULE_REGEX.findall(module_code)
    for link in new_links:
        # Construct the full URL for the module.
        full_url = urljoin("https://ordinals.com", link)
        fetch_module(full_url, visited, aggregated)

def main():
    visited = set()
    aggregated = []

    # Read the initial HTML file.
    with open('AudionalSongArtworkPlayerTemplate.html', 'r', encoding='utf-8') as f:
        initial_content = f.read()

    # Write the initial HTML file as part of the output.
    aggregated.append("// Module: AudionalSongArtworkPlayerTemplate.html\n")
    aggregated.append(initial_content + "\n\n")

    # Extract all module links from the initial HTML.
    initial_links = MODULE_REGEX.findall(initial_content)
    for link in initial_links:
        full_url = "https://ordinals.com" + link
        fetch_module(full_url, visited, aggregated)

    # Write the aggregated modules to a file.
    with open("aggregated_modules.txt", "w", encoding='utf-8') as outfile:
        outfile.write("\n".join(aggregated))
    print("Aggregation complete. See 'aggregated_modules.txt' for the result.")

if __name__ == "__main__":
    main()