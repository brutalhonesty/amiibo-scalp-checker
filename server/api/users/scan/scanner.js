'use strict';

var Firebase = require('firebase');
var kue = require('kue');
var userAgent = 'nodejs:OperationCheckScalper:v0.5 (by /u/Brutalhonesty08)';
var request = require('request').defaults({json: true, headers: {'User-Agent': userAgent}});
var async = require('async');
var moment = require('moment');
var qs = require('querystring');
var redis = require('redis');
var url = require('url');
var config = require('../../../config/environment');
var ref = new Firebase(config.firebase.url);

var redisUrl = url.parse(config.redis.url);
var jobs = kue.createQueue({
  redis: {
    host: redisUrl.hostname,
    port: redisUrl.port,
    auth: redisUrl.auth ? redisUrl.auth.split(":")[1] : null
  }
});

var staggerRequests = false;
var waitTime = 0; // In seconds

// Check https://api.reddit.com/user/<user>/about.json for age.
function _getRedditAge(job, username, callback) {
  if(staggerRequests) {
    console.log('Staggering requests because of rate limits.');
    setTimeout(function () {
      waitTime = 0;
      staggerRequests = false;
      _getRedditAge(job, username, callback);
    }, waitTime);
  } else {
    request.get('https://api.reddit.com/user/'+username+'/about.json', function (error, response, body) {
      if(error) {
        return callback(error);
      }
      if(response.statusCode !== 200) {
        return callback(body);
      }
      job.progress(1, 100);
      if(response.headers['X-Ratelimit-Remaining'] && response.headers['X-Ratelimit-Remaining'] <= 20) {
        staggerRequests = true;
        waitTime = response.headers['X-Ratelimit-Reset'];
      } else {
        staggerRequests = false;
      }
      var age = body.data.created_utc * 1000;
      return callback(null, age);
    });
  }
}

// Check https://api.reddit.com/user/<user>/comments.json?limit=100 and get all pages.
function _getAllComments(username, comments, after, callback) {
  comments = comments || [];
  var query = {
    limit: 100
  };
  if(after) {
    query.after = after;
  }
  if(staggerRequests) {
    console.log('Staggering requests because of rate limits.');
    setTimeout(function () {
      waitTime = 0;
      staggerRequests = false;
      _getAllComments(username, comments, after, callback);
    }, waitTime);
  } else {
    request.get('https://api.reddit.com/user/'+username+'/comments.json?' + qs.stringify(query), function (error, response, body) {
      if(error) {
        return callback(error);
      }
      if(response.statusCode !== 200) {
        return callback(body);
      }
      if(response.headers['X-Ratelimit-Remaining'] && response.headers['X-Ratelimit-Remaining'] <= 20) {
        staggerRequests = true;
        waitTime = response.headers['X-Ratelimit-Reset'];
      } else {
        staggerRequests = false;
        waitTime = 0;
      }
      var newComments = body.data.children.map(function (post) {
        return {id: post.data.id, body: post.data.body, subreddit: post.data.subreddit, score: post.data.score, guilded: post.data.gilded, hasSarcasm: false};
      });
      comments = comments.concat(newComments);
      if(body.data.after) {
        _getAllComments(username, comments, body.data.after, callback);
      } else {
        return callback(null, comments);
      }
    });
  }
}

function _reduceComments(comments, subreddits, callback) {
  var newComments = [];
  for (var i = 0; i < comments.length; i++) {
    var comment = comments[i];
    if(subreddits.indexOf(comment.subreddit) !== -1) {
      newComments.push(comment);
    }
  }
  return callback(null, newComments);
}

function _detectCommentSarcasm(comments, callback) {
  var count = 0;
  var inB4RegExp = new RegExp(/[I|i]n(\s)?([B|b]4|[B|b]efore)/g);
  var slashSRegExp = new RegExp(/\s\/s(arcasm)?/g);
  for (var i = 0; i < comments.length; i++) {
    var comment = comments[i];
    var tempComment = comment.body.toLowerCase();
    if(tempComment.match(slashSRegExp) || tempComment.match(inB4RegExp)) {
      count++;
      comment.hasSarcasm = true;
    }
    // TODO we can expand on this by checking the context of the comment in the thread.
    // Example of sarcasm: From a collector who was hoping to actually <i>use</i> amiibos, thanks scalpers. Thanks a lot.
  }
  return callback(null, {comments: comments, count: count});
}

