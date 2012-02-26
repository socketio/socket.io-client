
/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io, global) {

  /**
   * Expose constructor.
   */

  exports.Socket = Socket;

  /**
   * Create a new `Socket.IO client` which can establish a persistent
   * connection with a Socket.IO enabled server.
   *
   * @constructor
   * @param {Object} options
   * @api public
   */

  function Socket (options) {
    this.options = {
        port: 80
      , secure: false
      , document: 'document' in global ? document : false
      , resource: 'socket.io'
      , transports: io.transports
      , 'try multiple transports': true
      , 'auto connect': true
      , 'connect timeout': 10000
      , 'reconnection delay': 500
      , 'max reconnection delay': Infinity
      , 'reconnect': true
      , 'reconnection factor': 2
      , 'randomize reconnection': true
      , 'max reconnection attempts': 10
      , 'sync disconnect on unload': true
      , 'polling timeout': 30
      , 'flash policy port': 10843
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

      io.util.on(global, 'beforeunload', function () {
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
   * Returns a namespace listener/emitter for this socket.
   *
   * @param {String} name namespace
   * @returns {io.SocketNameSpace}
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
   * Emits the given event to the Socket and all namespaces.
   *
   * @returns {io.Socket}
   * @api private
   */

  Socket.prototype.publish = function () {
    var args = io.util.toArray(arguments);
    this.emit.apply(this, args);

    return this.each(function (namespace) {
      namespace.$emit.apply(namespace, args);
    });
  };

  /**
   * Loops over all namespaces. Tries to mimic the arguments of a regular
   * array.forEach loop.
   *
   * @param {Function} callback callback
   * @param {Object} that Object to use as `this` when executing callback
   * @returns {io.Socket}
   * @api private
   */

  Socket.prototype.each = function (callback, that) {
    var namespace, i;

    for(i in this.namespaces) {
      if (this.namespaces.hasOwnProperty(i)) {
        namespace = this.of(i);
        callback.call(that || this, namespace, i, this.namespaces);
      }
    }

    return this;
  };

  /**
   * Performs the handshake.
   *
   * @param {Function} fn callback
   * @api private
   */

  function empty () { };

  Socket.prototype.handshake = function (fn) {
    var self = this
      , options = this.options
      , xdomain = this.isXDomain()
      , xhr = io.util.request(xdomain)
      , url = [
            'http' + (options.secure ? 's' : '') + ':/'
          , options.host + ':' + options.port
          , this.options.resource
          , io.protocol
          , io.util.query(this.options.query, 't=' + +new Date)
        ].join('/');

    /**
     * Simple callback function
     *
     * @param {Error} err
     * @param {String} data
     * @api private
     */

    function complete (err, data) {
      self.handshaking = false;

      if (err) {
        self.onError(err.message);
      } else {
        fn.apply(null, data.split(':'));
      }
    };

    if (xhr) {
      xhr.open('GET', url, true);

      if (xdomain) {
        xhr.withCredentials = true;
      }

      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          xhr.onreadystatechange = empty;
          self.handshaking = false;

          if (xhr.status == 200) {
            complete(null, xhr.responseText);
          } else {
            complete(new Error(xhr.responseText || 'unable to connect'), null);
          }
        }
      };

      xhr.send(null);
    } else {
      io.util.jsonp(url, this.options['polling timeout'], complete);
    }

    self.handshaking = true;
  };

  /**
   * Find an available transport based on the options supplied in the constructor.
   *
   * @param {Array} [override] Optional array of transport to check
   * @returns {Mixed} a available transport or null
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
    if (this.connecting) return this;

    // map the arguments
    var self = this
      , args = io.util.toArray(arguments)
      , callback = typeof args[args.length - 1] === 'function' ? args.pop() : null
      , transports = args.length ? args[0] : this.options.transports;

    if (this.transport) {
      /**
       * Re-enable again when we manage to have proper re-occurring reconnects
       * for reopening.

      if (this.transport.reopen) {
        this.once('open', function () {
          self.packet({type:'noop'});
        });

        this.doConnect([this.transport.name]);
        return this;
      }*/

      this.transport.clearCloseTimeout();
    }

    this.handshake(function (sid, heartbeat, close, allowedTransports) {
      self.sessionid = sid;
      self.closeTimeout = close * 1000;
      self.heartbeatTimeout = heartbeat * 1000;
      self.transports = io.util.intersect(allowedTransports.split(','), transports);

      self.doConnect();

      self.once('connect', function () {
        clearTimeout(self.timeout);

        callback && callback();
      });
    });

    return this;
  };

  /**
   * Connect to the handshaken server.
   *
   * @param {Array} transports Optional array of transports to connect with
   * @returns {io.Socket}
   * @api private
   */

  Socket.prototype.doConnect = function (transports) {
    this.transport = this.getTransport(transports);
    if (!this.transport) return this.publish('connect_failed');

    var self = this
    , timeout = this.options['connect timeout'];

    this.transport.ready(this, function () {
      self.connecting = true;
      self.publish('connecting', self.transport.name);
      self.transport.open();

      if (timeout) {
        self.timeout = setTimeout(function () {
          self.onFailed.call(self);
        }, timeout);
      }
    });

    return this;
  };

  /**
   * When a transport fails to connect within or after the connect timeout we
   * want to try to connect with a different transport method.
   *
   * @returns {io.Socket}
   * @api private
   */

  Socket.prototype.onFailed = function () {
    if (!this.connected && this.connecting) {
      // reset and clean up
      clearTimeout(this.timeout);
      this.connecting = false;
      this.transport.close();
      this.transport.clearTimeouts();

      if (this.options['try multiple transports']) {
        if (!this.remainingTransports) {
          this.remainingTransports = this.transports.slice(0);
        }

        var remaining = this.remainingTransports;
        while (remaining.length > 0 && remaining.splice(0,1)[0] !==
               this.transport.name){}

          if (remaining.length) {
            this.doConnect(remaining);
          } else {
            this.publish('connect_failed');
          }
      }
    }

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
   * Sets buffer state.
   *
   * @param {Boolean} v
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
    if (this.connected || this.transport.open) {
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
    // if node
    return false;
    // end node

    var port = global.location.port ||
      ('https:' == global.location.protocol ? 443 : 80);

    return this.options.host !== global.location.hostname
      || this.options.port != port;
  };

  /**
   * Called upon handshake.
   *
   * @api private
   */

  Socket.prototype.onConnect = function () {
    if (!this.connected) {
      this.connected = true;
      this.connecting = false;

      if (!this.doBuffer) {
        // make sure to flush the buffer
        this.setBuffer(false);
      }

      this.emit('connect');
    }

    this.each(function (namespace, name) {
      if ('' !== name) {
        namespace.connect();
      }
    });
  };

  /**
   * Called when the transport opens.
   *
   * @api private
   */

  Socket.prototype.onOpen = function () {
    this.emit('open');
    this.open = true;
  };

  /**
   * Called when the transport closes.
   *
   * @param {Boolean} intended did the user initiate the closing
   * @api private
   */

  Socket.prototype.onClose = function (intended) {
    this.open = false;

    if (!intended && this.options.reconnect && !this.reconnecting) {
      this.onDisconnect('connection lost');
      this.reconnect();
    }
  };

  /**
   * Called when the transport first opens a connection.
   *
   * @param {Object} packet Decoded socket.io packet
   * @api private
   */

  Socket.prototype.onPacket = function (packet) {
    this.of(packet.endpoint).onPacket(packet);
  };

  /**
   * Handles an error.
   *
   * @param {Object} err error packet
   * @api private
   */

  Socket.prototype.onError = function (err) {
    if (err && err.advice) {
      if (err.advice === 'reconnect' && (this.connected || this.transport.open)) {
        this.transport.clearTimeouts();
        this.onDisconnect('client not handshaken');

        this.reconnect();
      }
    }

    this.publish('error', err && err.reason ? err.reason : err);
  };

  /**
   * Called when the transport disconnects.
   *
   * @param {String} reason reason of the disconnect
   * @api private
   */

  Socket.prototype.onDisconnect = function (reason) {
    var wasConnected = this.connected;

    this.connected = false;
    this.connecting = false;
    this.open = false;

    if (wasConnected || this.transport.open) {
      this.transport.close();
      this.transport.clearCloseTimeout();

      if ('booted' != reason && this.options.reconnect && !this.reconnecting) {
        this.reconnect();

        if (!reason) {
          reason = 'connection lost';
        }
      }

      // no need to do a publish here, have the namespace handle their
      // own events, and closing.
      this.each(function (namespace) {
        namespace.disconnect(reason);
      });

      this.emit('disconnect', reason);
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
     * @author Tim Kos <node-retry> (MIT licensed)
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

      // if we are already connecting we should just pause until that process is
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
    // attempts on the last successful enabled transport.
    this.options['try multiple transports'] = false;

    this.on('connect_failed', next);
    this.on('error', next);
    this.once('connect', reset);

    next();
  };

})(
    'undefined' != typeof io ? io : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
  , this
);
