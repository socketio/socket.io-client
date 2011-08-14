
/**
 * Module dependencies.
 */

var express = require('express')
  , stylus = require('stylus')
  , sio = require('socket.io')
  , path = require('path')
  , fs = require('fs');

/**
 * App.
 */

var app = express.createServer();

/**
 * Initial port to listen to.
 */

var port = 3000;

/**
 * Transport to test with.
 */

var args = process.argv.slice(2)
  , transport = args.length ? args : ['xhr-polling'];

/**
 * Test reconnect
 */

var reconnectTests = +process.env.RECONNECT == 1;

/**
 * Tests that should run
 */

var tests;
if (reconnectTests) {
  tests = ['reconnect.test.js'];
} else {
  tests = [
      'io.test.js'
    , 'parser.test.js'
    , 'util.test.js'
    , 'events.test.js'
    , 'socket.test.js'
    , 'reconnect.test.js'
  ];
}

/**
 * A map of tests to socket.io ports we're listening on.
 */

var testsPorts = {};

/**
 * App configuration.
 */

app.configure(function () {
  app.use(stylus.middleware({ src: __dirname + '/public' }))
  app.use(express.static(__dirname + '/public'));
  app.set('views', __dirname);
  app.set('view engine', 'jade');
});

/**
 * App routes.
 */

app.get('/', function (req, res) {
  res.render('index', {
      layout: false
    , testsPorts: testsPorts
    , tests: JSON.stringify(tests)
  });
});

/**
 * Sends test files.
 */

app.get('/test/:file', function (req, res) {
  res.sendfile(path.normalize(__dirname + '/../../test/' + req.params.file));
});

/**
 * App listen.
 */

app.listen(port++, function () {
  var addr = app.address();
  console.error('   listening on http://' + addr.address + ':' + addr.port);
});

/**
 * Override handler to simplify development
 */

