var assert = require('assert');

const Pipeline = require('../lib/pipeline')

describe('Pipeline', function () {
  describe('#execution()', function () {
    it('should executed properly', async function () {
      const pipeline = Pipeline();
      pipeline.push(
        async (ctx, next) => {
          ctx.value = ctx.value + 21
          await next()
        },
        (ctx, _next) => {
          ctx.value = ctx.value * 2
        }
      )
      const ctx = { value: 0 }
      await pipeline.execute(ctx);
      assert.equal(ctx.value, 42)
      
    });
  });
});