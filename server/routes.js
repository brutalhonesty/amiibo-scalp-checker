/**
 * Main application routes
 */

'use strict';

var errors = require('./components/errors');

module.exports = function(app) {

  app.use('/api/users', require('./api/users'));
  app.use('/api/users/scan', require('./api/users/scan'));
  app.use('/api/users/scan/status', require('./api/users/scan/status'));
  app.use('/api/users/reddit', require('./api/users/reddit'));
  app.use('/api/users/ranked', require('./api/users/ranked'));
  app.use('/api/users/days', require('./api/users/days'));

  // All undefined asset or api routes should return a 404
  app.route('/:url(api|auth|components|app|bower_components|assets)/*')
   .get(errors[404]);

  // All other routes should redirect to the index.html
  app.route('/*')
    .get(function(req, res) {
      res.sendfile(app.get('appPath') + '/index.html');
    });
};
