'use strict';

var JsonexParser = function(handlers, initialContext)
{
	if (!handlers) handlers = {};
	if (!initialContext) initialContext = {};

	this.handlers = handlers;
	this.initialContext = initialContext;	
};

JsonexParser.prototype.parse = function(string)
{
	try{
		if (!string) return;

		this.string = string;
		this.charIndex = 0;
		this.lineNumber = 0;

		return this.parseValue(this.initialContext);
	}
	catch(e)
	{
		console.log('Error at:', this.lineNumber + ':' + this.charIndex % this.lineNumber);
		throw e;
	}
};

module.exports = JsonexParser;

//-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_

JsonexParser.prototype.parseDictionary = function(context)
{
	this.expect('{');
	this.next();
	this.skipSpaces();

	var res = {};
	while (true)
	{
		var key = this.parseKey();
		this.skipSpaces();

		this.expect(':');
		this.next();
		this.skipSpaces();

		res[key] = this.parseValue(context);
		this.skipSpaces();

		if (this.charIs(','))
		{
			this.next();
			this.skipSpaces();
		}
		if (this.charIs('}')) break;
		if (this.charIndex >= this.string.length) this.expect('}');
	}

	this.expect('}');
	this.next();
	this.skipSpaces();

	return res;
};

JsonexParser.prototype.parseArray = function(context)
{
	this.expect('[');
	this.next();
	this.skipSpaces();

	var res = [];
	this.readList(res, ']', context);

	this.expect(']');
	this.next();
	this.skipSpaces();

	return res;
};

JsonexParser.prototype.parseKey = function()
{
	if (this.charIs('"')) return this.readQuoteString();
	else if (this.charIs('\'')) return this.readApostropheString();
	else return this.readJsonexKey();
};

JsonexParser.prototype.parseCallable = function(startWith, context)
{
	if (this.charIsInvalidForName()) this.expect();

	var callableName;
	if (!startWith) callableName = ''; 
	else callableName = startWith;

	while (true)
	{
		if (this.char() == '(') break;
		if (this.charIsSpace())
		{
			this.skipSpaces();
			this.expect('(');
			break;
		}
		if (this.charIsInvalidForName()) this.expect();

		callableName += this.char();
		this.next();

		if (this.charIndex >= this.string.length) this.expect('(');
	}
	this.expect('(');
	this.next();
	this.skipSpaces();

	var args = [];
	this.readList(args, ')');

	this.expect(')');
	this.next();
	this.skipSpaces();

	var res;
	if (Object.keys(this.handlers).indexOf(callableName) == -1)
	{
		if (Object.keys(this.handlers).indexOf('*') == -1) throw new SyntaxError('Undefined handler ' + callableName);
		args.unshift(callableName);
		args.unshift(context);
		res = this.handlers['*'].apply(undefined, args);
	}
	else
	{
		args.unshift(context);
		res = this.handlers[callableName].apply(undefined, args);
	}

	return res;
};

JsonexParser.prototype.parseEscaped = function()
{
	var res = '';
	if (this.charIs('u'))
	{
		this.next();
		for (var i = 0; i < 4; i++)
		{
			if ('0123456789ABCDEFabcdef'.indexOf(this.char()) == -1) this.illegal();

			res += this.char();
			this.next();
		}

		res = String.fromCharCode(parseInt(res, 16));
	}
	else
	{
		if (this.charIs('b'))
		{
			res = '\b';
			this.next();
		}
		else if (this.charIs('f'))
		{
			res = '\f';
			this.next();
		}
		else if (this.charIs('n'))
		{
			res = '\n';
			this.next();
		}
		else if (this.charIs('r'))
		{
			res = '\r';
			this.next();
		}
		else if (this.charIs('t'))
		{
			res = '\t';
			this.next();
		}
		else
		{
			res = this.char();
			this.next();
		}
	}

	
	return res;
};

JsonexParser.prototype.parseReservedAndCallables = function(context)
{
	var res, resStr = '';
	if (this.charIs('n'))
	{
		resStr += this.char();
		this.next();

		if (this.charIs('u'))
		{
			resStr += this.char();
			this.next();

			if (this.charIs('l'))
			{
				resStr += this.char();
				this.next();

				if (this.charIs('l'))
				{
					resStr += this.char();
					this.next();

					res = null;
				}
			}
		}
	}
	else if (this.charIs('t'))
	{
		resStr += this.char();
		this.next();

		if (this.charIs('r'))
		{
			resStr += this.char();
			this.next();

			if (this.charIs('u'))
			{
				resStr += this.char();
				this.next();

				if (this.charIs('e'))
				{
					resStr += this.char();
					this.next();

					res = true;
				}
			}
		}
	}
	else if (this.charIs('f'))
	{
		resStr += this.char();
		this.next();

		if (this.charIs('a'))
		{
			resStr += this.char();
			this.next();

			if (this.charIs('l'))
			{
				resStr += this.char();
				this.next();

				if (this.charIs('s'))
				{
					resStr += this.char();
					this.next();

					if (this.charIs('e'))
					{
						resStr += this.char();
						this.next();

						res = false;
					}
				}
			}
		}
	}
	else return this.parseCallable('', context);

	if (!this.charIsInvalidForName()) return this.parseCallable(resStr, context);

	this.skipSpaces();
	return res;
};

JsonexParser.prototype.parseValue = function(context)
{
	if (this.charIs('{')) return this.parseDictionary(context);
	else if (this.charIs('[')) return this.parseArray(context);
	else if (this.charIs('"')) return this.readQuoteString();
	else if (this.charIs('\'')) return this.readApostropheString();
	else if ('-0123456789'.indexOf(this.char()) != -1) return this.readNum();
	else return this.parseReservedAndCallables(context);
};

