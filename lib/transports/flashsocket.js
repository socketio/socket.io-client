
/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io) {

  /**
   * Expose constructor.
   */

  exports['flashsocket'] = FlashSocket;

  /**
   * The FlashSocket transport. This is a API wrapper for the HTML5 WebSocket specification.
   * It uses a .swf file to communicate with the server. If you want to serve the .swf file
   * from a other server than where the Socket.IO script is coming from you need to use the
   * insecure version of the .swf. More information about this can be found on the github page.
   *
   * @constructor
   * @extends {io.Transport.websocket}
   * @api public
   */

  function FlashSocket () {
    io.Transport.websocket.apply(this, arguments);
    // The transport type, you use this to identify which transport was chosen.
    this.name = 'flashsocket';
  };

  /**
   * Inherits from XHR transport.
   */

  io.util.inherit(FlashSocket, io.Transport.websocket);
  
  /**
   * Disconnect the established `FlashSocket` connection. This is done by adding a new
   * task to the FlashSocket. The rest will be handled off by the `WebSocket` transport.
   *
   * @returns {Transport}
   * @api public
   */

  FlashSocket.prototype.connect = function(){
    var self = this, args = arguments;
    WebSocket.__addTask(function(){
      io.Transport.websocket.prototype.connect.apply(self, args);
    });
    return this;
  };
  
  /**
   * Sends a message to the Socket.IO server. This is done by adding a new
   * task to the FlashSocket. The rest will be handled off by the `WebSocket` transport.
   *
   * @returns {Transport}
   * @api public
   */

  FlashSocket.prototype.send = function(){
    var self = this, args = arguments;
    WebSocket.__addTask(function(){
      io.Transport.websocket.prototype.send.apply(self, args);
    });
    return this;
  };
  
  /**
   * Check if the FlashSocket transport is supported as it requires that the Adobe Flash Player
   * plugin version `10.0.0` or greater is installed. And also check if the polyfill is correctly
   * loaded.
   *
   * @returns {Boolean}
   * @api public
   */

  FlashSocket.check = function(){
    if (typeof WebSocket == 'undefined' || !('__addTask' in WebSocket) || !swfobject) return false;
    return swfobject.hasFlashPlayerVersion("10.0.0");
  };
  
  /**
   * Check if the FlashSocket transport can be used as cross domain / cross origin transport.
   * Because we can't see which type (secure or insecure) of .swf is used we will just return true.
   *
   * @returns {Boolean}
   * @api public
   */

  FlashSocket.xdomainCheck = function(){
    return true;
  };
  
  /**
   * Add the transport to your public io.transports array.
   *
   * @api private
   */

  io.transports.push('flashsocket');

})(
    'undefined' != typeof io ? io.Transport : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
);
