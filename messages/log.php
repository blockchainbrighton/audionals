<?php
// messages/log.php

// Path to the latest message file
$latest_message_file = 'latest_message.txt';

// Only proceed if the 'message' parameter is present
if (!isset($_GET['message'])) {
    http_response_code(400); // Bad Request
    echo 'Missing "message" parameter.';
    exit;
}

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
    http_response_code(500); // Internal Server Error
    echo 'Failed to write to log file.';
    exit;
}

// Return a 204 No Content response to keep the iframe silent
http_response_code(204);
exit;
?>