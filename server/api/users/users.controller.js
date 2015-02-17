'use strict';

var Firebase = require('firebase');
var config = require('../../config/environment');
var ref = new Firebase(config.firebase.url);

// Gets the users already queried from Firebase.
exports.index = function(req, res) {
  ref.child('users').once('value', function (data) {
    if(!data.val()) {
      return res.jsonp([]);
    } else {
      data = data.val();
      res.jsonp(Object.keys(data));
    }
  });
};