function _getDeletedComments(comments, callback) {
  var deletedList = [];
  for (var i = 0; i < comments.length; i++) {
    var comment = comments[i];
    if(comment.body === '[deleted]') {
      deletedList.push(comment);
    }
  }
  return callback(null, deletedList);
}

// TODO Write this unedit comments method.
// Hit http://uneddit.com/restoreFullComments.php?ncTS=1421348435&lnk=t3_2rwgv8 where 1421348435 is the lates comment in the thread, and t3_2rwgv8 is the parent thread id.
// Data comes back as a javascript file. Need to parse out the array.
function _uneditComments(deletedComments, callback) {
  return callback(null, deletedComments);
}

function _analyzeComments(comments, callback) {
  var haveRegExp = new RegExp(/[H|h]ave\s(([2-9]|[2-9]\d|\d{2,}))/g);
  var boughtRegExp = new RegExp(/[B|b]ought\s(([2-9]|[2-9]\d|\d{2,}))/g);
  var inForRegExp = new RegExp(/[I|i]n\s[F|f]or\s(([2-9]|[2-9]\d|\d{2,}))/g);
  var gotRegExp = new RegExp(/[G|g]ot\s(([2-9]|[2-9]\d|\d{2,}))/g);
  var bunchRegExp = new RegExp(/[G|g]ot\s[A|a]\s[B|b]unch/g);
  var myRegExp = new RegExp(/[M|m]y\s(([2-9]|[2-9]\d|\d{2,}))/g);
  var ownRegExp = new RegExp(/[O|o]wn\s(([2-9]|[2-9]\d|\d{2,}))/g);
  var soldRegExp = new RegExp(/[S|s]old\s(([2-9]|[2-9]\d|\d{2,}))/g);
  var sellRegExp = new RegExp(/([I|i])?(\s)?([R|r]e)?[S|s]ell(ing)?/g);
  var preOrderRegExp = new RegExp(/[P|p]re(-)?[O|o]rder(ed)?\s(([2-9]|[2-9]\d|\d{2,}))/g);
  var scoredRegExp = new RegExp(/[S|s]core(d)?\s(([2-9]|[2-9]\d|\d{2,}))/g);
  var amiiboRegExp = new RegExp(/((([2-9]|[2-9]\d|\d{2,}))|([[T|t](wo|hree|en)|[F|f](our|ive)|[S|s](ix|even)|[E|e]ight|[N|n]ine]))\s([M|m]ario(s)?|[P|p]each(s)?|[Y|y]oshi(s)?|[D|d]onkey(\s)?[K|k]ong(s)?|[L|l]ink(s)?|[F|f]ox((es)?|(s)?)|[S|s]amus((es)?|(s)?)|[W|w]ii(\s)?[F|f]it(\s)?[T|t]rainer(s)?|[V|v]illager(s)?|[P|p]ikachu(s)?|[K|k]irb(y|ies|s)|[L|l]ittle(\s)?[M|m]ac(s)?|[C|c]aptain(\s)?[F|f]alcon(s)?|[P|p]it(s)?|[R|r]osalina(s)?|[B|b]owser(s)|[L|l]ucario(s)?|[T|t]oon(\s)?[L|l]ink(s)?|[S|s]heik(s)?|[K|k]ing\s[D|d]edede(s)?|[D|d]3(s)?|[K|k]3[D|d](s)?|[I|i]ke(s)?|[S|]hulk(s)?|[S|s]onic(s)?|[M|m]ega(\s)?[M|m][a|e]n|[M|m]eta(\s)?([K|k])?night(s)?|[R|r]obin(s)?|[L|l]ucina(s)|[C|c]harizard(s)?|[P|p]ac((\s)?|(-)?)[M|m]an(s)?|[W|w]ario(s)?|[N|n]ess(es)?|[A|a]miibo(es|s)?)/g);
  var ebayRegExp = new RegExp(/[E|e]bay/g);
  // TODO add Craigslist/Kijiji regex
  var scalpComments = [];
  var badComments = [];
  for (var i = 0; i < comments.length; i++) {
    var comment = comments[i];
    var haveMatches = comment.body.match(haveRegExp);
    var boughtMatches = comment.body.match(boughtRegExp);
    var inForMatches = comment.body.match(inForRegExp);
    var gotMatches = comment.body.match(gotRegExp);
    var bunchMatches = comment.body.match(bunchRegExp);
    var myMatches = comment.body.match(myRegExp);
    var soldMatches = comment.body.match(soldRegExp);
    var ownMatches = comment.body.match(ownRegExp);
    var sellMatches = comment.body.match(sellRegExp);
    var preOrderMatches = comment.body.match(preOrderRegExp);
    var scoredMatches = comment.body.match(scoredRegExp);
    var amiiboMatches = comment.body.match(amiiboRegExp);
    var ebayMatches = comment.body.match(ebayRegExp);
    if((haveMatches && comment.score <= 0) ||
      (boughtMatches && comment.score <= 0) ||
      (inForMatches && comment.score <= 0) ||
      (ebayMatches && comment.score <= 0) ||
      (gotMatches && comment.score <= 0) ||
      (amiiboMatches && comment.score <= 0) ||
      (myMatches && comment.score <= 0) ||
      (soldMatches && comment.score <= 0) ||
      (ownMatches && comment.score <= 0) ||
      (sellMatches && comment.score <= 0) ||
      (preOrderMatches && comment.score <= 0) ||
      (scoredMatches && comment.score <= 0) ||
      (bunchMatches && comment.score <= 0)) {
      scalpComments.push(comment);
    }
    if(comment.score <= 0) {
      badComments.push(comment);
    }
  }
  return callback(null, {scalp: scalpComments, bad: badComments});
}

