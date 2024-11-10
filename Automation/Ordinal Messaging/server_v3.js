// server_v3.js

const http = require('http');
const url = require('url');

const PORT = 3000; // You can choose any available port

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);

  if (parsedUrl.pathname === '/receive') {
    const message = parsedUrl.query.message || 'No message';

    console.log('Received message:', message);

    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Message received');
  } else {
    res.statusCode = 404;
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});