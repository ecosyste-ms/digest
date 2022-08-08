const axios = require('axios');
var crypto = require('crypto');

async function calculateDigest(algorithm, encoding, url) {
    algorithm = (typeof algorithm !== 'undefined') ?  algorithm : 'sha256'
    encoding = (typeof encoding !== 'undefined') ?  encoding : 'hex'
    // TODO support go modules hashing algo

    const download = await axios.get(url, {
      timeout: 1000*5, 
      maxContentLength: 50*1024*1024,
      transformResponse: res => res
    });  
    
    // TODO only digest if response is a success (example: 403 with body - https://rubygems.org/downloads/sorbet-static-0.4.5125.gem)
  
    if (download.headers['content-length']){
      var bytes = download.headers['content-length']
    } else {
      var downloadClone = await download.clone();
      var bytes = (await downloadClone.text()).length
    }

    const digest = crypto.createHash(algorithm).update(download.data).digest(encoding);
    const sri = `${algorithm}-${digest}`
    return {algorithm, encoding, digest, url, bytes, sri}
}

module.exports = calculateDigest;