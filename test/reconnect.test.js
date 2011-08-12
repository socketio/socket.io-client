
/*!
 * socket.io-node
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (module, io, should) {

  if ('object' == typeof global) {
    return module.exports = { '': function () {} };
  }

  module.exports = {
    'test reconnect without close timeout': function (next) {
      var socket = create()
        , reconnect;

      // set reopen delay to 0, so we it goes it our reconnect fn
      socket.socket.options['reopen delay'] = 0;

      socket.on('connect', function () {
        console.log('connecting')
        if (reconnect && reconnect > 0) {
          var difference = (+ new Date) - reconnect;

          difference.should().be.below(socket.socket.closeTimeout);
          socket.disconnect();
          next();
        } else {
          socket.emit('simulate', {timeout: 2000});
        }
      });

      socket.on('reconnecting', function () {
        console.log('pewpew')
        if (!reconnect) reconnect = +new Date;
      });
    }
  };

})(
    'undefined' == typeof module ? module = {} : module
  , 'undefined' == typeof io ? require('socket.io-client') : io
  , 'undefined' == typeof should ? require('should-browser') : should
);
