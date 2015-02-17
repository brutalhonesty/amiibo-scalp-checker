'use strict';

angular.module('redditAmiiboResellCheckerApp').controller('RanksCtrl', ['$scope', '$mdToast', 'Userservice', '$filter', function ($scope, $mdToast, Userservice, $filter) {
  Userservice.getRankings(100).success(function (userResp) {
    $scope.users = $filter('orderBy')(userResp, 'weights.total', true);
  }).error(function (error) {
    $mdToast.show(
      $mdToast.simple()
      .content(error.message)
      .position('bottom left')
      .hideDelay(3000)
    );
  });
}]);
