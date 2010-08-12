/**
 * Socket.IO client
 * 
 * @author Guillermo Rauch <guillermo@learnboost.com>
 * @license The MIT license.
 * @copyright Copyright (c) 2010 LearnBoost <dev@learnboost.com>
 */

(function(){
	
	var Socket = io.Socket = function(host, options){
		this.host = host || document.domain;
		var port = document.location.port || 80;
		this.options = {
			secure: false,
			document: document,
			heartbeatInterval: 4000,
			resource: 'socket.io',
			transports: [
				{ name: 'websocket', port: port }, 
				{ name: 'flashsocket', port: port }, 
				{ name: 'htmlfile', port: port }, 
				{ name: 'xhr-multipart', port: port }, 
				{ name: 'xhr-polling', port: port }
			],
			transportOptions: {},
			rememberTransport: false
		};
		for (var i in options) 
		    if (this.options.hasOwnProperty(i))
		        this.options[i] = options[i];
		this.connected = false;
		this.connecting = false;
		this._events = {};
		this.triedTransports = [];
		
		if (this.options.rememberTransport) {
			match = this.options.document.cookie.match('(?:^|;)\\s*socket\.io=([^;]*)');
			if (match) { 
				this.rememberedTransport = JSON.parse(decodeURIComponent(match[1]));
			}
		} 
	};
	
	Socket.prototype.isGoodTransport = function(transport) {
		return (io.Transport[transport.name] 
			&& io.Transport[transport.name].check() 
			&& (!this._isXDomain() || io.Transport[transport.name].xdomainCheck()));
	};
		
	Socket.prototype.createTransport = function(transport) {
		return new io.Transport[transport.name](this, transport.port, this.options.transportOptions[transport.name] || {});
	};
	
	Socket.prototype.getNextAvailableTransport = function() {
		var transports = this.options.transports;
		var nextTransport = null;
		
		if (this.rememberedTransport && !this.triedTransports[this.rememberedTransport.name+this.rememberedTransport.port]) {
			nextTransport = this.rememberedTransport;
		} else {
			for (var i = 0, transport; transport = transports[i]; i++){
				var transportKey = transport.name+transport.port;
				if (!this.triedTransports[transportKey]) {
					if (this.isGoodTransport(transport)) {
						nextTransport = transport;
						break;
					} 
				} 
			}
		}
		return nextTransport;
	};
	
	Socket.prototype.connect = function() {
		var thisTransport = this.getNextAvailableTransport();
		
		if (thisTransport == null) {
			if (!this.transport && 'console' in window) console.error('No transport available');
			this.fire('disconnect');
		} else if (!this.connected && !this.connecting) {
			try {
				var self = this;
				
				setTimeout(function() { 
					if (!self.connected) {
						self.connecting = false;
						if (self.triedTransports.length < self.options.transports.length)
							self.connect();
					} else {
						if (self.options.rememberTransport) self.options.document.cookie = 'socket.io=' + encodeURIComponent(JSON.stringify(thisTransport));
					}
				}, 2000);
				
				this.connecting = true;
				this.transport = this.createTransport(thisTransport);
				this.triedTransports[thisTransport.name+thisTransport.port] = 1;
				this.transport.connect();
			} catch(e) {
				this.connecting = false;
				if ('console' in window) console.error("Error while connecting: "+e);
			}
		} 
		return this;
	};
	
	Socket.prototype.send = function(data){
		if (!this.transport || !this.transport.connected) return this._queue(data);
		this.transport.send(data);
		return this;
	};
	
	Socket.prototype.disconnect = function(){
		this.transport.disconnect();
		return this;
	};
	
	Socket.prototype.on = function(name, fn){
		if (!(name in this._events)) this._events[name] = [];
		this._events[name].push(fn);
		return this;
	};
	
	Socket.prototype.fire = function(name, args){
		if (name in this._events){
		    var i, ii; 
		    for (i = 0, ii = this._events[name].length; i < ii; i++) {
				if (args == undefined) args = [];
				this._events[name][i].apply(this, args);
			}
		}
		return this;
	};
	
	Socket.prototype.removeEvent = function(name, fn){
		if (name in this._events){
			for (var a = 0, l = this._events[name].length; a < l; a++)
				if (this._events[name][a] == fn) this._events[name].splice(a, 1);		
		}
		return this;
	};
	
	Socket.prototype.removeEvents = function(){
		this._events = {};
		return this;
	};
	
	Socket.prototype._queue = function(message){
		if (!('_queueStack' in this)) this._queueStack = [];
		this._queueStack.push(message);
		return this;
	};
	
	Socket.prototype._doQueue = function(){
		if (!('_queueStack' in this) || !this._queueStack.length) return this;
		this.transport.send(this._queueStack);
		this._queueStack = [];
		return this;
	};
	
	Socket.prototype._isXDomain = function(){
		return this.host !== document.domain;
	};
	
	Socket.prototype._onConnect = function(){
		this.connected = true;
		this.connecting = false;
		this._doQueue();
		if (this.options.rememberTransport) this.options.document.cookie = 'socket.io=' + encodeURIComponent(this.transport.type);
		this.fire('connect');
	};
	
	Socket.prototype._onMessage = function(data){
		this.fire('message', [data]);
	};
	
	Socket.prototype._onDisconnect = function(){
		this.fire('disconnect');
	};
	
	Socket.prototype.addListener = Socket.prototype.addEvent = Socket.prototype.addEventListener = Socket.prototype.on;
	
})();
