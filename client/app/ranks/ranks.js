'use strict';

angular.module('redditAmiiboResellCheckerApp')
  .config(function ($routeProvider) {
    $routeProvider
      .when('/ranks', {
        templateUrl: 'app/ranks/ranks.html',
        controller: 'RanksCtrl'
      });
  });
