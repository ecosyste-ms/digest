var { describe, it, before, after } = require('node:test');
var assert = require('node:assert');
var http = require('node:http');
var crypto = require('node:crypto');
var zlib = require('node:zlib');
var calculateDigest = require('../digest.js');

var testContent = 'hello world';
var testServer;
var testUrl;

function crc32(buffer) {
    var table = crc32.table || (crc32.table = Array.from({ length: 256 }, (_, i) => {
        var c = i;
        for (var k = 0; k < 8; k++) {
            c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        }
        return c >>> 0;
    }));
    var crc = 0xffffffff;
    for (var byte of buffer) {
        crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
}

function makeZip(files) {
    var localParts = [];
    var centralParts = [];
    var offset = 0;
    for (var [name, content] of files) {
        var nameBuffer = Buffer.from(name);
        var contentBuffer = Buffer.from(content);
        var compressed = zlib.deflateRawSync(contentBuffer);
        var crc = crc32(contentBuffer);
        var local = Buffer.alloc(30 + nameBuffer.length);
        local.writeUInt32LE(0x04034b50, 0);
        local.writeUInt16LE(20, 4);
        local.writeUInt16LE(8, 8);
        local.writeUInt32LE(crc, 14);
        local.writeUInt32LE(compressed.length, 18);
        local.writeUInt32LE(contentBuffer.length, 22);
        local.writeUInt16LE(nameBuffer.length, 26);
        nameBuffer.copy(local, 30);
        localParts.push(local, compressed);

        var central = Buffer.alloc(46 + nameBuffer.length);
        central.writeUInt32LE(0x02014b50, 0);
        central.writeUInt16LE(20, 4);
        central.writeUInt16LE(20, 6);
        central.writeUInt16LE(8, 10);
        central.writeUInt32LE(crc, 16);
        central.writeUInt32LE(compressed.length, 20);
        central.writeUInt32LE(contentBuffer.length, 24);
        central.writeUInt16LE(nameBuffer.length, 28);
        central.writeUInt32LE(offset, 42);
        nameBuffer.copy(central, 46);
        centralParts.push(central);
        offset += local.length + compressed.length;
    }
    var centralDirectory = Buffer.concat(centralParts);
    var eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);
    eocd.writeUInt16LE(files.length, 8);
    eocd.writeUInt16LE(files.length, 10);
    eocd.writeUInt32LE(centralDirectory.length, 12);
    eocd.writeUInt32LE(offset, 16);
    return Buffer.concat([...localParts, centralDirectory, eocd]);
}

function expectedDirhash(files) {
    var lines = files
        .map(([path, content]) => `${crypto.createHash('sha256').update(content).digest('hex')}  ${path.split('/').slice(1).join('/')}\n`)
        .sort()
        .join('');
    return 'h1:' + crypto.createHash('sha256').update(lines).digest('base64');
}

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
            } else if (req.url === '/module.zip') {
                var zip = makeZip([['example.com/mod@v1.0.0/go.mod', 'module example.com/mod\n'], ['example.com/mod@v1.0.0/main.go', 'package main\n']]);
                res.writeHead(200, { 'content-length': String(zip.length) });
                res.end(zip);
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

    it('supports Go module dirhash for zip archives', async () => {
        var files = [['example.com/mod@v1.0.0/go.mod', 'module example.com/mod\n'], ['example.com/mod@v1.0.0/main.go', 'package main\n']];
        var result = await calculateDigest('dirhash', undefined, testUrl + '/module.zip');
        assert.strictEqual(result.algorithm, 'dirhash');
        assert.strictEqual(result.digest, expectedDirhash(files));
        assert.strictEqual(result.sri, `dirhash-${result.digest}`);
    });
});
