<?php
// messages/log.php

// Path to the log file
$log_file = 'messages.log';

// Set appropriate headers to prevent caching
header('Cache-Control: no-cache, must-revalidate');
header('Expires: Sat, 26 Jul 1997 05:00:00 GMT');

// Get the query parameters
$message = isset($_GET['message']) ? $_GET['message'] : '';
$user = isset($_GET['user']) ? $_GET['user'] : 'Anonymous';

// Get current timestamp
$timestamp = date('Y-m-d H:i:s');

// Log the message if 'message' parameter is present
if (!empty($message)) {
    // Sanitize input to prevent log injection and XSS
    $sanitized_message = htmlspecialchars($message, ENT_QUOTES, 'UTF-8');
    $sanitized_user = htmlspecialchars($user, ENT_QUOTES, 'UTF-8');

    // Format the log entry
    $log_entry = "[$timestamp] User: $sanitized_user, Message: $sanitized_message\n";

    // Append the log entry to the log file
    file_put_contents($log_file, $log_entry, FILE_APPEND | LOCK_EX);
}

// Respond with a 204 No Content status
http_response_code(204);
exit;
?>