// Check https://api.reddit.com/user/<user>/comments.json?limit=100 for body === [deleted] and check all pages.
function _checkComments(job, username, callback) {
  var commentsWeights = {
    sarcasm: 0.0,
    deleted: 0.0,
    scalpRelated: 0.0
  };
  _getAllComments(username, null, null, function (error, comments) {
    if(error) {
      return callback(error);
    }
    job.progress(20, 100);
    _reduceComments(comments, ['amiibo'], function (error, comments) {
      if(error) {
        return callback(error);
      }
      job.progress(25, 100);
      if(comments.length === 0) {
        return callback(null, {weights: commentsWeights, comments: {bad: [], scalp: []}});
      }
      _detectCommentSarcasm(comments, function (error, commentObj) {
        if(error) {
          return callback(error);
        }
        job.progress(30, 100);
        comments = commentObj.comments;
        commentsWeights.sarcasm = parseFloat((commentObj.count / commentObj.comments.length), 10) * 0.05;
        _getDeletedComments(comments, function (error, deletedComments) {
          if(error) {
            return callback(error);
          }
          job.progress(40, 100);
          // TODO Do something with the deleted comments.
          commentsWeights.deleted = parseFloat((deletedComments.length / comments.length), 10) * 0.05;
          _uneditComments(deletedComments, function (error, uneditedComments) {
            if(error) {
              return callback(error);
            }
            job.progress(45, 100);
            // TODO Do something with the unedited comments.
            // TODO Merge unedited comments and normal comments.
            _analyzeComments(comments, function (error, commentObj) {
              if(error) {
                return callback(error);
              }
              job.progress(60, 100);
              if(commentObj.bad.length === 0) {
                commentsWeights.scalpRelated = 0.0;
              } else {
                commentsWeights.scalpRelated = parseFloat((commentObj.scalp.length / commentObj.bad.length), 10) * 0.85;
              }
              return callback(null, {weights: commentsWeights, comments: commentObj});
            });
          });
        });
      });
    });
  });
}

// Check for the age object in firebase.
// If it doesn't exist, create it and return the data in the callback.
// If it does exist, update all other users in the database with their day values if the last time we ran the query is greater than or equal to 1 day.
// Also update the average.
// Next, check to see if the user is in the data.
// If the user exists, return the data in the callback.
// If the user does not exist, add them and then update the average and last updated time.
// Then return the data in the callback.
function _storeDBAge(username, daysOnReddit, callback) {
  ref.child('age').once('value', function (data) {
    var ageObj = {};
    if(!data.val()) {
      ref.child('age').set({
        average: daysOnReddit,
        count: 1,
        lastUpdated: moment.utc().valueOf()
      }, function (error) {
        if(error) {
          return callback(error);
        }
        return callback(null, {average: daysOnReddit, count: 1, users: ageObj['users']});
      });
    } else {
      data = data.val();
      ref.child('users').child(username).once('value', function (userData) {
        if(userData.val()) {
          return callback(null, data);
        }
        var lastUpdated = data.lastUpdated;
        var now = moment.utc().valueOf();
        var timeOffset = moment.utc(now).diff(lastUpdated, 'days');
        var oldCount = data.count;
        data.count++;
        data.average = (((data.average * oldCount) + (timeOffset * oldCount)) + daysOnReddit) / data.count;
        ref.child('age').set({
          average: data.average,
          count: data.count,
          lastUpdated: now
        }, function (error) {
          if(error) {
            return callback(error);
          }
          return callback(null, data);
        });
      });
    }
  });
}

