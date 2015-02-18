'use strict';

var kue = require('kue');
var moment = require('moment');

function _checkJobLife(lastUpdated, state) {
  var lastUpdated = moment.utc(lastUpdated);
  var now = moment();
  if(state === 'complete' || state === 'failed') {
    return true;
  } else if (now.diff(lastUpdated) >= 300000) {
    return true;
  }
  return false;
}

// Get status of a scan request.
exports.index = function(req, res) {
  kue.Job.get(req.param('id'), function (error, job) {
    if(error) {
      return res.status(400).jsonp({message: 'Invalid id.'});
    }
    var isStale = _checkJobLife(parseInt(job.updated_at), job.state());
    if(isStale) {
      job.remove(function (error) {
        if(error) {
          return res.status(500).jsonp({message: 'Issue retreiving job status.'});
        }
        if(job.progress() === undefined) {
          return res.status(400).jsonp({message: 'Invalid id.'});
        }
        return res.jsonp({progress: job.progress()});
      });
    } else {
      if(job.progress() === undefined) {
        return res.status(400).jsonp({message: 'Invalid id.'});
      }
      return res.jsonp({progress: job.progress()});
    }
  });
};