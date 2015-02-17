'use strict';

var Firebase = require('firebase');
var config = require('../../../config/environment');
var ref = new Firebase(config.firebase.url);

// Get information about a particular Reddit username
exports.index = function(req, res) {
  var username = req.param('username');
  ref.child('users').child(username).once('value', function (data) {
    if(!data.val()) {
      return res.status(400).jsonp({message: 'Username does not exist, request a scan to add.'});
    } else {
      return res.jsonp(data.val());
    }
  });
};