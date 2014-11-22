
var old = global.location = { protocol: 'http:', hostname: 'localhost'};
var loc = {};
var url = require('../lib/url');
var expect = require('expect.js');

describe('url', function(){

  it('works with root relative paths', function(){
    loc.hostname = 'woot.com';
    loc.protocol = 'https:';
    var parsed = url('/test', loc);
    expect(parsed.host).to.be('woot.com');
    expect(parsed.protocol).to.be('https');
    expect(parsed.path).to.be('/test');
  });

  it('works with dot path', function(){
    loc.hostname = 'deep.com';
    loc.protocol = 'http:';
    loc.pathname = '/top/sample/page.html';
    var parsed = url('.', loc);
    expect(parsed.host).to.be('deep.com');
    expect(parsed.protocol).to.be('http');
    expect(parsed.path).to.be('/top/sample/');
    var parsed2 = url('./endpoint', loc);
    expect(parsed2.host).to.be('deep.com');
    expect(parsed2.protocol).to.be('http');
    expect(parsed2.path).to.be('/top/sample/endpoint');
  });

  it('works with dot dot path', function(){
    loc.hostname = 'deep.com';
    loc.protocol = 'http:';
    loc.pathname = '/top/sample/page.html';
    var parsed = url('..', loc);
    expect(parsed.host).to.be('deep.com');
    expect(parsed.protocol).to.be('http');
    expect(parsed.path).to.be('/top/');
    var parsed2 = url('../shared/./endpoint', loc);
    expect(parsed2.host).to.be('deep.com');
    expect(parsed2.protocol).to.be('http');
    expect(parsed2.path).to.be('/top/shared/endpoint');
  });

  it('works with no protocol', function(){
    loc.protocol = 'http:';
    var parsed = url('localhost:3000', loc);
    expect(parsed.host).to.be('localhost');
    expect(parsed.port).to.be('3000');
    expect(parsed.protocol).to.be('http');
  });

  it('works with no schema', function(){
    loc.protocol = 'http:';
    var parsed = url('//localhost:3000', loc);
    expect(parsed.host).to.be('localhost');
    expect(parsed.port).to.be('3000');
    expect(parsed.protocol).to.be('http');
  });

  it('forces ports for unique url ids', function(){
    var id1 = url('http://google.com:80/');
    var id2 = url('http://google.com/');
    var id3 = url('https://google.com/');
    expect(id1.id).to.be(id2.id);
    expect(id1.id).to.not.be(id3.id);
    expect(id2.id).to.not.be(id3.id);
  });

  it('identifies the namespace', function(){
    loc.protocol = 'http:';
    loc.hostname = 'woot.com';

    expect(url('/woot').path).to.be('/woot');
    expect(url('http://google.com').path).to.be('/');
    expect(url('http://google.com/').path).to.be('/');
  });

  it('works with Location-like object', function(){
    loc.hostname = 'deep.com';
    loc.protocol = 'https:';
    loc.pathname = '/top/sample/page.html';
    var parsed = url({
      hostname: 'other.com',
      port:8888,
      pathname: '/top/check'}, loc);
    expect(parsed.host).to.be('other.com');
    expect(parsed.protocol).to.be('https');
    expect(parsed.port).to.be(8888);
    expect(parsed.path).to.be('/top/check');
  });

});
