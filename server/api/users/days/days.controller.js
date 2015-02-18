'use strict';

var Firebase = require('firebase');
var async = require('async');
var config = require('../../../config/environment');
var ref = new Firebase(config.firebase.url);

// Get a list of all the Reddit users days on Reddit.
exports.index = function(req, res) {
  ref.child('users').once('value', function (users) {
    if(!users.val()) {
      return res.status(500).jsonp({message: 'Could not get days.'});
    }
    users = users.val();
    var days = [];
    async.each(Object.keys(users), function (user, cb) {
      days.push(users[user].days);
      return cb(null);
    }, function (error) {
      if(error) {
        return res.status(500).jsonp({message: 'Could not get days.'});
      }
      ref.child('age').once('value', function (age) {
        if(!age.val()) {
          return res.status(500).jsonp({message: 'Could not get days.'});
        }
        age = age.val();
        return res.jsonp({days: days.sort(function(a, b) { return a - b; }), average: age.average});
      });
    });
  });
};