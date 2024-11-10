<?php
// messages/index.php

// Path to the log file
$log_file = 'messages.log';

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

    $log_entry = "[$timestamp] User: $sanitized_user, Message: $sanitized_message\n";
    file_put_contents($log_file, $log_entry, FILE_APPEND | LOCK_EX);
}

// Read all logged messages
$logs = '';
if (file_exists($log_file)) {
    $logs = nl2br(htmlspecialchars(file_get_contents($log_file), ENT_QUOTES, 'UTF-8'));
}
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
        pre { 
            background-color: #fff; 
            padding: 15px; 
            border: 1px solid #ddd; 
            border-radius: 5px; 
            max-height: 500px; 
            overflow-y: auto;
        }
    </style>
</head>
<body>
    <h1>Messages Log</h1>
    <pre><?php echo $logs; ?></pre>
</body>
</html>