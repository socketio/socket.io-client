var Emitter = require('component-emitter');
var bind = require('component-bind');

function extend (child) {
  function Proxy () {}
  Proxy.prototype = this.prototype;
  child.prototype = new Proxy();

  return child;
}

/**
 * Module exports
 */

module.exports = Listener;

/**
 * Allows listening (and stopping to listening) to other objects
 * and emitting events.
 *
 * @api public
 */
function Listener () {
  this.subs = [];
}

extend.call(Emitter, Listener);

/**
 * Listen to the event emitted on the given object.
 *
 * The method binds the callback's this to the given
 * object.

 * @param {object} object The object to listen to.
 * @param {string} name The name of the event to listen to.
 * @param {function} callback A function that handles the event.
 */
Listener.prototype.listenTo = function (object, name, callback) {
  var cb = bind(this, callback);
  this.subs.push({ obj: object, name: name, cb: cb });
  object.on(name, cb);
};

/**
 * Remove the given event this object is listening to
 * from the gievn object.
 *
 * If no event or object are provided all of this objects
 * events will be removed.
 *
 * @param {object} object The object to listen to.
 * @param {string} name The name of the event to listen to.
 */
Listener.prototype.stopListening = function (object, name) {
  var subsLength = this.subs.length;
  var keep = [];
  for (var i = 0; i < subsLength; i++) {
    var sub = this.subs.shift();
    var subObj = sub.obj;
    var subName = sub.name;
    if ((!object || object === subObj) && (!name || name === subName)) {
      subObj.removeListener(subName, sub.cb);
    } else {
      keep.push(sub);
    }
  }

  this.subs = keep;
};

/**
* Allows other objects to inherit from this object.
*/
Listener.extend = extend;
