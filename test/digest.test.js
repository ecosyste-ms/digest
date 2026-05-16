var { describe, it, before, after } = require('node:test');
var assert = require('node:assert');
var http = require('node:http');
var crypto = require('node:crypto');
var calculateDigest = require('../digest.js');

var testContent = 'hello world';
var testServer;
var testUrl;

before(() => {
    return new Promise((resolve) => {
        testServer = http.createServer((req, res) => {
            if (req.url === '/empty') {
                res.writeHead(200, { 'content-length': '0' });
                res.end('');
            } else if (req.url === '/no-content-length') {
                res.writeHead(200);
                res.end(testContent);
            } else if (req.url === '/large-header') {
                res.writeHead(200, { 'content-length': '999' });
                res.end(testContent);
            } else if (req.url === '/binary') {
                var buf = Buffer.from([0x00, 0x01, 0x02, 0xff]);
                res.writeHead(200, { 'content-length': String(buf.length) });
                res.end(buf);
            } else {
                res.writeHead(200, { 'content-length': String(Buffer.byteLength(testContent)) });
                res.end(testContent);
            }
        });
        testServer.listen(0, () => {
            var addr = testServer.address();
            testUrl = `http://localhost:${addr.port}`;
            resolve();
        });
    });
});

after(() => {
    testServer.close();
});

describe('calculateDigest', () => {
    it('returns sha256 hex digest by default', async () => {
        var result = await calculateDigest(undefined, undefined, testUrl + '/test');
        var expected = crypto.createHash('sha256').update(testContent).digest('hex');
        assert.strictEqual(result.algorithm, 'sha256');
        assert.strictEqual(result.encoding, 'hex');
        assert.strictEqual(result.digest, expected);
    });

    it('returns correct SRI string', async () => {
        var result = await calculateDigest(undefined, undefined, testUrl + '/test');
        var expected = crypto.createHash('sha256').update(testContent).digest('hex');
        assert.strictEqual(result.sri, `sha256-${expected}`);
    });

    it('supports md5 algorithm', async () => {
        var result = await calculateDigest('md5', undefined, testUrl + '/test');
        var expected = crypto.createHash('md5').update(testContent).digest('hex');
        assert.strictEqual(result.algorithm, 'md5');
        assert.strictEqual(result.digest, expected);
    });

    it('supports sha512 algorithm', async () => {
        var result = await calculateDigest('sha512', undefined, testUrl + '/test');
        var expected = crypto.createHash('sha512').update(testContent).digest('hex');
        assert.strictEqual(result.algorithm, 'sha512');
        assert.strictEqual(result.digest, expected);
    });

    it('supports base64 encoding', async () => {
        var result = await calculateDigest('sha256', 'base64', testUrl + '/test');
        var expected = crypto.createHash('sha256').update(testContent).digest('base64');
        assert.strictEqual(result.encoding, 'base64');
        assert.strictEqual(result.digest, expected);
    });

    it('returns bytes from content-length header', async () => {
        var result = await calculateDigest(undefined, undefined, testUrl + '/test');
        assert.strictEqual(result.bytes, String(Buffer.byteLength(testContent)));
    });

    it('returns the requested url', async () => {
        var url = testUrl + '/test';
        var result = await calculateDigest(undefined, undefined, url);
        assert.strictEqual(result.url, url);
    });

    it('handles empty content', async () => {
        var result = await calculateDigest(undefined, undefined, testUrl + '/empty');
        var expected = crypto.createHash('sha256').update('').digest('hex');
        assert.strictEqual(result.digest, expected);
    });

    it('hashes binary content as bytes', async () => {
        var result = await calculateDigest(undefined, undefined, testUrl + '/binary');
        var expected = crypto.createHash('sha256').update(Buffer.from([0x00, 0x01, 0x02, 0xff])).digest('hex');
        assert.strictEqual(result.digest, expected);
        assert.strictEqual(result.algorithm, 'sha256');
    });

    it('supports dirhash for go module zip files', async () => {
        var result = await calculateDigest('dirhash', undefined, 'https://github.com/foragepm/zipdigest/archive/refs/tags/v1.0.0.zip');

        assert.strictEqual(result.algorithm, 'dirhash');
        assert.strictEqual(result.encoding, 'base64');
        assert.ok(result.digest.startsWith('h1:'));
        assert.strictEqual(result.sri, `dirhash-${result.digest}`);
        assert.ok(Number(result.bytes) > 0);
    });
});
