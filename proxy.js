#!/usr/bin/env node

var path = require('path')
var fs = require('fs')
var http = require('http')
var https = require('https')
var debug = require('debug')('proxy')
var httpProxy = require('http-proxy')
var HttpProxyRules = require('http-proxy-rules')
var confPath = process.argv[2]
if (!confPath) throw new Error('specify path/to/conf.json')

var conf = require(path.resolve(confPath))
var proxy = httpProxy.createProxy()
// Set up proxy
var proxyRules = new HttpProxyRules({
  rules: conf.rules
})

proxy.on('error', function (err, req, res) {
  debug('error handling request', req.url, err)
  res.writeHead(500, { 'Content-Type': 'text/plain' });
  res.end('internal error');
})

var protocol
var conf = require(path.resolve(process.cwd(), confPath))
var credentials
var server
var port
var defaultTarget
var credentialsPath = conf.sslCredentialsPath
if (credentialsPath) {
  try {
    var privateKey = fs.readFileSync(path.join(credentialsPath, 'privkey.pem'))
    var certificate = fs.readFileSync(path.join(credentialsPath, 'cert.pem'))
    credentials = {
      key: privateKey,
      cert: certificate
    }
  } catch (err) {
    var reason = 'unable to read TLS certificate'
    if (/permission denied/.test(err.message)) {
      reason += ', permission denied,'
    }

    console.log(reason, ', running in HTTP mode')
  }
}

if (credentials) {
  server = https.createServer(credentials, requestHandler)
  port = 443
  defaultTarget = 'http://localhost:80'
} else {
  server = http.createServer(requestHandler)
  port = 80
}

server.listen(port)

function requestHandler (req, res) {
  var target = proxyRules.match(req) || defaultTarget
  if (target) {
    return proxy.web(req, res, {
      target: target
    })
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Is this the error page you were looking for?');
}
