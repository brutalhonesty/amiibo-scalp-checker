'use strict';

var kue = require('kue');
var redis = require('redis');
var url = require('url');
var config = require('../../../config/environment');
var scanner = require('./scanner');

var redisUrl = url.parse(config.redis.url);
var jobs = kue.createQueue({
  redis: {
    host: redisUrl.hostname,
    port: redisUrl.port,
    auth: redisUrl.auth ? redisUrl.auth.split(":")[1] : null
  }
});

// Scan the requested user for their weights.
exports.index = function(req, res) {
  var username = req.body.username;
  var job = jobs.create('scan', {
    username: username
  }).save(function (error) {
    if(error) {
      return res.status(500).jsonp({message: 'Could not queue request.'});
    }
    scanner.scan();
    return res.jsonp({message: 'Scan requested.', id: job.id});
  });
};