function _storeUser(data, username, days, callback) {
  var weights = data.weights;
  var comments = data.comments;
  var userRef = ref.child('users').child(username);
  userRef.set({
    weights: weights,
    username: username,
    days: days,
    lastUpdated: moment.utc().valueOf(),
    comments: comments
  }, function (error) {
    if(error) {
      return callback(error);
    }
    return callback(null);
  });
}

function _recomputeDayWeights(callback) {
  ref.child('age').once('value', function (age) {
    age = age.val();
    if(!age) {
      return callback(null);
    }
    ref.child('users').once('value', function (users) {
      users = users.val();
      if(!users) {
        return callback(null);
      }
      async.each(users, function (user, cb) {
        var lastUpdated = user.lastUpdated;
        var now = moment.utc().valueOf();
        var timeOffset = moment.utc(now).diff(lastUpdated, 'days');
        var daysOnReddit = user.days + timeOffset;
        _computeDayWeight(age, daysOnReddit, function (error, dayWeight) {
          if(error) {
            return cb(error);
          }
          ref.child('users').child(user.username).update({
            days: daysOnReddit,
            weights: {
              day: dayWeight
            }
          }, function (error) {
            if(error) {
              return cb(error);
            }
            return cb(null);
          });
        });
      }, function (error) {
        if(error) {
          return callback(error);
        }
        return callback(null);
      });
    });
  });
}

// Total day weight = 100% for new accounts
// Total day weight for oldest account = 0%
// Total day weight weight is 20% for under the average and 80% for above the average.
function _computeDayWeight(age, daysOnReddit, callback) {
  var dayWeight = 0.0;
  var average = age.average;
  if(average - daysOnReddit > 0) {
    dayWeight = (daysOnReddit / average) * 0.80;
  } else {
    dayWeight = (average / daysOnReddit) * 0.20;
  }
  return callback(null, dayWeight);
}

function _calculateTotalWeight(username, daysOnReddit, commentsWeights, callback) {
  var totalWeight = 0.0;
  _storeDBAge(username, daysOnReddit, function (error, age) {
    if(error) {
      return callback(error);
    }
    _computeDayWeight(age, daysOnReddit, function (error, dayWeight) {
      if(error) {
        return callback(error);
      }
      totalWeight = parseFloat((commentsWeights.sarcasm + commentsWeights.deleted + commentsWeights.scalpRelated + (dayWeight * 0.05)), 10);
      return callback(null, {day: dayWeight, total: totalWeight});
    });
  });
}

exports.scan = function () {
  jobs.process('scan', function (job, done) {
    var username = job.data.username;
    _getRedditAge(job, username, function (error, age) {
      if(error) {
        console.log(error);
        return done(new Error(error));
      }
      var redditStartDate = moment.utc(age);
      var now = moment.utc();
      var daysOnReddit = now.diff(redditStartDate, 'days');
      _checkComments(job, username, function (error, commentObj) {
        if(error) {
          console.log(error);
          return done(new Error(error));
        }
        var commentsWeights = commentObj.weights;
        var badComments = commentObj.comments;
        // TODO Add an administrative method to flag people as scalpers based on a post(s).
        _calculateTotalWeight(username, daysOnReddit, commentsWeights, function (error, weights) {
          if(error) {
            console.log(error);
            return done(new Error(error));
          }
          job.progress(70, 100);
          _recomputeDayWeights(function (error) {
            if(error) {
              return done(new Error(error));
            }
            job.progress(90, 100);
            _storeUser({
              weights: {
                total: weights.total,
                day: weights.day,
                comments: commentsWeights
              },
              comments: badComments
            }, username, daysOnReddit, function (error) {
              if(error) {
                console.log(error);
                return done(new Error(error));
              }
              job.progress(100, 100);
              return done();
            });
          });
        });
      });
    });
  });
};