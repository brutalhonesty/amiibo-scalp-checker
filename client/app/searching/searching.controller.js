'use strict';

angular.module('redditAmiiboResellCheckerApp').controller('SearchingCtrl', ['$scope', 'Userservice', '$mdToast', '$window', '$location', '$interval', '$routeParams', function ($scope, Userservice, $mdToast, $window, $location, $interval, $routeParams) {
  $scope.checkStatus = function () {
    var id = $window.localStorage.getItem('id');
    if(!id) {
      $mdToast.show(
        $mdToast.simple()
        .content('ID not found..')
        .position('bottom left')
        .hideDelay(3000)
      );
    } else {
      Userservice.checkScanStatus(id).success(function (statusRes) {
        $scope.buffer = statusRes.progress;
        if($scope.buffer >= 80) {
          $interval.cancel(checker);
          $window.localStorage.clear();
          $location.path('/users/' + $routeParams.username);
        }
      }).error(function (error) {
        $mdToast.show(
          $mdToast.simple()
          .content(error.message)
          .position('bottom left')
          .hideDelay(3000)
        );
        $interval.cancel(checker);
        $location.path('/');
      });
    }
  };
  var checker = $interval(function () {
    $scope.checkStatus();
  }, 2000);
  $scope.$on('$destroy', function() {
    if (angular.isDefined(checker)) {
      $interval.cancel(checker);
      checker = undefined;
    }
  });
}]);
