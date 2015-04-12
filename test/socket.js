var expect = require('expect.js');
var io = require('../');

describe('socket', function(){
  this.timeout(70000);

  it('should have an accessible socket id equal to the engine.io socket id', function(done) {
    var socket = io({ forceNew: true });
    socket.on('connect', function(){
      expect(socket.id).to.be.ok();
      expect(socket.id).to.eql(socket.io.engine.id);
      socket.disconnect();
      done();
    });
  });

  it('clears socket.id upon disconnection', function(done){
    var socket = io({ forceNew: true });
    socket.on('connect', function(){
      socket.on('disconnect', function(){
        expect(socket.id).to.not.be.ok();
        done();
      });

      socket.disconnect();
    });
  });

  it('doesn\'t fire a connect_error if we force disconnect in opening state', function(done){
    var socket = io({ forceNew: true, timeout: 100 });
    socket.disconnect();
    socket.on('connect_error', function(){
      throw new Error('Unexpected');
    });
    setTimeout(function(){
      done();
    }, 300);
  });

  it('should ping and pong with latency', function(done){
    var socket = io({ forceNew: true });
    socket.on('connect', function(){
      var pinged;
      socket.once('ping', function(){
        pinged = true;
      });
      socket.once('pong', function(ms){
        expect(pinged).to.be(true);
        expect(ms).to.be.a('number');
        expect(ms).to.be.greaterThan(0);
        socket.disconnect();
        done();
      });
    });
  });

  it('should change socket.id upon reconnection', function(done){
    var socket = io({ forceNew: true });
    socket.on('connect', function(){
      var id = socket.id;

      socket.on('reconnect_attempt', function(){
        expect(socket.id).to.not.be.ok();
      });

      socket.on('reconnect', function() {
        expect(socket.id).to.not.eql(id);
        socket.disconnect();
        done();
      });

      socket.io.engine.close();
    });
  });

  it('should enable compression by default', function(done){
    var socket = io({ forceNew: true });
    socket.on('connect', function(){
      socket.io.engine.once('packetCreate', function(packet){
        expect(packet.options.compress).to.be(true);
        socket.disconnect();
        done();
      });
      socket.emit('hi');
    });
  });

  it('should disable compression', function(done){
    var socket = io({ forceNew: true });
    socket.on('connect', function(){
      socket.io.engine.once('packetCreate', function(packet){
        expect(packet.options.compress).to.be(false);
        socket.disconnect();
        done();
      });
      socket.compress(false).emit('hi');
    });
  });

  it('should not emit volatile event after regular event (polling)', function(done) {
    var socket = io({ forceNew: true, transports: ['polling'] });
    socket.on('connect', function(){
      var counter = 0;
      socket.on('hi', function(){
        counter++;
      });
      socket.emit('hi');
      socket.volatile.emit('hi');

      setTimeout(function() {
        expect(counter).to.be(1);
        done();
      }, 1000);
    });
  });

  it('should emit volatile event (polling)', function(done) {
    var socket = io({ forceNew: true, transports: ['polling'] });
    socket.on('connect', function(){
      var counter = 0;
      socket.on('hi', function(){
        counter++;
      });
      socket.volatile.emit('hi');

      setTimeout(function() {
        expect(counter).to.be(1);
        done();
      }, 1000);
    });
  });

  it('should emit only one consecutive volatile event (polling)', function(done) {
    var socket = io({ forceNew: true, transports: ['polling'] });
    socket.on('connect', function(){
      var counter = 0;
      socket.on('hi', function(){
        counter++;
      });
      socket.volatile.emit('hi');
      socket.volatile.emit('hi');

      setTimeout(function() {
        expect(counter).to.be(1);
        done();
      }, 1000);
    });
  });

  it('should emit regular events after trying a failed volatile event (polling)', function(done) {
    var socket = io({ forceNew: true, transports: ['polling'] });
    socket.on('connect', function(){
      var counter = 0;
      socket.on('hi', function(){
        counter++;
      });
      socket.emit('hi');
      socket.volatile.emit('hi');
      socket.emit('hi');

      setTimeout(function() {
        expect(counter).to.be(2);
        done();
      }, 1000);
    });
  });

  if (global.WebSocket) {
    it('should not emit volatile event after regular event (ws)', function(done) {
      var socket = io({ forceNew: true, transports: ['websocket'] });
      socket.on('connect', function(){
        var counter = 0;
        socket.on('hi', function(){
          counter++;
        });
        socket.emit('hi');
        socket.volatile.emit('hi');

        setTimeout(function() {
          expect(counter).to.be(1);
          done();
        }, 1000);
      });
    });

    it('should emit volatile event (ws)', function(done) {
      var socket = io({ forceNew: true, transports: ['websocket'] });
      socket.on('connect', function(){
        var counter = 0;
        socket.on('hi', function(){
          counter++;
        });
        socket.volatile.emit('hi');

        setTimeout(function() {
          expect(counter).to.be(1);
          done();
        }, 1000);
      });
    });

    it('should emit only one consecutive volatile event (ws)', function(done) {
      var socket = io({ forceNew: true, transports: ['websocket'] });
      socket.on('connect', function(){
        var counter = 0;
        socket.on('hi', function(){
          counter++;
        });
        socket.volatile.emit('hi');
        socket.volatile.emit('hi');

        setTimeout(function() {
          expect(counter).to.be(1);
          done();
        }, 1000);
      });
    });

    it('should emit regular events after trying a failed volatile event (ws)', function(done) {
      var socket = io({ forceNew: true, transports: ['websocket'] });
      socket.on('connect', function(){
        var counter = 0;
        socket.on('hi', function(){
          counter++;
        });
        socket.emit('hi');
        socket.volatile.emit('hi');
        socket.emit('hi');

        setTimeout(function() {
          expect(counter).to.be(2);
          done();
        }, 1000);
      });
    });
  }

  it('should set volatile and compress flags', function(done){
    var socket = io({ forceNew: true });
    socket.on('connect', function(){
      socket.io.engine.once('packetCreate', function(packet){
        expect(packet.options.volatile).to.be(true);
        expect(packet.options.compress).to.be(false);
        done();
      });
      socket.volatile.compress(false).emit('hi');
    });
  });
});
