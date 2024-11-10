<?php
// messages/latest_message.php

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

// Get the latest message
$latest_message = getLatestMessage($latest_message_file);

// Return the message
header('Content-Type: text/html; charset=UTF-8');
echo $latest_message;
?>