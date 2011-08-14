
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
    'test exponential backoff': function (next) {
      var socket = create()
        , reconnect = [];

      socket.on('connect', function () {
        if (reconnect && reconnect.length) {
          socket.disconnect();

          var i = reconnect.length
            , last = reconnect.shift()
            , total = i;

          while (i--) {
            (reconnect[i] === (last * 2)).should.be_true;
            last = reconnect[i];
          }

          total.should().eql(3);
          next();
        } else {
          socket.emit('simulate', { timeout: 6000 });
        }
      });

      socket.on('reconnecting', function (timeout, attempt) {
        reconnect.push(timeout);
      });
    },

    'test connect event after reconnect': function (next) {
      var socket = create()
        , namespace = socket.of('/namespace')
        , events = 0
        , connect = 0
        , reconnecting = 0;

      function alive () {
        if (++events == 4) {
          socket.disconnect();
          reconnecting.should().be.above(2);
          next();
        }
      }

      function connect () {
        if (++connect == 2) {
          socket.emit('simulate', { timeout: 5000 });
        }
      }

      function reconnecting () {
        ++reconnecting;
      }

      socket.on('alive', alive);
      namespace.on('alive', alive);

      socket.on('connect', connect);
      namespace.on('connect', connect);

      socket.on('reconnecting', reconnecting);
      namespace.on('reconnecting', reconnecting);
    },*/

    'test reopen instead of reconnect': function (next) {
      var socket = create()
        , connectionid
        , events = 0
        , reconnecting = 0
        , connecting = 0
        , connect = 0
        , message = 0
        , packets = [];

      socket.socket.wortel = true;

      socket.on('alive', function () { ++events });
      socket.on('reconnecting', function () { ++reconnecting });

      socket.on('connect', function () {
        if (!connectionid) connectionid = socket.socket.sessionid;
        socket.emit('ping');
      });

      socket.on('connecting', function () {
        ++connecting;
      });

      socket.on('message', function (msg) {
        if (++message == 1) {
          socket.socket.transport.onClose();
        }

        packets.push(+msg);
        if (packets.length == 2) {
          socket.disconnect();
          next();
        }
      });
    }
  };
})(
    'undefined' == typeof module ? module = {} : module
  , 'undefined' == typeof io ? require('socket.io-client') : io
  , 'undefined' == typeof should ? require('should-browser') : should
);
