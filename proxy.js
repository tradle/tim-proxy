#!/usr/bin/env node

var path = require('path')
var http = require('http')
var https = require('https')
var debug = require('debug')('proxy')
var httpProxy = require('http-proxy')
var HttpProxyRules = require('http-proxy-rules')
var credentialsPath = process.argv[2] || '/etc/letsencrypt/live/tradle.io/'
try {
  var privateKey = fs.readFileSync(path.join(credentialsPath, 'privkey.pem'))
  var certificate = fs.readFileSync(path.join(credentialsPath, 'cert.pem'))
  var credentials = {
    key: privateKey,
    cert: certificate
  }
} catch (err) {
  console.log('unable to read TLS certificate, running in HTTP mode')
}

// Set up proxy rules instance
var DEFAULT_TARGET = 'http://localhost:8080'
var proxyRules = new HttpProxyRules({
  rules: {
    '^/keeper': 'http://localhost:25667/',
    '^/bank': 'http://localhost:44444/'
  }
})

var proxy = httpProxy.createProxy()
proxy.on('error', function (err, req, res) {
  debug('error handling request', req.url, err)
  res.writeHead(500, { 'Content-Type': 'text/plain' });
  res.end('internal error');
})

var server
var port
if (credentials) {
  server = https.createServer(credentials, requestHandler)
  port = 443
} else {
  server = http.createServer(requestHandler)
  port = 80
}

server.listen(port)

function requestHandler (req, res) {
  var target = proxyRules.match(req) || DEFAULT_TARGET
  return proxy.web(req, res, {
    target: target
  })
}
