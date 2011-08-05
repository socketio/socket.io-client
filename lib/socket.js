
/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io) {

  /**
   * Expose constructor.
   */

  exports.Socket = Socket;

  /**
   * Create a new `Socket.IO client` which can establish a persistent
   * connection with a Socket.IO enabled server.
   *
   * @api public
   */

  function Socket (options) {
    this.options = {
        port: 80
      , secure: false
      , document: document
      , resource: 'socket.io'
      , transports: io.transports
      , 'try multiple transports': true
      , 'auto connect': true
      , 'connect timeout': 10000
      , 'reopen delay': 3000
      , 'reconnection delay': 500
      , 'max reconnection delay': Infinity
      , 'reconnect': true
      , 'reconnection factor': 2
      , 'randomize reconnection': false
      , 'max reconnection attempts': 10
      , 'sync disconnect on unload': true
    };

    io.util.merge(this.options, options);

    this.connected = false;
    this.open = false;
    this.connecting = false;
    this.reconnecting = false;
    this.handshaking = false;
    this.namespaces = {};
    this.buffer = [];
    this.doBuffer = false;

    if (this.options['sync disconnect on unload'] &&
        (!this.isXDomain() || io.util.ua.hasCORS)) {
      var self = this;

      io.util.on(window, 'beforeunload', function () {
        self.disconnectSync();
      }, false);
    }

    if (this.options['auto connect']) {
      this.connect();
    }
};

  /**
   * Apply EventEmitter mixin.
   */

  io.util.mixin(Socket, io.EventEmitter);

  /**
   * Returns a namespace listener/emitter for this socket
   *
   * @api public
   */

  Socket.prototype.of = function (name) {
    if (!this.namespaces[name]) {
      this.namespaces[name] = new io.SocketNamespace(this, name);

      if (name !== '') {
        this.namespaces[name].connect();
      }
    }

    return this.namespaces[name];
  };

  /**
   * Emits the given event to the Socket and all namespaces
   *
   * @api private
   */

  Socket.prototype.publish = function () {
    this.emit.apply(this, arguments);

    var nsp;

    for (var i in this.namespaces) {
      if (this.namespaces.hasOwnProperty(i)) {
        nsp = this.of(i);
        nsp.$emit.apply(nsp, arguments);
      }
    }
  };

  /**
   * Performs the handshake
   *
   * @api private
   */

  function empty () { };

  Socket.prototype.handshake = function (fn) {
    var self = this
      , options = this.options;

    function complete (data) {
      self.handshaking = false;

      if (data instanceof Error) {
        self.onError(data.message);
      } else {
        fn.apply(null, data.split(':'));
      }
    };

    var url = [
          'http' + (options.secure ? 's' : '') + ':/'
        , options.host + ':' + options.port
        , this.options.resource
        , io.protocol
        , io.util.query(this.options.query, 't=' + +new Date)
      ].join('/');

    if (this.isXDomain()) {
      var insertAt = document.getElementsByTagName('script')[0]
        , script = document.createElement('SCRIPT');

      script.src = url + '&jsonp=' + io.j.length;
      insertAt.parentNode.insertBefore(script, insertAt);

      io.j.push(function (data) {
        complete(data);
        script.parentNode.removeChild(script);
      });
    } else {
      var xhr = io.util.request();

      xhr.open('GET', url);
      xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) {
          xhr.onreadystatechange = empty;
          self.handshaking = false;

          if (xhr.status == 200) {
            complete(xhr.responseText);
          } else {
            self.onError(xhr.responseText);
          }
        }
      };
      xhr.send(null);
    }

    self.handshaking = true;
  };

  /**
   * Find an available transport based on the options supplied in the constructor.
   *
   * @api private
   */

  Socket.prototype.getTransport = function (override) {
    var transports = override || this.transports, match;

    for (var i = 0, transport; transport = transports[i]; i++) {
      if (io.Transport[transport]
        && io.Transport[transport].check(this)
        && (!this.isXDomain() || io.Transport[transport].xdomainCheck())) {
        return new io.Transport[transport](this, this.sessionid);
      }
    }

    return null;
  };

  /**
   * Connects to the server. It allows 2 options arguments, the first is
   * a optional array of transports it should use to connect to connect. And
   * the last argument can be a optional callback function for when we
   * connected with the server.
   *
   * @returns {io.Socket}
   * @api public
   */

  Socket.prototype.connect = function () {
    if (this.connecting) {
      return this;
    }

    var self = this
      , args = io.util.toArray(arguments)
      , fn = typeof args[args.length - 1] == 'function' ? args.pop() : null
      , transports = args.length ? args[0] : null;

    this.handshake(function (sid, heartbeat, close, allowedTransports) {
      self.sessionid = sid;
      self.closeTimeout = close * 1000;
      self.heartbeatTimeout = heartbeat * 1000;
      self.transports = io.util.intersect(
          allowedTransports.split(',')
        , transports || self.options.transports
      );

      function connect (transports){
        self.transport = self.getTransport(transports);
        if (!self.transport) return self.publish('connect_failed');

        // once the transport is ready
        self.transport.ready(self, function () {
          self.connecting = true;
          self.publish('connecting', self.transport.name);
          self.transport.open();

          if (self.options['connect timeout']) {
            self.connectTimeoutTimer = setTimeout(function () {
              if (!self.connected) {
                self.connecting = false;

                if (self.options['try multiple transports']) {
                  if (!self.remainingTransports) {
                    self.remainingTransports = self.transports.slice(0);
                  }

                  var remaining = self.remainingTransports;

                  while (remaining.length > 0 && remaining.splice(0,1)[0] !=
                         self.transport.name) {}

                    if (remaining.length){
                      connect(remaining);
                    } else {
                      self.publish('connect_failed');
                    }
                }
              }
            }, self.options['connect timeout']);
          }
        });
      }

      connect();

      self.once('connect', function (){
        clearTimeout(self.connectTimeoutTimer);

        fn && typeof fn == 'function' && fn();
      });
    });

    return this;
  };

  /**
   * Sends a message.
   *
   * @param {Object} data packet.
   * @returns {io.Socket}
   * @api public
   */

  Socket.prototype.packet = function (data) {
    if (this.connected && !this.doBuffer) {
      this.transport.packet(data);
    } else {
      this.buffer.push(data);
    }

    return this;
  };

  /**
   * Sets buffer state
   *
   * @api private
   */

  Socket.prototype.setBuffer = function (v) {
    this.doBuffer = v;

    if (!v && this.connected && this.buffer.length) {
      this.transport.payload(this.buffer);
      this.buffer = [];
    }
  };

  /**
   * Disconnect the established connect.
   *
   * @returns {io.Socket}
   * @api public
   */

  Socket.prototype.disconnect = function () {
    if (this.connected) {
      if (this.open) {
        this.of('').packet({ type: 'disconnect' });
      }

      // handle disconnection immediately
      this.onDisconnect('booted');
    }

    return this;
  };

  /**
   * Disconnects the socket with a sync XHR.
   *
   * @api private
   */

  Socket.prototype.disconnectSync = function () {
    // ensure disconnection
    var xhr = io.util.request()
      , uri = this.resource + '/' + io.protocol + '/' + this.sessionid;

    xhr.open('GET', uri, true);

    // handle disconnection immediately
    this.onDisconnect('booted');
  };

  /**
   * Check if we need to use cross domain enabled transports. Cross domain would
   * be a different port or different domain name.
   *
   * @returns {Boolean}
   * @api private
   */

  Socket.prototype.isXDomain = function () {
    var locPort = window.location.port || 80;
    return this.options.host !== document.domain || this.options.port != locPort;
  };

  /**
   * Called upon handshake.
   *
   * @api private
   */

  Socket.prototype.onConnect = function () {
    this.connected = true;
    this.connecting = false;

    if (!this.doBuffer) {
      // make sure to flush the buffer
      this.setBuffer(false);
    }

    this.emit('connect');

    // make sure we also connect the namespaces
    for (var i in this.namespaces) {
      if (this.namespaces[i].hasOwnProperty(i) && i !== '') {
        this.namespaces[i].connect();
      }
    }
  };

  /**
   * Called when the transport opens
   *
   * @api private
   */

  Socket.prototype.onOpen = function () {
    this.open = true;
  };

  /**
   * Called when the transport closes.
   *
   * @api private
   */

  Socket.prototype.onClose = function () {
    this.open = false;
  };

  /**
   * Called when the transport first opens a connection
   *
   * @param text
   */

  Socket.prototype.onPacket = function (packet) {
    this.of(packet.endpoint).onPacket(packet);
  };

  /**
   * Handles an error.
   *
   * @api private
   */

  Socket.prototype.onError = function (err) {
    if (err && err.advice) {
      if (err.advice === 'reconnect' && this.connected) {
        this.disconnect();
        this.reconnect();
      }
    }

    this.publish('error', err && err.reason ? err.reason : err);
  };

  /**
   * Called when the transport disconnects.
   *
   * @api private
   */

  Socket.prototype.onDisconnect = function (reason) {
    var wasConnected = this.connected;

    this.connected = false;
    this.connecting = false;
    this.open = false;

    if (wasConnected) {
      this.transport.close();
      this.transport.clearTimeouts();

      if ('booted' != reason && this.options.reconnect && !this.reconnecting) {
        this.reconnect();

        if (!reason) {
          reason = 'connection lost';
        }
      } 

      this.publish('disconnect', reason);
    }
  };

  /**
   * Called upon reconnection.
   *
   * @api private
   */

  Socket.prototype.reconnect = function () {
    if (this.reconnecting) return;

    var self = this
      , transport = this.transport.name
      , attempt = 0
      , limit = this.options['max reconnection attempts']
      , factor = this.options['reconnection factor']
      , randomize = this.options['randomize reconnection']
      , delay = this.options['reconnection delay']
      , maximum = this.options['max reconnection delay']
      , multiple = this.options['try multiple transports'];

    // we are reconnecting
    this.reconnecting = true;

    /**
     * Small helper function that generates the correct timeout.
     *
     * @author Felix Geisendörfer <node-retry> (MIT licensed)
     * @api private
     */

    function next () {
      var random = randomize ? (Math.random() + 1) : 1
        , timeout = Math.round(random * delay * Math.pow(factor, ++attempt));

      timeout = Math.min(timeout, maximum);
      self.publish('reconnecting', timeout, attempt);

      reconnect.timeout = setTimeout(reconnect, timeout);
    }

    /**
     * It doesn't matter if we win or lose, we still have to clean up the mess we
     * made during the reconnection attempts.
     *
     * @api private
     */

    function reset () {
      if (self.connected) {
        self.publish('reconnect', self.transport.name, attempt);
      } else {
        self.publish('reconnect_failed');
      }

      self.removeListener('connect', reset);
      self.removeListener('connect_failed', next);
      self.removeListener('error', next);

      self.reconnecting = false;

      if (reconnect.timeout) {
        clearTimeout(reconnect.timeout);
        delete reconnect.timeout;
      }

      delete reconnect.multiple;

      // reset the option back to default
      self.options['try multiple transports'] = multiple;
    };

    /**
     * Attempts to do reconnect, if needed.
     *
     * @api private
     */

    function reconnect () {
      if (!self.reconnecting) return reset();

      if (self.connected) {
        return reset();
      }

      // if we are already connecting we should just pause untill that process is
      // finished.
      if (self.connecting || self.handshaking) {
        return reconnect.timeout = setTimeout(reconnect, 1000);
      }

      if (attempt < limit) {
        self.connect([transport]);
      } else {
        if (!multiple || reconnect.multiple) {
          return reset();
        }

        // we need to set this option back to true or it won't cycle over the
        // available transports.
        self.options['try multiple transports'] = multiple;

        reconnect.multiple = true;
        self.connect(io.transports);
      }
    };

    // we need to disable the `try multiple transports` option so we can do the
    // attempts on the last successfull enabled transport.
    this.options['try multiple transports'] = false;

    this.on('connect_failed', next);
    this.on('error', next);
    this.once('connect', reset);

    next();
  };

})(
    'undefined' != typeof io ? io : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
);
