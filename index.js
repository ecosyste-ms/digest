const http = require('http')
const fetch = require('node-fetch');
const url = require('url');
// const AbortController = require('abort-controller'); // TODO timeout after 30 seconds
var crypto = require('crypto');

async function digest(algorithm, url) {
  // TODO support go modules hashing algo

  var download = await fetch(url) // TODO handle failure to load url gracefully
  const digest = crypto.createHash(algorithm).update(await download.buffer()).digest('base64');
  return {algorithm, digest}
}

const handler = async function (req, res) {
  var parsedUrl = url.parse(req.url,true)
  var query = parsedUrl.query

  if (parsedUrl.pathname == '/digest') {
    if(query.url){
      var result = await digest(query.algorithm, query.url)
    } else {
      var result = {error: 'invalid parameters'}
    }
  } else {
    var result = {error: 'incorrect path'}
  } 

  res.setHeader('Content-Type', 'application/json');

  if (result.digest){
    res.writeHead(200);
  } else {
    res.writeHead(500);
  }

  res.end(JSON.stringify(result));
}

const server = http.createServer(handler);
server.listen(process.env.PORT || 8080);