//-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_

JsonexParser.prototype.readStringContents = function(quoteChar)
{
	var res = '', escaped = false;
	while (true)
	{
		if (!escaped && this.char() == quoteChar) break;
		if (!escaped && this.char() == '\\') 
		{
			escaped = true;
			this.next();
		}

		if (escaped)
		{
			res += this.parseEscaped();
			escaped = false;
		}
		else
		{
			res += this.char();
			this.next();
		}
		

		if (this.charIndex >= this.string.length) this.expect(quoteChar);
	}

	return res;
};

JsonexParser.prototype.readQuoteString = function()
{
	this.expect('"');
	this.next();

	var res = this.readStringContents('"');

	this.expect('"');
	this.next();
	this.skipSpaces();

	return res;
};

JsonexParser.prototype.readApostropheString = function()
{
	this.expect('\'');
	this.next();

	var res = this.readStringContents('\'');

	this.expect('\'');
	this.next();
	this.skipSpaces();

	return res;
};

JsonexParser.prototype.readNum = function()
{
	var res = 0, fraction = 0, parsingFraction = false, negative = false, parsingNotation = false, mathNotation = 0;

	if (this.char() == '-')
	{
		negative = true;
		this.next();
		this.skipSpaces();
	}

	var curInt;
	while (true)
	{
		if (this.charIs('.'))
		{
			parsingFraction = true;
			this.next();
		}
		else if (this.charIs('e'))
		{
			parsingFraction = false;
			parsingNotation = true;
			this.next();
		}

		if (isNaN( curInt = parseInt(this.char()) ) ) break;
		if (parsingFraction)
		{
			fraction *= 10;
			fraction += curInt;
		}
		else if (parsingNotation)
		{
			mathNotation *= 10;
			mathNotation += curInt;
		}
		else
		{
			res *= 10;
			res += curInt;
		}
		this.next();
	}

	var result = res + fraction / Math.pow(10, fraction.toString().length);
	for (var i = 0; i < mathNotation; i++)
	{
		result *= 10;
	}

	return negative ? -result : result;
};

JsonexParser.prototype.readList = function(readTo, endChar, context)
{
	while (true)
	{
		if (this.charIs(endChar)) break;

		readTo.push(this.parseValue(context));
		this.skipSpaces();

		if (this.charIs(','))
		{
			this.next();
			this.skipSpaces();

			if (this.charIs(endChar)) break;
			if (this.charIndex >= this.string.length) this.expect(endChar);
		}
	}
};

JsonexParser.prototype.readJsonexKey = function()
{
	if (this.charIsInvalidForName()) this.expect();

	var res = '';
	while (true)
	{
		if (this.char() == ':') break;
		if (this.charIsSpace())
		{
			this.skipSpaces();
			this.expect(':');
			break;
		}
		if (this.charIsInvalidForName()) this.expect();

		res += this.char();
		this.next();

		if (this.charIndex >= this.string.length) this.expect(':');
	}

	return res;
};

//-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_

JsonexParser.prototype.illegal = function()
{
	throw new SyntaxError('Unexpected token ILLEGAL');
};

JsonexParser.prototype.expect = function(char)
{
	if (!this.charIs(char))
	{
		if (this.charIndex == this.string.length - 1) throw new SyntaxError('Unexpected end of input');
		else
		{
			if 		(this.charIs(' ') ) throw new SyntaxError('Unexpected token \' \''	 );
			else if (this.charIs('\n')) throw new SyntaxError('Unexpected token \'\\n\'');
			else if (this.charIs('\t')) throw new SyntaxError('Unexpected token \'\\t\'');
			else if (this.charIs('\r')) throw new SyntaxError('Unexpected token \'\\r\'');
			else throw new SyntaxError('Unexpected token ' + this.char());
		}
	}
};

JsonexParser.prototype.next = function()
{
	if (this.charIs('\n')) this.lineNumber++;
	this.charIndex++;
};

JsonexParser.prototype.charIsSpecial = function()
{
	return '[]{}:,\'"\\'.indexOf(this.char()) != -1;
};

JsonexParser.prototype.charIsMathOp = function()
{
	return '*/-+^!'.indexOf(this.char()) != -1;
};

JsonexParser.prototype.charIsSpace = function()
{
	return ' \n\r\t'.indexOf(this.char()) != -1;
};

JsonexParser.prototype.charIsInvalidForName = function(isFirst)
{
	var res = false;
	if (isFirst) res = !isNaN(parseInt(this.char()));
	return this.charIsMathOp() || this.charIsSpecial() || this.charIsSpace() || res;
};

JsonexParser.prototype.skipSpaces = function()
{
	if (this.charIsSpace())
	{
		this.next();
		this.skipSpaces();
	}
	if (this.charIs('/'))
	{
		this.next();
		if (this.charIs('/'))
		{
			while ('\n\r'.indexOf(this.char()) == -1)
			{
				this.next();
				if (this.charIndex >= this.string.length) this.expect('\n');
			}
			if('\n\r'.indexOf(this.char()) == -1) this.expect();
			this.next();
			this.skipSpaces();
		}
		else if (this.charIs('*'))
		{
			while (true)
			{
				if (this.charIs('*'))
				{
					this.next();
					if (this.charIs('/')) break;
				}
				this.next();
				if (this.charIndex >= this.string.length) this.expect('*');
			}
			this.expect('/');
			this.next();
			this.skipSpaces();
		}
	}
};

JsonexParser.prototype.charIs = function(char)
{
	return this.string[this.charIndex] == char;
};

JsonexParser.prototype.char = function()
{
	return this.string[this.charIndex];
};