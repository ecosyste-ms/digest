const express = require('express')
const app = express()
var crypto = require('crypto');
var calculateDigest = require('./digest.js')
const port = process.env.PORT || 8080

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

app.listen(port, () => {
  console.log(`Listening on port ${port}`)
})