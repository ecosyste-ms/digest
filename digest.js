var crypto = require('crypto');
var fs = require('fs-extra');
var tmp = require('tmp-promise');
var { zipDigest } = require('zipdigest');

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

    if (algorithm === 'dirhash') {
      return await calculateDirhash(url, response);
    }

    var bytes = response.headers.get('content-length');
    var body = Buffer.from(await response.arrayBuffer());

    if (!bytes) {
      bytes = String(body.byteLength);
    }

    var digest = crypto.createHash(algorithm).update(body).digest(encoding);
    var sri = `${algorithm}-${digest}`
    return {algorithm, encoding, digest, url, bytes, sri}
}

async function calculateDirhash(url, response) {
    var dir = await tmp.dir({ unsafeCleanup: true });
    var zippath = `${dir.path}/module.zip`;

    try {
      var body = Buffer.from(await response.arrayBuffer());
      await fs.writeFile(zippath, body);
      var digest = `h1:${await zipDigest(zippath)}`;

      return {
        algorithm: 'dirhash',
        encoding: 'base64',
        digest,
        url,
        bytes: String(body.byteLength),
        sri: `dirhash-${digest}`
      };
    } finally {
      await dir.cleanup();
    }
}

module.exports = calculateDigest;