function handler (req, res) {
  fs.readFile(__dirname + '/../../dist/socket.io.js', 'utf8', function (err, b) {
    if (err) {
      res.writeHead(404);
      res.end('Error');
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/javascript' });
    res.end(b);
  });
};

/**
 * Socket.IO default server (to serve client)
 */

var io = sio.listen(app);

io.configure(function () {
  io.set('browser client handler', handler);
  io.set('transports',
      transport
  );
});

/**
 * Scopes servers for a given test suite.
 */

var currentSuite;

function suite (name, fn) {
  currentSuite = testsPorts[name] = {};
  fn();
};

/**
 * Creates a socket io server
 */

function server (name, fn) {
  currentSuite[name] = port;

  var io = sio.listen(port);
  io.configure(function () {
    io.set('transports', transport);
  });

  fn(io);
  port++;
};

/**
 * Kills the current running server to test reconnect support on the client
 */

function reconnect (io, timeout, fn) {
  var address = io.server.address();

  io.server.close();

  // restart the a server again on the same port
  setTimeout(function () {
    var io = sio.listen(address.port);
    io.configure(function () {
      io.set('transports', transport);
    });

    fn(io);
  }, timeout);
};

/**
 * Socket.IO servers.
 */
if (!reconnectTests)
suite('socket.test.js', function () {

  server('test connecting the socket and disconnecting', function (io) {
    io.sockets.on('connection', function () {});
  });

  server('test receiving messages', function (io) {
    io.sockets.on('connection', function (socket) {
      var messages = 0;
      var interval = setInterval(function () {
        socket.send(++messages);

        if (messages == 3) {
          clearInterval(interval);
          setTimeout(function () {
            socket.disconnect();
          }, 500);
        }
      }, 50);
    });
  });

  server('test sending messages', function (io) {
    io.sockets.on('connection', function (socket) {
      socket.on('message', function (msg) {
        socket.send(msg);
      });
    });
  });

  server('test acks sent from client', function (io) {
    io.sockets.on('connection', function (socket) {
      socket.send('tobi', function () {
        socket.send('tobi 2');
      });
    });
  });

  server('test acks sent from server', function (io) {
    io.sockets.on('connection', function (socket) {});
  });

  server('test connecting to namespaces', function (io) {
    io.of('/woot').on('connection', function (socket) {
      socket.send('connected to woot');
    });

    io.of('/chat').on('connection', function (socket) {
      socket.send('connected to chat');
    });
  });

  server('test disconnecting from namespaces', function (io) {
    io.of('/a').on('connection', function (socket) {});
    io.of('/b').on('connection', function (socket) {});
  });

  server('test authorizing for namespaces', function (io) {
    io.of('/a')
      .authorization(function (data, fn) {
        fn(null, false);
      })
      .on('connection', function (socket) {});
  });

  server('test sending json from server', function (io) {
    io.sockets.on('connection', function (socket) {
      io.sockets.json.send(3141592);
    });
  });

  server('test sending json from client', function (io) {
    io.sockets.on('connection', function (socket) {
      socket.on('message', function (arr) {
        if (Array.isArray(arr) && arr.length == 3) {
          socket.send('echo');
        }
      });
    });
  });

  server('test emitting an event from server', function (io) {
    io.sockets.on('connection', function (socket) {
      socket.emit('woot');
    });
  });

  server('test emitting multiple events at once to the server', function (io) {
    io.sockets.on('connection', function (socket) {
      var messages = [];

      socket.on('print', function (msg) {
        if (messages.indexOf(msg) >= 0) {
          console.error('duplicate message');
        }

        messages.push(msg);
        if (messages.length == 2) {
          socket.emit('done');
        }
      });
    });
  });

  server('test emitting an event to server', function (io) {
    io.sockets.on('connection', function (socket) {
      socket.on('woot', function () {
        socket.emit('echo');
      });
    });
  });

  server('test emitting an event from server and sending back data', function (io) {
    io.sockets.on('connection', function (socket) {
      socket.emit('woot', 1, function (a) {
        if (a === 'test') {
          socket.emit('done');
        }
      });
    });
  });

  server('test emitting an event to server and sending back data', function (io) {
    io.sockets.on('connection', function (socket) {
      socket.on('tobi', function (a, b, fn) {
        if (a === 1 && b === 2) {
          fn({ hello: 'world' });
        }
      });
    });
  });

  server('test encoding a payload', function (io) {
    io.of('/woot').on('connection', function (socket) {
      var count = 0;

      socket.on('message', function (a) {
        if (a == 'ñ') {
          if (++count == 4) {
            socket.emit('done');
          }
        }
      });
    });
  });

  server('test sending query strings to the server', function (io) {
    io.sockets.on('connection', function (socket) {
      socket.json.send(socket.handshake);
    })
  });
});

if (reconnectTests)
suite('reconnect.test.js', function () {
  server('test exponential backoff', function (io) {
    function setup (io) {
      io.set('close timeout', .25);

      io.sockets.on('connection', function (socket) {
        socket.emit('alive');

        socket.on('simulate', function (data) {
          reconnect(io, data.timeout || 2000, setup);
        });
      });
    }

    setup(io);
  });

  server('test connect event after reconnect', function (io) {
    function setup (io) {
      io.set('close timeout', .25);

      io.sockets.on('connection', function (socket) {
        socket.emit('alive');

        socket.on('simulate', function (data) {
          reconnect(io, data.timeout || 2000, setup);
        });
      });

      io.of('/namespace').on('connection', function (socket) {
        socket.emit('alive');
      });
    }

    setup(io);
  });

  server('test reopen instead of reconnect', function (io) {
    function setup (io) {
      io.sockets.on('connection', function (socket) {
        var pong = 0;
        socket.emit('alive');

        socket.on('ping', function () {
          ++pong;
          socket.send(pong);
        });
      });
    }

    setup(io);
  });

});
