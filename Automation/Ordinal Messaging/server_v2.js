const http = require('http');
const url = require('url');

const PORT = 80; // Use port 80 for standard HTTP

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);

  if (parsedUrl.pathname === '/receive') {
    const clientId = parsedUrl.query.client || 'unknown';

    console.log(`Received message from client: ${clientId}`);

    // Send a minimal response
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Message received');
  } else {
    res.statusCode = 404;
    res.end();
  }
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});