'use strict';

describe('Controller: RanksCtrl', function () {

  // load the controller's module
  beforeEach(module('redditAmiiboResellCheckerApp'));

  var RanksCtrl, scope;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($controller, $rootScope) {
    scope = $rootScope.$new();
    RanksCtrl = $controller('RanksCtrl', {
      $scope: scope
    });
  }));

  it('should ...', function () {
    expect(1).toEqual(1);
  });
});
