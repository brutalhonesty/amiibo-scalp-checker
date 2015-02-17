'use strict';

angular.module('redditAmiiboResellCheckerApp').service('Userservice', ['$http', function ($http) {
  return {
    getUsers: function () {
      return $http({
        method: 'GET',
        url: '/api/users/'
      });
    },
    getRankings: function (limit) {
      return $http({
        method: 'GET',
        url: '/api/users/ranked?limit=' + limit,
      });
    },
    getUser: function (username) {
      return $http({
        method: 'GET',
        url: '/api/users/reddit/' + username
      });
    },
    requestScan: function (username) {
      return $http({
        method: 'POST',
        url: '/api/users/scan',
        data: {
          username: username
        }
      });
    },
    checkScanStatus: function (id) {
      return $http({
        method: 'GET',
        url: '/api/users/scan/status?id=' + id
      });
    }
  };
}]);
