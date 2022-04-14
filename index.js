const http = require('http')
const fs = require('fs')
const fetch = require('node-fetch');
const url = require('url');
// const AbortController = require('abort-controller'); // TODO timeout after 30 seconds
var crypto = require('crypto');

async function digest(algorithm, url) {
  try{
    algorithm = (typeof algorithm !== 'undefined') ?  algorithm : 'sha256'
    // TODO support go modules hashing algo

    var download = await fetch(url) // TODO handle failure to load url gracefully
    const digest = crypto.createHash(algorithm).update(await download.buffer()).digest('base64');
    return {algorithm, digest, url}
  } catch {
    return {error: 'invalid url'}
  }
}

const handler = async function (req, res) {
  var parsedUrl = url.parse(req.url,true)
  var query = parsedUrl.query

  if (parsedUrl.pathname == '/digest') {
    if(query.url){
      var result = await digest(query.algorithm, query.url)
    } else {
      var result = {error: 'invalid parameters, url must be provided'}
    }
    res.setHeader('Content-Type', 'application/json');

    if (result.digest){
      res.writeHead(200);
    } else {
      res.writeHead(500);
    }

    res.end(JSON.stringify(result));
  } else if (parsedUrl.pathname == '/algorithms') {
    var algorithms = crypto.getHashes();
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(algorithms));
  } else if (parsedUrl.pathname == '/') {
    res.writeHead(200, { 'content-type': 'text/html' })
    fs.createReadStream('index.html').pipe(res)
  } else {
    res.writeHead(404);
    res.end('404')
  } 
}

const server = http.createServer(handler);
server.listen(process.env.PORT || 8080);
