/**
 * Socket.IO client
 * 
 * @author Guillermo Rauch <guillermo@learnboost.com>
 * @license The MIT license.
 * @copyright Copyright (c) 2010 LearnBoost <dev@learnboost.com>
 */

// abstract

(function(){
	
	var frame = '~m~',
	
	stringify = function(message){
		if (Object.prototype.toString.call(message) == '[object Object]'){
			if (!('JSON' in window)){
				if ('console' in window && console.error) console.error('Trying to encode as JSON, but JSON.stringify is missing.');
				return '{ "$error": "Invalid message" }';
			}
			return '~j~' + JSON.stringify(message);
		} else {
			return String(message);
		}
	};
	
	Transport = io.Transport = function(base, options){
    var self = this;
		this.base = base;
		this.options = {
			timeout: 15000 // based on heartbeat interval default
		};
		io.util.merge(this.options, options);
    this._decoder = new io.util.Decoder();
    this._decoder.on('data', function(type, message){
      self._onMessage(type, message);
    });
	};

	Transport.prototype.send = function(){
		throw new Error('Missing send() implementation');
	};

	Transport.prototype.connect = function(){
		throw new Error('Missing connect() implementation');
	};

	Transport.prototype.disconnect = function(){
		throw new Error('Missing disconnect() implementation');
	};
	
	Transport.prototype._onData = function(data){
		this._setTimeout();
		this._decoder.add(data);
	};
	
	Transport.prototype._setTimeout = function(){
		var self = this;
		if (this._timeout) clearTimeout(this._timeout);
		this._timeout = setTimeout(function(){
			self._onTimeout();
		}, this.options.timeout);
	};
	
	Transport.prototype._onTimeout = function(){
		this._onDisconnect();
	};
	
	Transport.prototype._onMessage = function(type, message){
    switch (type){
      case '0':
        this.disconnect();
        break;

      case '1'
        var msg = io.data.decodeMessage(data);
        // handle json decoding
        if ('j' in msg[1]){
          if (!window.JSON || !JSON.parse)
            alert('`JSON.parse` is not available, but Socket.IO is trying to parse'
                + 'JSON. Please include json2.js in your <head>');
          msg[0] = JSON.parse(msg[0]);
        }
        this.base._onMessage(msg[0], msg[1]);
        break;

      case '2':
        this._onHeartbeat(message);
        break;

      case '3':
        this.sessionid = message;
        this._onConnect();
        break;
    }
	},
	
	Transport.prototype._onHeartbeat = function(heartbeat){
		this.send('~h~' + heartbeat); // echo
	};
	
	Transport.prototype._onConnect = function(){
		this.connected = true;
		this.connecting = false;
		this.base._onConnect();
		this._setTimeout();
	};

	Transport.prototype._onDisconnect = function(){
		this.connecting = false;
		this.connected = false;
		this.sessionid = null;
		this.base._onDisconnect();
	};

	Transport.prototype._prepareUrl = function(){
		return (this.base.options.secure ? 'https' : 'http') 
			+ '://' + this.base.host 
			+ ':' + this.base.options.port
			+ '/' + this.base.options.resource
			+ '/' + this.type
			+ (this.sessionid ? ('/' + this.sessionid) : '/');
	};

})();
