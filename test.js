'use strict';

var JsonexParser = require('./jsonex.js');

var handlers = {
	'Math.pow': function (ctx, num, power)
	{
		return Math.pow(num, power);
	},
	test: function (ctx, test)
	{
		return 'this be test: ' + test;
	}
};

var input = '{// This be a comment "a":"b",\n\'b\':10,\t\tc:10.2, d:[-10,], /*\nThis\nbe\nmultiline\ncomment\n*/ e:{ hello:\'world\' }, f:[\'a\', [\'b\',], {a:0}, 0,], /*This be comment*/ twoInFourth: Math.pow(2, 4), test: test(\'hey\'), }';

console.log('Processing:');
console.log(input);

console.log('- - -');

console.log('Result:');

var ctx = {};
console.log(new JsonexParser(handlers, ctx).parse(input));