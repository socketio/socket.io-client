var expect = require('expect.js');
var Manager = require('../lib/manager');

describe('manager', function () {
  it('should allow setting 0 for reconnectionAttempts', function () {
    var man = new Manager('/test', {
      reconnectionAttempts: 0
    });
    expect(man.reconnectionAttempts()).to.equal(0);
  });

  it('defaults to Infinity', function () {
    var man = new Manager('/test');

    expect(man.reconnectionAttempts()).to.equal(Infinity);
  });
});
