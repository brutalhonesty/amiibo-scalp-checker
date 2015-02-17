'use strict';

angular.module('redditAmiiboResellCheckerApp')
  .config(function ($routeProvider) {
    $routeProvider
      .when('/searching/:username', {
        templateUrl: 'app/searching/searching.html',
        controller: 'SearchingCtrl'
      });
  });
