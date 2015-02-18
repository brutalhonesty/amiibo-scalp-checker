'use strict';

angular.module('redditAmiiboResellCheckerApp').controller('UsersCtrl', ['$scope', 'Userservice', '$routeParams', '$mdToast', '$location', function ($scope, Userservice, $routeParams, $mdToast, $location) {
  var username = $routeParams.username;

  var getData = function (userIndex, days) {
    var times = function(n) {
      return Array.apply(null, new Array(n));
    };
    var last = days[days.length - 1];
    var labels = times(Math.floor(last / 100)).map(function (data, index) {
      return (index + 1) * 100;
    });
    var updatedDays = days.map(function (day, index) {
      if(userIndex === index) {
        return 0;
      }
      return day;
    });
    console.log(days);
    console.log(updatedDays);
    var series = [days, updatedDays];
    return {
      labels: labels,
      series: series
    };
  };
  var seq = 0;
  var parentCount = 0;
  var pointCount = 0;
  var delays = 50;
  var durations = 500;

  Userservice.getUser(username).success(function (user) {
    $scope.user = user;
    $scope.commentWeightsData = {
      series: [(user.weights.comments.deleted * 100), (user.weights.comments.sarcasm * 100), (user.weights.comments.scalpRelated * 100), 100 - ((user.weights.comments.deleted + user.weights.comments.sarcasm + user.weights.comments.scalpRelated) * 100)]
    };
    $scope.dayWeightsData = {
      series: [(user.weights.day * 100), (100 - (user.weights.day * 100))]
    };
    $scope.totalWeightsData = {
      series: [(user.weights.total * 100), (100 - (user.weights.total * 100))]
    };
    console.log($scope.dayWeightsData);
    Userservice.getDays().success(function (daysResp) {
      $scope.days = daysResp.days;
      $scope.average = daysResp.average;
      $scope.userIndex = daysResp.days.indexOf(user.days);
      $scope.daysData = getData($scope.userIndex, daysResp.days);
    }).error(function (error) {
      $mdToast.show(
        $mdToast.simple()
        .content(error.message)
        .position('bottom left')
        .hideDelay(3000)
      );
      $location.path('/');
    });
  }).error(function (error) {
    $mdToast.show(
      $mdToast.simple()
      .content(error.message)
      .position('bottom left')
      .hideDelay(3000)
    );
    $location.path('/');
  });

  $scope.weightsOptions = {
    labelInterpolationFnc: function(value) {
      return Math.round(value) + '%';
    }
  };

  $scope.lineOptions = {
    showLine: false,
    axisY: {
      labelInterpolationFnc: function(value, index) {
        return index % 2 === 0 ? value + ' days' : null;
      }
    },
    axisX: {
      showLabel: false
    }
  };

  $scope.lineEvents = {
    created: function createHandler(obj) {
      console.log(obj);
      seq = 0;
    },
    draw: function drawHandler(data) {
      seq++;
      if(data.type === 'line') {
        // If the drawn element is a line we do a simple opacity fade in. This could also be achieved using CSS3 animations.
        data.element.animate({
          opacity: {
            // The delay when we like to start the animation
            begin: seq * delays + 1000,
            // Duration of the animation
            dur: durations,
            // The value where the animation should start
            from: 0,
            // The value where it should end
            to: 1
          }
        });
      } else if(data.type === 'label' && data.axis === 'x') {
        data.element.animate({
          y: {
            begin: seq * delays,
            dur: durations,
            from: data.y + 100,
            to: data.y,
            // We can specify an easing function from Chartist.Svg.Easing
            easing: 'easeOutQuart'
          }
        });
      } else if(data.type === 'label' && data.axis === 'y') {
        data.element.animate({
          x: {
            begin: seq * delays,
            dur: durations,
            from: data.x - 100,
            to: data.x,
            easing: 'easeOutQuart'
          }
        });
      } else if(data.type === 'point') {
        pointCount++;
        if(pointCount - 1 === $scope.days.length) {
          parentCount++;
          pointCount = 0;
        }
        data.element.animate({
          x1: {
            begin: seq * delays,
            dur: durations,
            from: data.x - 10,
            to: data.x,
            easing: 'easeOutQuart'
          },
          x2: {
            begin: seq * delays,
            dur: durations,
            from: data.x - 10,
            to: data.x,
            easing: 'easeOutQuart'
          },
          opacity: {
            begin: seq * delays,
            dur: durations,
            from: 0,
            to: (data.index === $scope.userIndex && parentCount > 0) ? 0 : 1,
            easing: 'easeOutQuart'
          }
        });
      } else if(data.type === 'grid') {
        // Using data.axis we get x or y which we can use to construct our animation definition objects
        var pos1Animation = {
          begin: seq * delays,
          dur: durations,
          from: data[data.axis + '1'] - 30,
          to: data[data.axis + '1'],
          easing: 'easeOutQuart'
        };

        var pos2Animation = {
          begin: seq * delays,
          dur: durations,
          from: data[data.axis + '2'] - 100,
          to: data[data.axis + '2'],
          easing: 'easeOutQuart'
        };

        var animations = {};
        animations[data.axis + '1'] = pos1Animation;
        animations[data.axis + '2'] = pos2Animation;
        animations['opacity'] = {
          begin: seq * delays,
          dur: durations,
          from: 0,
          to: 1,
          easing: 'easeOutQuart'
        };

        data.element.animate(animations);
      }
    }
  };
}]);
