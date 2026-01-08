const express = require('express')
var crypto = require('crypto');
var calculateDigest = require('./digest.js')

function createApp() {
  const app = express()

  app.use(express.static('public'))

  app.get('/digest', async (req, res) => {
    try{
      var digest = await calculateDigest(req.query.algorithm, req.query.encoding, req.query.url)
      res.send(digest)
    } catch(error) {
      console.log(error)
      res.send({error: error})
    }
  })

  app.get('/algorithms', (req, res) => {
    res.send(crypto.getHashes());
  })

  return app
}

module.exports = { createApp }
