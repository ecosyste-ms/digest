var { describe, it, before, after } = require('node:test');
var assert = require('node:assert');
var http = require('node:http');
var crypto = require('node:crypto');
var { createApp } = require('../app.js');

var fixtureContent = 'test fixture content';

function request(server, path) {
  return new Promise((resolve, reject) => {
    var address = server.address();
    var req = http.request({
      hostname: 'localhost',
      port: address.port,
      path: path,
      method: 'GET'
    }, (res) => {
      var body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: body,
          json: () => JSON.parse(body)
        });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

var fixtureServer;
var fixtureUrl;

before(() => {
  return new Promise((resolve) => {
    fixtureServer = http.createServer((req, res) => {
      res.writeHead(200, { 'content-length': String(Buffer.byteLength(fixtureContent)) });
      res.end(fixtureContent);
    });
    fixtureServer.listen(0, () => {
      var addr = fixtureServer.address();
      fixtureUrl = `http://localhost:${addr.port}/file`;
      resolve();
    });
  });
});

after(() => {
  fixtureServer.close();
});

describe('GET /algorithms', () => {
  var server;

  before(() => {
    var app = createApp();
    server = app.listen(0);
  });

  after(() => {
    server.close();
  });

  it('returns 200 status', async () => {
    var res = await request(server, '/algorithms');
    assert.strictEqual(res.status, 200);
  });

  it('returns JSON content type', async () => {
    var res = await request(server, '/algorithms');
    assert.ok(res.headers['content-type'].includes('application/json'));
  });

  it('returns array of hash algorithms', async () => {
    var res = await request(server, '/algorithms');
    var data = res.json();
    assert.ok(Array.isArray(data));
    assert.ok(data.length > 0);
    assert.ok(data.includes('sha256'));
    assert.ok(data.includes('sha512'));
    assert.ok(data.includes('md5'));
  });

  it('matches crypto.getHashes()', async () => {
    var res = await request(server, '/algorithms');
    var data = res.json();
    var expected = crypto.getHashes();
    assert.deepStrictEqual(data, expected);
  });
});

describe('GET /digest', () => {
  var server;

  before(() => {
    var app = createApp();
    server = app.listen(0);
  });

  after(() => {
    server.close();
  });

  it('returns 200 status', async () => {
    var res = await request(server, `/digest?url=${fixtureUrl}`);
    assert.strictEqual(res.status, 200);
  });

  it('returns JSON with digest fields', async () => {
    var res = await request(server, `/digest?url=${fixtureUrl}`);
    var data = res.json();
    assert.ok(data.algorithm);
    assert.ok(data.encoding);
    assert.ok(data.digest);
    assert.ok(data.url);
    assert.ok(data.sri);
  });

  it('defaults to sha256 algorithm', async () => {
    var res = await request(server, `/digest?url=${fixtureUrl}`);
    var data = res.json();
    assert.strictEqual(data.algorithm, 'sha256');
  });

  it('defaults to hex encoding', async () => {
    var res = await request(server, `/digest?url=${fixtureUrl}`);
    var data = res.json();
    assert.strictEqual(data.encoding, 'hex');
  });

  it('returns correct digest value', async () => {
    var res = await request(server, `/digest?url=${fixtureUrl}`);
    var data = res.json();
    var expected = crypto.createHash('sha256').update(fixtureContent).digest('hex');
    assert.strictEqual(data.digest, expected);
  });

  it('respects custom algorithm', async () => {
    var res = await request(server, `/digest?url=${fixtureUrl}&algorithm=md5`);
    var data = res.json();
    assert.strictEqual(data.algorithm, 'md5');
    var expected = crypto.createHash('md5').update(fixtureContent).digest('hex');
    assert.strictEqual(data.digest, expected);
  });

  it('respects custom encoding', async () => {
    var res = await request(server, `/digest?url=${fixtureUrl}&encoding=base64`);
    var data = res.json();
    assert.strictEqual(data.encoding, 'base64');
    var expected = crypto.createHash('sha256').update(fixtureContent).digest('base64');
    assert.strictEqual(data.digest, expected);
  });

  it('returns SRI format', async () => {
    var res = await request(server, `/digest?url=${fixtureUrl}`);
    var data = res.json();
    assert.ok(data.sri.startsWith('sha256-'));
  });
});

describe('static files', () => {
  var server;

  before(() => {
    var app = createApp();
    server = app.listen(0);
  });

  after(() => {
    server.close();
  });

  it('serves index.html at root', async () => {
    var res = await request(server, '/');
    assert.strictEqual(res.status, 200);
    assert.ok(res.headers['content-type'].includes('text/html'));
  });

  it('serves favicon.ico', async () => {
    var res = await request(server, '/favicon.ico');
    assert.strictEqual(res.status, 200);
  });
});


describe('API documentation', () => {
  var server;

  before(() => {
    var app = createApp();
    server = app.listen(0);
  });

  after(() => {
    server.close();
  });

  it('serves openapi.yaml', async () => {
    var res = await request(server, '/openapi.yaml');
    assert.strictEqual(res.status, 200);
    assert.ok(res.headers['content-type'].includes('application/yaml'));
    assert.ok(res.body.includes('openapi: 3.0.3'));
  });

  it('serves swagger docs at /docs', async () => {
    var res = await request(server, '/docs');
    assert.strictEqual(res.status, 200);
    assert.ok(res.headers['content-type'].includes('text/html'));
    assert.ok(res.body.includes('/openapi.yaml'));
  });
});

describe('404 handling', () => {
  var server;

  before(() => {
    var app = createApp();
    server = app.listen(0);
  });

  after(() => {
    server.close();
  });

  it('returns 404 for unknown routes', async () => {
    var res = await request(server, '/unknown');
    assert.strictEqual(res.status, 404);
  });
});
