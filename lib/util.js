/**
 * Socket.IO client
 * 
 * @author Guillermo Rauch <guillermo@learnboost.com>
 * @license The MIT license.
 * @copyright Copyright (c) 2010 LearnBoost <dev@learnboost.com>
 */

(function(){
	var io = this.io;

	var _pageLoaded = false;

	io.util = {

		ios: false,

		load: function(fn){
			if (/loaded|complete/.test(document.readyState) || _pageLoaded) return fn();
			if ('attachEvent' in window){
				window.attachEvent('onload', fn);
			} else {
				window.addEventListener('load', fn, false);
			}
		},

		inherit: function(ctor, superCtor){
			// no support for `instanceof` for now
			for (var i in superCtor.prototype){
				ctor.prototype[i] = superCtor.prototype[i];
			}
		},

		indexOf: function(arr, item, from){
			for (var l = arr.length, i = (from < 0) ? Math.max(0, l + from) : from || 0; i < l; i++){
				if (arr[i] === item) return i;
			}
			return -1;
		},

		isArray: function(obj){
			return Object.prototype.toString.call(obj) === '[object Array]';
		},
		
    merge: function(target, additional){
      for (var i in additional)
        if (additional.hasOwnProperty(i))
          target[i] = additional[i];
    },

    isString: function(obj){
      return obj && typeof obj.substring != 'undefined';
    }

	};

  io.util.logger = {
    error: function (message){}
  };

  if(typeof Titanium == 'undefined'){
	  io.util.ios = /iphone|ipad/i.test(navigator.userAgent);
	  io.util.android = /android/i.test(navigator.userAgent);
  	io.util.opera = /opera/i.test(navigator.userAgent);

    io.util.jsonSupport = 'JSON' in window;

  } else {
    io.util.load = function (fn){
      return fn();
    };

    io.util.ios = /iphone/i.test(Titanium.Platform.osname);
    io.util.android = /android/i.test(Titanium.Platform.osname);
    io.util.opera = false;

    io.util.jsonSupport = true;
  }

  if('console' in window && console.error){
    io.util.logger.error = function (message){
      return console.error(message);
    };
  }

	io.util.load(function(){
		_pageLoaded = true;
	});

})();
