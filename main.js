"use strict"

var c, compiler, dev, http, input, port, reqHandler, server;

http = require('http');

compiler = require('./compiler/compiler');
let rt = require('./runtime/runtime');

dev = false;

port = 3000;

process.argv.slice(2).forEach(function(val, index, array) {
  if (val === '--dev') {
    return dev = true;
  }
});

if (dev) {
  reqHandler = function(req, res) {
    return res.end('Hello');
  };
  server = http.createServer(reqHandler);
  server.listen(port, function(e) {
    if (e) {
      return console.log(e);
    }
  });
}

console.log("Starting compilation");

console.log("\n\n\n");

input = `
Object subclass: Test
	instance: 'test';

Test::Init: x
	| test2 |
	test := x;
  test2 := [ | y |
    y := 1;
		(y = 1) isTrue: [
			^ 'Test successful' toUppercase |>
				reverse;
		];
  ];
  z := [|x y| ^ x - y + 1;];
  p := [^ 5;];
  p fork;
  ^ z: (2 1);

Object subclass: Test2;

Test2::Init
  test := {1 2 3 4};
`;


let thisRT = new rt.RT();
thisRT.run(input);

// console.log(JSON.stringify(c.ast));
