var http = require('node:http');
var fs = require('node:fs');
var path = require('node:path');
var crypto = require('node:crypto');
var calculateDigest = require('./digest.js');

var MIME_TYPES = {
    '.html': 'text/html',
    '.ico': 'image/x-icon',
    '.yaml': 'application/yaml',
    '.yml': 'application/yaml'
};

var publicDir = path.join(__dirname, 'public');

function serveStatic(req, res) {
    var filePath = req.url === '/' ? '/index.html' : req.url;
    var fullPath = path.join(publicDir, filePath);

    if (!fullPath.startsWith(publicDir)) {
        res.writeHead(403);
        res.end();
        return true;
    }

    try {
        var data = fs.readFileSync(fullPath);
    } catch {
        return false;
    }

    var ext = path.extname(fullPath);
    var contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'content-type': contentType });
    res.end(data);
    return true;
}

function createApp() {
    var server = http.createServer(async (req, res) => {
        var url = new URL(req.url, `http://${req.headers.host}`);

        if (url.pathname === '/digest' && req.method === 'GET') {
            try {
                var digest = await calculateDigest(
                    url.searchParams.get('algorithm') || undefined,
                    url.searchParams.get('encoding') || undefined,
                    url.searchParams.get('url')
                );
                res.writeHead(200, { 'content-type': 'application/json' });
                res.end(JSON.stringify(digest));
            } catch (error) {
                console.log(error);
                res.writeHead(200, { 'content-type': 'application/json' });
                res.end(JSON.stringify({ error: error }));
            }
            return;
        }

        if (url.pathname === '/algorithms' && req.method === 'GET') {
            res.writeHead(200, { 'content-type': 'application/json' });
            res.end(JSON.stringify(crypto.getHashes()));
            return;
        }

        if (url.pathname === '/docs' && req.method === 'GET') {
            res.writeHead(200, { 'content-type': 'text/html' });
            res.end(`<!doctype html>
<html>
  <head>
    <title>Ecosyste.ms Digest API docs</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.onload = () => {
        window.ui = SwaggerUIBundle({
          url: '/openapi.yaml',
          dom_id: '#swagger-ui'
        });
      };
    </script>
  </body>
</html>`);
            return;
        }

        if (serveStatic(req, res)) return;

        res.writeHead(404);
        res.end();
    });

    return server;
}

module.exports = { createApp };
