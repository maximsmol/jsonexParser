'use strict';

var fs = require('fs'), JsonexParser = require('./jsonex.js');

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

var input = '';
fs.readFile('./test.jsonex', 'utf8', function (err,data) {
	if (err) return console.log(err);

	input = data;

	console.log('PARSING:\n',input);
	console.log('- - -');

	var ctx = {};
	console.log(new JsonexParser(handlers, ctx).parse(input));
});