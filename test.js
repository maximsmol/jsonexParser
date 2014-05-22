'use strict';

var JsonexParser = require('./jsonex.js');

var handlers = {
	'Math.pow': function (ctx, num, power)
	{
		return Math.pow(num, power);
	}
};

var input = '{ A: Math.pow(10, 10) }';

console.log('Processing:');
console.log(input);

console.log('- - -');

console.log('Result:');

var ctx = {};
console.log(new JsonexParser(handlers, ctx).parse(input));