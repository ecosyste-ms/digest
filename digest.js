var crypto = require('crypto');
var zlib = require('zlib');

function readUInt16(buffer, offset) {
    return buffer.readUInt16LE(offset);
}

function readUInt32(buffer, offset) {
    return buffer.readUInt32LE(offset);
}

function findEndOfCentralDirectory(buffer) {
    var minOffset = Math.max(0, buffer.length - 0xffff - 22);
    for (var offset = buffer.length - 22; offset >= minOffset; offset--) {
        if (readUInt32(buffer, offset) === 0x06054b50) {
            return offset;
        }
    }
    throw new Error('Invalid zip file: central directory not found');
}

function normalizeZipPath(path) {
    var parts = path.split('/').filter(Boolean);
    if (parts.length > 1) {
        parts.shift();
    }
    return parts.join('/');
}

function extractZipFile(buffer, entry) {
    if (readUInt32(buffer, entry.localHeaderOffset) !== 0x04034b50) {
        throw new Error('Invalid zip file: local header not found');
    }
    var nameLength = readUInt16(buffer, entry.localHeaderOffset + 26);
    var extraLength = readUInt16(buffer, entry.localHeaderOffset + 28);
    var dataOffset = entry.localHeaderOffset + 30 + nameLength + extraLength;
    var compressed = buffer.subarray(dataOffset, dataOffset + entry.compressedSize);

    if (entry.compressionMethod === 0) {
        return compressed;
    }
    if (entry.compressionMethod === 8) {
        return zlib.inflateRawSync(compressed);
    }
    throw new Error(`Unsupported zip compression method: ${entry.compressionMethod}`);
}

function zipDirhash(buffer) {
    var eocdOffset = findEndOfCentralDirectory(buffer);
    var entryCount = readUInt16(buffer, eocdOffset + 10);
    var centralDirectoryOffset = readUInt32(buffer, eocdOffset + 16);
    var entries = [];
    var offset = centralDirectoryOffset;

    for (var i = 0; i < entryCount; i++) {
        if (readUInt32(buffer, offset) !== 0x02014b50) {
            throw new Error('Invalid zip file: central directory entry not found');
        }
        var compressionMethod = readUInt16(buffer, offset + 10);
        var compressedSize = readUInt32(buffer, offset + 20);
        var uncompressedSize = readUInt32(buffer, offset + 24);
        var fileNameLength = readUInt16(buffer, offset + 28);
        var extraLength = readUInt16(buffer, offset + 30);
        var commentLength = readUInt16(buffer, offset + 32);
        var localHeaderOffset = readUInt32(buffer, offset + 42);
        var fileName = buffer.subarray(offset + 46, offset + 46 + fileNameLength).toString('utf8');
        var normalizedPath = normalizeZipPath(fileName);

        if (normalizedPath !== '' && !fileName.endsWith('/')) {
            entries.push({
                path: normalizedPath,
                compressionMethod,
                compressedSize,
                uncompressedSize,
                localHeaderOffset,
            });
        }

        offset += 46 + fileNameLength + extraLength + commentLength;
    }

    entries.sort((a, b) => a.path.localeCompare(b.path));
    var lines = entries.map((entry) => {
        var contents = extractZipFile(buffer, entry);
        if (contents.length !== entry.uncompressedSize) {
            throw new Error(`Invalid zip file: size mismatch for ${entry.path}`);
        }
        var fileHash = crypto.createHash('sha256').update(contents).digest('hex');
        return `${fileHash}  ${entry.path}\n`;
    }).join('');

    return 'h1:' + crypto.createHash('sha256').update(lines).digest('base64');
}

async function calculateDigest(algorithm, encoding, url) {
    algorithm = (typeof algorithm !== 'undefined') ?  algorithm : 'sha256'
    encoding = (typeof encoding !== 'undefined') ?  encoding : 'hex'

    var controller = new AbortController();
    var timeout = setTimeout(() => controller.abort(), 1000*5);

    try {
      var response = await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }

    // TODO only digest if response is a success (example: 403 with body - https://rubygems.org/downloads/sorbet-static-0.4.5125.gem)

    var bytes = response.headers.get('content-length');
    var body = Buffer.from(await response.arrayBuffer());

    if (!bytes) {
      bytes = String(body.length);
    }

    var digest;
    if (algorithm === 'dirhash') {
      digest = zipDirhash(body);
    } else {
      digest = crypto.createHash(algorithm).update(body).digest(encoding);
    }
    var sri = `${algorithm}-${digest}`
    return {algorithm, encoding, digest, url, bytes, sri}
}

module.exports = calculateDigest;