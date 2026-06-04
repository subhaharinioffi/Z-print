const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8000;
const MACHINE_ID = 'XRX-429-IND';

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  if (pathname === '/' || pathname === '/upload.html') {
    // Serve upload.html
    const filepath = path.join(__dirname, 'upload.html');
    fs.readFile(filepath, 'utf8', (err, content) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(`Internal Server Error: ${err.message}`);
        return;
      }

      // Dynamic Jinja-like template replacement for machine_id
      const rendered = content.replace(/\{\{\s*machine_id\s*\}\}/g, MACHINE_ID);

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(rendered);
    });
  } else {
    // Fallback for static files
    let filepath = path.join(__dirname, pathname);
    
    // Safety check to prevent directory traversal
    if (!filepath.startsWith(__dirname)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('Forbidden');
      return;
    }

    fs.stat(filepath, (err, stats) => {
      if (err || !stats.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
        return;
      }

      // Basic mime type mapping
      const ext = path.extname(filepath).toLowerCase();
      let mimeType = 'application/octet-stream';
      if (ext === '.html') mimeType = 'text/html';
      else if (ext === '.css') mimeType = 'text/css';
      else if (ext === '.js') mimeType = 'application/javascript';
      else if (ext === '.json') mimeType = 'application/json';
      else if (ext === '.png') mimeType = 'image/png';
      else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
      else if (ext === '.gif') mimeType = 'image/gif';
      else if (ext === '.svg') mimeType = 'image/svg+xml';
      else if (ext === '.pdf') mimeType = 'application/pdf';

      res.writeHead(200, { 'Content-Type': mimeType });
      fs.createReadStream(filepath).pipe(res);
    });
  }
});

server.listen(PORT, () => {
  console.log('\n' + '='.repeat(50));
  console.log(' AUTOMATIC XEROX PRINTING SYSTEM');
  console.log(` Active Machine: ${MACHINE_ID}`);
  console.log(` Local Dev Server running on: http://localhost:${PORT}`);
  console.log(' Press Ctrl+C to terminate.');
  console.log('='.repeat(50) + '\n');
});
