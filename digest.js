var crypto = require('crypto');

async function calculateDigest(algorithm, encoding, url) {
    algorithm = (typeof algorithm !== 'undefined') ?  algorithm : 'sha256'
    encoding = (typeof encoding !== 'undefined') ?  encoding : 'hex'
    // TODO support go modules hashing algo

    var controller = new AbortController();
    var timeout = setTimeout(() => controller.abort(), 1000*5);

    try {
      var response = await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }

    // TODO only digest if response is a success (example: 403 with body - https://rubygems.org/downloads/sorbet-static-0.4.5125.gem)

    var bytes = response.headers.get('content-length');
    var body = await response.text();

    if (!bytes) {
      bytes = String(Buffer.byteLength(body));
    }

    var digest = crypto.createHash(algorithm).update(body).digest(encoding);
    var sri = `${algorithm}-${digest}`
    return {algorithm, encoding, digest, url, bytes, sri}
}

module.exports = calculateDigest;