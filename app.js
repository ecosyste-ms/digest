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

var RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);
var RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '60', 10);

function rateLimitKey(req) {
    return req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
}

function createRateLimiter(options = {}) {
    var windowMs = options.windowMs || RATE_LIMIT_WINDOW_MS;
    var maxRequests = options.maxRequests || RATE_LIMIT_MAX_REQUESTS;
    var clients = new Map();

    return function rateLimiter(req, res) {
        if (maxRequests <= 0) return false;

        var now = Date.now();
        var key = rateLimitKey(req);
        var record = clients.get(key);

        if (!record || record.resetAt <= now) {
            record = { count: 0, resetAt: now + windowMs };
            clients.set(key, record);
        }

        record.count += 1;
        var remaining = Math.max(maxRequests - record.count, 0);
        var resetSeconds = Math.ceil((record.resetAt - now) / 1000);

        res.setHeader('RateLimit-Limit', String(maxRequests));
        res.setHeader('RateLimit-Remaining', String(remaining));
        res.setHeader('RateLimit-Reset', String(resetSeconds));

        if (record.count > maxRequests) {
            res.setHeader('Retry-After', String(resetSeconds));
            res.writeHead(429, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ error: 'rate limit exceeded' }));
            return true;
        }

        return false;
    };
}

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

function createApp(options = {}) {
    var rateLimiter = createRateLimiter(options.rateLimit || {});

    var server = http.createServer(async (req, res) => {
        if (rateLimiter(req, res)) return;
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

module.exports = { createApp, createRateLimiter };
