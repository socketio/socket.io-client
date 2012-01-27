(function (exports, io, global) {

  /**
   * Expose constructor.
   */

  exports['sse'] = SSE;

  /**
   * The sse transport uses the HTML5 Server-Sent Events API to create a
   * persistent connection with the server.
   *
   * @constructor
   * @api public
   */

  function SSE () {
    io.Transport.XHR.apply(this, arguments);
  };

  /**
   * Inherits from XHR transport.
   */

  io.util.inherit(SSE, io.Transport.XHR);

  /**
   * Merge the properties from XHR transport
   */

  io.util.merge(SSE, io.Transport.XHR);

  /**
   * Transport name
   *
   * @api public
   */

  SSE.prototype.name = 'sse';

  /**
   * Initializes a new `SSE` connection with the Socket.IO server. We attach
   * all the appropriate listeners to handle the responses from the server.
   *
   * @returns {Transport}
   * @api public
   */

  SSE.prototype.open = function () {
    var self = this
      , query = io.util.query(this.socket.options.query)

    if (SSE.xdomainCheck() && this.socket.isXDomain())
      this.ssesource = new EventSource(this.prepareUrl() + query, { withCredentials: true });
    else
      this.ssesource = new EventSource(this.prepareUrl() + query);
    this.ssesource.onopen = function () {
      self.onOpen();
      self.socket.setBuffer(false);
    };
    this.ssesource.onmessage = function (ev) {
      self.onData(io.JSON.parse(ev.data));
    };
    this.ssesource.onerror = function (e) {
      if (self.ssesource.readyState === EventSource.CONNECTING && self.socket.connected)
        e.advice = 'reconnect';
      else
        self.onClose();
      self.socket.onError(e);
    };

    return this;
  };

  /**
   * Disconnect the established `SSE` connection.
   *
   * @returns {Transport}
   * @api public
   */

  SSE.prototype.close = function () {
    this.ssesource.close();
    return this;
  };

  /**
   * Handle the errors that `SSE` might be giving when we
   * are attempting to connect or send messages.
   *
   * @param {Error} e The error.
   * @api private
   */

  SSE.prototype.onError = function (e) {
    this.socket.onError(e);
  };

  /**
   * Checks if the browser has support for native `SSE`.
   *
   * @return {Boolean}
   * @api public
   */

  SSE.check = function () {
    // if node
    return false;
    // end node
    return 'EventSource' in global;
  };

  /**
   * Check if the `SSE` transport support cross domain communications.
   *
   * @returns {Boolean}
   * @api public
   */

  SSE.xdomainCheck = function () {
    return EventSource.prototype.withCredentials !== undefined;
  };

  /**
   * Add the transport to your public io.transports array.
   *
   * @api private
   */

  io.transports.push('sse');

})(
    'undefined' != typeof io ? io.Transport : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
  , this
);
