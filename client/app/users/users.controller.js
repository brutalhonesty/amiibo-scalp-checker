'use strict';

angular.module('redditAmiiboResellCheckerApp').controller('UsersCtrl', ['$scope', 'Userservice', '$routeParams', '$mdToast', '$location', function ($scope, Userservice, $routeParams, $mdToast, $location) {
  var username = $routeParams.username;
  Userservice.getUser(username).success(function (user) {
    $scope.user = user;
  }).error(function (error) {
    $mdToast.show(
      $mdToast.simple()
      .content(error.message)
      .position('bottom left')
      .hideDelay(3000)
    );
    $location.path('/');
  });
}]);
