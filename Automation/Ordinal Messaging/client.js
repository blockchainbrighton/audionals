const http = require('http');

const options = {
  hostname: '82.19.195.148', // Your external IP or domain
  port: 3000, // The port your server is listening on
  path: '/',
  method: 'POST',
  headers: {
    'Content-Type': 'text/plain',
  },
};

const req = http.request(options, res => {
  console.log(`Server responded with status code: ${res.statusCode}`);
});

req.on('error', error => {
  console.error('Error sending message:', error);
});

// Replace 'Hello from client!' with any message you want
req.write('Hello from client!');
req.end();