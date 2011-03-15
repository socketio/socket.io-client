/**
 * socket.io-node-client
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function(){
  var io = this.io,
  
  /**
   * Opera 8+ < 10.70 ships with EventSource implementation based
   * on the old draft. It's still usable but needs a different detection
   *
   * @type {Boolean}
   * @api private
   */
  legacy = 'addEventStream' in window && typeof window.addEventStream == 'function',
  
  /**
   * In legacy Opera browsers we need create a `event-stream` element to stream the data
   * this element requires an unique id attribute as we want to be able to add multiple
   * Socket.IO client instances in to one page.
   *
   * @type {Integer}
   * @api private
   */
  index = 0,
  
  /**
   * The EventSouce transports creates the a streaming connection
   * with the Socket.IO based using the EventSource API also known
   * as Server-Send Events.
   *
   * @constructor
   * @extends {io.Transport.XHR}
   * @api public
   */
  ES = io.Transport['event-source'] = function(){
    io.Transport.XHR.apply(this, arguments);
    this.index = ++index;
  };
  
  io.util.inherit(ES, io.Transport.XHR);
  
  /**
   * The transport type, you use this to identify which transport was chosen.
   *
   * @type {String}
   * @api public
   */
  ES.prototype.type = 'event-source';
  
  /**
   * Initializes a new `EventSource` connection with the Socket.IO server. We attach
   * all the appropriate listeners to handle the responses from the server.
   *
   * We need to activate this after page load for Webkit based clients or the loading
   * indicators will not disapear.
   *
   * @returns {Transport}
   * @api public
   */
  ES.prototype.connect = function(){
    var self = this;
    io.util.defer(function(){
      var tmp;
      if (legacy){
        // create element event-source does not work for dynamic injection
        tmp = document.createElement('div');
        document.body.appendChild(tmp);
        tmp.innerHTML = '<event-source src="' + self.prepareUrl() + '" id="IOeventSource' + self.index + '">';
        self.eventSource = document.getElementById('IOeventSource' + self.index);
        self.eventSource.onerror = function(e){ self.disconnect(); };
        self.eventSource.addEventListener('io', function(ev){ self.onData(ev.data); }, false);
      } else {
        self.eventSource = new EventSource(self.prepareUrl());
        self.eventSource.onmessage = function(ev){ self.onData(ev.data); };
        self.eventSource.onerror = function(e){ self.disconnect(); };
      }
    });
    return this;
  };
  
  /**
   * Disconnects the established connection.
   *
   * @returns {Transport}
   * @api public
   */
  ES.prototype.disconnect = function(){
    if (this.eventSource) this.eventSource.close();
    io.Transport.XHR.prototype.disconnect.call(this);
    return this;
  };
  
  /**
   * Because there is no way on detect the differences between the old draft
   * and new draft implementation on the server side we need to update the
   * url to give the server a hint on which API format it should expose.
   *
   * @returns {String} The connection URL.
   * @api public
   */
  ES.prototype.prepareUrl = function(){
    return io.Transport.prototype.prepareUrl.call(this) + (legacy ? '/legacy/' : '');
  };
    
  /**
   * Checks if browser supports this transport.
   *
   * @return {Boolean}
   * @api public
   */
  ES.check = function(){
    return ('EventSource' in window && EventSource.prototype) || legacy;
  };
  
  /**
   * Check if cross domain requests are supported, according to the
   * specification: <http://dev.w3.org/html5/eventsource/> nope
   *
   * @returns {Boolean}
   * @api public
   */
  ES.xdomainCheck = function(){
    return false;
  };
})();