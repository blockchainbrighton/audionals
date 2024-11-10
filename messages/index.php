<?php
// messages/index.php

// Path to the latest message file
$latest_message_file = 'latest_message.txt';

// Function to safely read and format the log file
function getLatestMessage($file) {
    if (!file_exists($file)) {
        return "No messages logged yet.";
    }

    // Read the file contents
    $contents = file_get_contents($file);

    // Sanitize the contents to prevent XSS
    $sanitized_contents = htmlspecialchars($contents, ENT_QUOTES, 'UTF-8');

    // Convert newlines to HTML line breaks for proper display
    return nl2br($sanitized_contents);
}

// Check if a message is being sent
if (isset($_GET['message'])) {
    // Get the message and user
    $message = $_GET['message'];
    $user = isset($_GET['user']) ? $_GET['user'] : 'Anonymous';

    // Limit the length of message and user to prevent abuse
    $message = substr($message, 0, 500); // Max 500 characters
    $user = substr($user, 0, 100);       // Max 100 characters

    // Get current timestamp
    $timestamp = date('Y-m-d H:i:s');

    // Sanitize inputs to prevent security issues
    $sanitized_message = htmlspecialchars($message, ENT_QUOTES, 'UTF-8');
    $sanitized_user = htmlspecialchars($user, ENT_QUOTES, 'UTF-8');

    // Format the message
    $log_entry = "[$timestamp] User: $sanitized_user, Message: $sanitized_message\n";

    // Write to the latest message file
    if (file_put_contents($latest_message_file, $log_entry, LOCK_EX) === false) {
        // Handle the error (you can log it or display a message)
        // For this minimal setup, we'll do nothing
    }

    // Return a 204 No Content response if accessed via iframe
    if (isset($_SERVER['HTTP_X_REQUESTED_WITH']) && $_SERVER['HTTP_X_REQUESTED_WITH'] === 'XMLHttpRequest') {
        http_response_code(204);
        exit;
    }
}

// Get the latest message
$latest_message = getLatestMessage($latest_message_file);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Messages Log</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            background-color: #f9f9f9;
        }
        h1 { color: #333; }
        #message { 
            background-color: #fff; 
            padding: 15px; 
            border: 1px solid #ddd; 
            border-radius: 5px; 
            max-height: 500px; 
            overflow-y: auto;
            white-space: pre-wrap; /* Ensures long lines wrap */
        }
    </style>
</head>
<body>
    <h1>Latest Message</h1>
    <div id="message"><?php echo $latest_message; ?></div>

    <script>
        // Function to fetch and update the latest message
        function fetchLatestMessage() {
            fetch('https://audionals.com/messages/index.php')
                .then(response => response.text())
                .then(data => {
                    // Extract the message content using DOMParser
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(data, 'text/html');
                    const message = doc.getElementById('message').innerHTML;
                    document.getElementById('message').innerHTML = message;
                })
                .catch(error => console.error('Error fetching latest message:', error));
        }

        // Initial fetch
        fetchLatestMessage();

        // Fetch latest message every 5 seconds
        setInterval(fetchLatestMessage, 5000);
    </script>
</body>
</html>