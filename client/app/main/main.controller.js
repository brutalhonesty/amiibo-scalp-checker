'use strict';

angular.module('redditAmiiboResellCheckerApp').controller('MainCtrl', ['$scope', 'Userservice', '$mdToast', '$location', '$window', function ($scope, Userservice, $mdToast, $location, $window) {
  $scope.selectedItem = null;
  $scope.searchText = null;
  Userservice.getUsers().success(function (users) {
    $scope.users = users.map(function (user) {
      return {
        display: user,
        value: user
      };
    });
  }).error(function (error) {
    $mdToast.show(
      $mdToast.simple()
      .content(error.message)
      .position('bottom left')
      .hideDelay(3000)
    );
  });
  $scope.createFilterFor = function(query) {
    return function filterFn(user) {
      return (user.value.indexOf(query) === 0);
    };
  };
  $scope.querySearch = function (query) {
    var results = query ? $scope.users.filter($scope.createFilterFor(query)) : [];
    return results;
  };
  $scope.searchUser = function (selectedItem, query) {
    if(selectedItem) {
      $location.path('/users/' + selectedItem.value);
    } else {
      Userservice.requestScan(query).success(function (scanRes) {
        $window.localStorage.setItem('id', scanRes.id);
        $mdToast.show(
          $mdToast.simple()
          .content(scanRes.message)
          .position('bottom left')
          .hideDelay(3000)
        );
        $location.path('/searching/' + query);
      }).error(function () {
        $mdToast.show(
          $mdToast.simple()
          .content(error.message)
          .position('bottom left')
          .hideDelay(3000)
        );
      });
    }
  };
}]);
