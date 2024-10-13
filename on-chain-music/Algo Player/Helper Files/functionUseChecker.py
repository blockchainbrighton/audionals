import json

def analyze_profile(json_file_path):
    # Load the JSON file
    with open(json_file_path, 'r') as f:
        profile_data = json.load(f)
    
    # Initialize a dictionary to store function call data
    functions_data = {}
    
    # Recursively parse the profile data to extract function calls
    def extract_functions(data):
        if 'callFrame' in data:
            function_name = data['callFrame']['functionName'] or '(anonymous)'
            call_time = data.get('selfTime', 0)
            
            # If the function name already exists, accumulate the time and count
            if function_name in functions_data:
                functions_data[function_name]['time'] += call_time
                functions_data[function_name]['count'] += 1
            else:
                functions_data[function_name] = {'time': call_time, 'count': 1}
        
        # Recursively process child nodes if they exist
        if 'children' in data:
            for child in data['children']:
                extract_functions(child)

    # Start extraction from the top-level nodes
    if 'nodes' in profile_data:
        for node in profile_data['nodes']:
            extract_functions(node)

    # Sort functions by total time spent
    sorted_functions = sorted(functions_data.items(), key=lambda x: x[1]['time'], reverse=True)

    # Print the results
    print(f"{'Function Name':<50} | {'Total Time (ms)':<15} | {'Call Count':<10}")
    print("="*80)
    for func, data in sorted_functions:
        print(f"{func:<50} | {data['time']:<15} | {data['count']:<10}")

    return sorted_functions

# Path to your JSON profile file
# Corrected file path (removed the extra space at the end)
json_file_path = '/Users/jim.btc/Downloads/AlgoPlayerTrace-20241010T095222.json'
# Call the function to analyze the profile
analyze_profile(json_file_path)