'use strict';

describe('Controller: SearchingCtrl', function () {

  // load the controller's module
  beforeEach(module('redditAmiiboResellCheckerApp'));

  var SearchingCtrl, scope;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($controller, $rootScope) {
    scope = $rootScope.$new();
    SearchingCtrl = $controller('SearchingCtrl', {
      $scope: scope
    });
  }));

  it('should ...', function () {
    expect(1).toEqual(1);
  });
});
