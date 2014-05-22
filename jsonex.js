'use strict';

// Globals
var string, handlers, curCharI, context;

//-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_

//Special
var parserBroken, getCurChar, trySkipComment, nextChar, expect, expected, expectedChar, unexpected;

//Checkers
var isCurCharFinal, isCharSpace, isCurCharSpace, isCharQuote, isCurCharQuote, isCharSpecial, isCurCharSpecial;

//Readers
var readNum, readString, readStringValue, readListTo, readKey, readArray, readObject, parseHandler, readValue;

//-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_

//Special

//This version of a parser is propably broken...
parserBroken = function (msg)
{
	throw new Error('Jsonex parser is broken: ' + msg + '!');
};

//Returns the current character, checking if it is valid
getCurChar = function ()
{
	if (!string[curCharI])
		parserBroken ('current character is invalid (' + string[curCharI] + ')');
	return string[curCharI];
};

//Tries to skip a comment
trySkipComment = function ()
{
	if (getCurChar() != '/') return;
	nextChar(false, true);

	if (getCurChar() == '*')
	{
		nextChar(false, true);

		readString('*');
		nextChar(false, true);

		expect('/');
		nextChar(false, true);
	}
	else if (getCurChar() == '/')
	{
		readString('\n');
		nextChar(false, true);
	}
};

//Moves current character pointer onde char, checking if it is in bounds of a string
nextChar = function (doNotSkipSpace, skippingComment)
{
	curCharI++;
	if (string.length <= curCharI || curCharI < 0)
		parserBroken ('current character index out of string bounds (' + curCharI + ')');

	if (skippingComment !== true) trySkipComment();
	if (doNotSkipSpace !== true && isCurCharSpace()) nextChar();
};

//Throws an error, if current character is not as expected
expect = function (char)
{
	if (getCurChar() != char) expectedChar(char);
};

//Call to send a message, when something is not as expected
expected = function (msg)
{
	throw new Error('Expected ' + msg + ' at ' + curCharI + ', but found: ' + getCurChar());
};

//Call to send a message, when current character is not as expected
expectedChar = function (char)
{
	expected('\'' + char + '\'');
};

//Call to tell user, when current character is not as expected
unexpected = function ()
{
	throw new Error('Unexpected character at ' + curCharI + ' \'' + getCurChar() + '\'');
};

//-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_

isCurCharFinal = function ()
{
	return curCharI == string.length - 1;
};

isCharSpace = function (char)
{
	return char == '\t' || char == '\n' || char == ' ';
};

isCurCharSpace = function ()
{
	return isCharSpace(getCurChar());
};

isCharQuote = function (char)
{
	if (char == '\'') return '\'';
	if (char == '"') return '"';
	return null;
};

isCurCharQuote = function ()
{
	return isCharQuote(getCurChar());
};

isCharSpecial = function (char)
{
	return isCharQuote(char) || char == '{' || char == '}' || char == '[' || char == ']' || char == '(' || char == ')';
};

isCurCharSpecial = function ()
{
	return isCharSpecial(getCurChar());
};

//-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_

readNum = function ()
{
	var res = 0, fraction = 0, parsingFraction = false;

	var curInt;
	while (true)
	{
		if (getCurChar() == '.')
		{
			parsingFraction = true;
			nextChar(true);
		}
		else if (!isNaN((curInt = parseInt(getCurChar()))))
		{
			if (parsingFraction)
			{
				fraction *= 10;
				fraction += curInt;

				nextChar(true);
			}
			else
			{
				res *= 10;
				res += curInt;

				nextChar(true);
			}
		}
		else break;
	}

	return res + fraction / Math.pow(10, fraction.toString().length);
};

readString = function (endChar, quoted)
{
	var res = '', readingToEnd = false;

	if (!endChar) readingToEnd = true;

	while (true)
	{
		var curChar = getCurChar();
		if (curChar == endChar) break;
		if (quoted === false && isCharSpecial(curChar)) unexpected();

		res += curChar;

		if (isCurCharFinal())
		{
			if (readingToEnd) break;
			expectedChar(endChar);
		}
		nextChar(true);
	}

	return res;
};

readStringValue = function ()
{
	var quoteType = '';
	if (!(quoteType = isCurCharQuote())) expected('a quote character');
	nextChar();

	var res = readString(quoteType, true);

	if (!isCurCharQuote(quoteType)) expected(quoteType);
	nextChar();

	return res;
};

readListTo = function (ctx, arr, endChar)
{
	if (!endChar) endChar = ']';
	while (true)
	{
		if (getCurChar() == endChar) break;
		arr.push(readValue(ctx));

		if (getCurChar() != ',') break;
		nextChar();
	}
};

readKey = function ()
{
	var enQuoted = false, quoteType = '';
	if ((quoteType = isCurCharQuote()))
	{
		enQuoted = true;
		nextChar();
	}
	
	if (!enQuoted && isCurCharSpecial()) unexpected();

	var res = '';
	if (enQuoted)
	{
		res = readString(quoteType, true);
		nextChar();

		expect(':');
		nextChar();
	}
	else
	{
		res = readString(':');
		nextChar();
	}

	return res;
};

readArray = function (ctx)
{
	expect('[');
	nextChar();
	var res = [];

	if (getCurChar() == ']')
	{
		nextChar();
		return res;
	}

	readListTo(ctx, res);

	expect(']');
	nextChar();

	return res;
};

readObject = function (ctx)
{
	expect('{');
	nextChar();
	var res = {};

	if (getCurChar() == '}')
	{
		if (!isCurCharFinal()) nextChar();
		return res;
	}

	while (true)
	{
		if (getCurChar() == '}') break;
		res[readKey()] = readValue(ctx);

		if (getCurChar() != ',') break;
		nextChar();
	}

	expect('}');
	if (!isCurCharFinal()) nextChar();

	return res;
};

parseHandler = function (ctx)
{
	var handlerName = readString('(');
	expect('(');
	nextChar();

	if (Object.keys(handlers).indexOf(handlerName) == -1) throw new Error('No such handler (' + handlerName + ') at ' + curCharI + '!');	
	var args = [];
	args.push(ctx);
	readListTo(ctx, args, ')');

	expect(')');
	nextChar();

	return handlers[handlerName].apply(undefined, args);
};

readValue = function (ctx)
{
	if (isCurCharQuote()) return readStringValue();
	if (!isNaN(parseInt(getCurChar())) || getCurChar() == '.') return readNum();
	if (getCurChar() == '[') return readArray(ctx);
	if (getCurChar() == '{') return readObject(ctx);
	if (!isCurCharSpecial() && !isCurCharSpace()) return parseHandler(ctx);
	unexpected();
};

//-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_

var JsonexParser = function (hndlrs, ctx)
{
	if (!hndlrs) hndlrs = {};
	handlers = hndlrs;

	context = ctx;
};

JsonexParser.prototype.parse = function (str)
{
	if (!str) return str;
	string = str;
	curCharI = 0;

	return readObject(context);
};

module.exports = JsonexParser;