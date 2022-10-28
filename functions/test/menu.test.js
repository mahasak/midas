var assert = require('assert');

const {getMenu} = require('../lib/menu')

describe('Menu', function () {
  describe('#getMenu()', function () {
    it('should executed properly', function () {
      const menu = getMenu();
      assert.equal(menu.T01.price, '1')
      
    });
  });
});