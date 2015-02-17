'use strict';

angular.module('redditAmiiboResellCheckerApp')
  .config(function ($routeProvider) {
    $routeProvider
      .when('/users/:username', {
        templateUrl: 'app/users/users.html',
        controller: 'UsersCtrl'
      });
  });
