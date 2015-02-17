'use strict';

angular.module('redditAmiiboResellCheckerApp', [
  'ngCookies',
  'ngResource',
  'ngSanitize',
  'ngRoute',
  'ngMaterial',
  'percentage'
]).config(function ($routeProvider, $locationProvider) {
  $routeProvider
    .otherwise({
      redirectTo: '/'
    });

  $locationProvider.html5Mode(true);
});