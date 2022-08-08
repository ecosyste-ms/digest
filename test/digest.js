var calculateDigest = require('./digest.js')

calculateDigest('sha256', 'hex', 'https://registry.npmjs.org/playwright/-/playwright-1.19.0-beta-1644595974000.tgz').then(function(digest) {
  console.log(digest)
}).catch(function(error) {
  console.log(error)
})