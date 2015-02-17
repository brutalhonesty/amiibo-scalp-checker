'use strict';

var Firebase = require('firebase');
var config = require('../../../config/environment');
var ref = new Firebase(config.firebase.url);
var validator = require('validator');

// Get users ranked and paginated.
exports.index = function(req, res) {
  var limit = req.query.limit || 20;
  if(!validator.isInt(limit)) {
    return res.status(400).jsonp({message: 'Invalid limit, must be integer.'});
  }
  limit = validator.toInt(limit);
  ref.child('users').orderByKey().limitToFirst(limit).once('value', function (snapshot) {
    var users = snapshot.val();
    if(!users) {
      return res.status(400).jsonp({message: 'Could not get list of users.'});
    }
    var list = [];
    for(var user in users) {
      list.push(users[user]);
    }
    return res.jsonp(list);
  });
};