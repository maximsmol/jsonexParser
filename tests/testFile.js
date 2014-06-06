'use strict';

var fs = require('fs'), JsonexParser = require('../jsonex2.js');

var handlers = {
	callable: function(ctx, input1, input2)
	{
		return 'Hey! ' + input1 + ' + ' + input2;
	},
	'*': function(ctx, replacing, input)
	{
		return 'Im the default handler, your input was ' + input + ' repalcing: ' + replacing;
	}
};

var fileIndex = process.argv[2];
if (fileIndex == null) fileIndex = 0;

var files = ['./dictNKeys.jsonex', './arrayNValues.jsonex', './stringEscapes.jsonex', './comments.jsonex', './all.jsonex'];
var file  = files[fileIndex];

console.log('PARSING FILE:', file);
console.log('TEST INDEX:',fileIndex);

fs.readFile(file, 'utf8', function (err,data) {
	if (err) return console.log(err);

	var input = data;

	console.log('PARSING:');
	console.log(input);

	console.log('- - JSONEX - -');

	var ctx = {};
	var parsed = new JsonexParser(handlers, ctx).parse(input);
	console.log(parsed);
});