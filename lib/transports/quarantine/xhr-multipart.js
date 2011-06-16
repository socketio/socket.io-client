
/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io) {

  /**
   * Expose constructor.
   */

  exports['xhr-multipart'] = XHRMultipart;

  /**
   * The XHR-Multipart transport uses the a multipart XHR connection to
   * create a "persistent" connection with the server.
   *
   * @constructor
   * @api public
   */

  function XHRMultipart () {
    io.Transport.XHR.apply(this, arguments);
    // The transport type, you use this to identify which transport was chosen.
    this.name = 'xhr-multipart';
  };

  /**
   * Inherits from XHR transport.
   */

  io.util.inherit(XHRMultipart, io.Transport.XHR);

  /**
   * Starts a XHR request to wait for incoming messages.
   *
   * @api private
   */

  XHRMultipart.prototype.get = function() {
    var self = this;

    this.xhr = this.request('GET', true);
    this.xhr.onreadystatechange = function() {
      if (this.readyState === 4) {
        self.onData(this.responseText);
      }
    };

    this.xhr.send(null);
  };

  /**
   * Checks if browser supports this transport.
   *
   * @return {Boolean}
   * @api public
   */

  XHRMultipart.check = function() {
    return 'XMLHttpRequest' in window && 'prototype' in XMLHttpRequest
      && 'multipart' in XMLHttpRequest.prototype;
  };

  /**
   * Add the transport to your public io.transports array.
   *
   * @api private
   */

  io.transports.push('xhr-multipart');

})(
    'undefined' != typeof io ? io.Transport : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
);
