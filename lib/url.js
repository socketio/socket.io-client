
/**
 * Module dependencies.
 */

var debug = require('debug')('socket.io-client:url');

/**
 * Module exports.
 */

module.exports = url;


/**
 * based on parseuri 1.2.2 'strict' mode
 * (c) Steven Levithan <stevenlevithan.com>
 * MIT License
 * see: http://blog.stevenlevithan.com/archives/parseuri
 * Included inline to eliminate unused code and reduce library size.
 */
function parseuri(str) {
  var
    strict = /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
    key = ["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],
    m   = strict.exec(str),
    uri = {},
    i   = 14;
  while (i--) uri[key[i]] = m[i] || "";
  return uri;
};

/**
 * socket.io URL parser.  Resolves URLs relative to location.
 *
 * @param {String} url
 * @param {Object} An object meant to mimic window.location.
 *                 Defaults to window.location.
 * @api public
 */

function url(uri, loc){
  var obj = uri;

  // default to window.location
  var loc = loc || global.location || {};
  if (null == uri) uri = loc.protocol + '//' + loc.hostname;

  // relative path support
  if ('string' == typeof uri) {
    if ('.' == uri.charAt(0)) {
      var dirs = [];
      var qpart = uri.split(/(?=\?)/); // Protect any query parts.
      uri = loc.pathname || '/';
      uri = uri.substr(0, uri.lastIndexOf('/') + 1) + qpart.shift();
      uri.replace(/\/\.\.?$/, '$&/').replace(/\/?[^\/]*/g, function (p) {
        if (p == '/..') {
          dirs.pop();
        } else if (p != '/.') {
          dirs.push(p);
        }
      });
      uri = (dirs.join('') || '/') + qpart.join('');
    }
    if (!/^\/|^\w+:\/\//.test(uri)) {
      // Historically 'foo.com' is a hostname for us, not a relative path.
      debug('protocol-less url %s', uri);
      uri = '//' + uri;
    }
    // parse
    debug('parse %s', uri);
    obj = parseuri(uri);
  }

  var host = obj.hostname || obj.host || loc.hostname;
  var protocol = (obj.protocol || loc.protocol || 'https').replace(/:$/, '');
  var port = obj.port || (/^(?:http|ws)s$/.test(protocol) ? 443 : 80);
  return {
    protocol: protocol,
    host: host,
    port: port,
    path: obj.path || obj.pathname || '/',
    id: obj.protocol + '://' + host + ':' + port
  };
}
