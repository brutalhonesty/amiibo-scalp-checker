'use strict';

angular.module('redditAmiiboResellCheckerApp', [
  'ngCookies',
  'ngResource',
  'ngSanitize',
  'ngRoute',
  'ngMaterial',
  'percentage',
  'angular-chartist'
]).config(function ($routeProvider, $locationProvider) {
  $routeProvider
    .otherwise({
      redirectTo: '/'
    });

  $locationProvider.html5Mode(true);
});