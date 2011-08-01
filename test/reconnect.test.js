
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

  'test default reconnect': function (next) {
      var socket = create()
        , events = 0
        , regular = 0
        , reconnect = 0
        , reconnecting = 0
        , disconnect = 0;

      socket
      .on('connect', function () {
        regular++;
      })
      .on('alive', function (msg) {
        if (++events === 2) {
          reconnect.should().eql(1);
          disconnect.should().eql(1);
          regular.should().eql(2);
          socket.disconnect();
          next();
        }
      })
      .on('reconnect', function (transport, attempts) {
        reconnect++;
      })
      .on('reconnecting', function (delay, attempt) {
        attempt.should().eql(1);
        delay.should()

        reconnecting++;
      })
      .on('disconnect', function (reason) {
        if (!disconnect) {
          reason.should().eql('connection lost');
        }

        disconnect++;
      })
      .on('reconnect_failed', function () {
        throw new Error('reconnect failed');
      })
      .on('error', function (msg) {
        throw new Error(msg || 'Received an error');
      });
    },

    'test reconnect attempts different transports before it fails': function (next) {
      var socket = create(null, {'max reconnection attempts': 1 })
        , events = 0
        , recording = false
        , transport;

      socket
        .on('alive', function (msg) {
        if (++events === 2) {
          socket.disconnect();
          recording.should().be_true;
          next();
        }
      })
      .on('reconnecting', function (delay, attempt) {
        if (attempt == 1) {
          recording = true;
        } 
      })
      .on('connecting', function (name) {
        console.log('called', arguments)
        if (recording) {
          if (!transport) {
            transport = name;
            return;
          }

          name.should().not.eql(transport);
          transport = name;
        }
      })
      .on('reconnect_failed', function () {
        throw new Error('reconnect failed');
      })
      .on('error', function (msg) {
        throw new Error(msg || 'Received an error');
      });
    }
  };

})(
    'undefined' == typeof module ? module = {} : module
  , 'undefined' == typeof io ? require('socket.io-client') : io
  , 'undefined' == typeof should ? require('should-browser') : should
);
