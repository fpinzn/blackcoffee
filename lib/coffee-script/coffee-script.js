// Generated by CoffeeScript 1.7.1
(function() {
  var Lexer, Macro, SourceMap, compile, ext, formatSourcePosition, fs, getSourceMap, helpers, lexer, parser, path, sourceMaps, vm, _base, _i, _len, _ref,
    __hasProp = {}.hasOwnProperty,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  fs = require('fs');

  vm = require('vm');

  path = require('path');

  Lexer = require('./lexer').Lexer;

  parser = require('./parser').parser;

  helpers = require('./helpers');

  SourceMap = require('./sourcemap');

  Macro = require('./macro');

  exports.VERSION = '1.7.1';

  exports.FILE_EXTENSIONS = ['.coffee', '.litcoffee', '.coffee.md'];

  exports.helpers = helpers;

  exports.compile = compile = function(code, options) {
    var ast, fragment, fragments, js, sourceMap;
    if (options == null) {
      options = {};
    }
    options = helpers.extend({}, options);
    ast = exports.nodes(code, options);
    if (options.macro !== false) {
      ast = Macro.expand(ast, exports.nodes);
    }
    fragments = ast.compileToFragments(options);
    js = ((function() {
      var _i, _len, _results;
      _results = [];
      for (_i = 0, _len = fragments.length; _i < _len; _i++) {
        fragment = fragments[_i];
        _results.push(fragment.code);
      }
      return _results;
    })()).join('');
    if (options.header) {
      js = ("// Generated by CoffeeScript " + this.VERSION + "\n") + js;
    }
    if (options.sourceMap) {
      sourceMap = new SourceMap(fragments, options);
      return {
        js: js,
        sourceMap: sourceMap,
        v3SourceMap: sourceMap.generate(options)
      };
    } else {
      return js;
    }
  };

  exports.tokens = function(code, options) {
    return lexer.tokenize(code, options);
  };

  exports.nodes = function(source, options) {
    var fileNum, nodes, _ref;
    if (options == null) {
      options = {};
    }
    fileNum = helpers.getFileNum(source, options.filename);
    if (typeof source === 'string') {
      source = exports.tokens(source, options);
    }
    nodes = parser.parse(source);
    if ((_ref = nodes.locationData) != null) {
      _ref.file_num = fileNum;
    }
    parser.yy.walk(nodes, function(n) {
      if (n.locationData) {
        n.locationData.file_num = fileNum;
      }
    });
    return nodes;
  };

  exports.run = function(code, options) {
    var answer, dir, mainModule, _ref;
    if (options == null) {
      options = {};
    }
    mainModule = require.main;
    mainModule.filename = process.argv[1] = options.filename ? fs.realpathSync(options.filename) : '.';
    mainModule.moduleCache && (mainModule.moduleCache = {});
    dir = options.filename ? path.dirname(fs.realpathSync(options.filename)) : fs.realpathSync('.');
    mainModule.paths = require('module')._nodeModulePaths(dir);
    if (!helpers.isCoffee(mainModule.filename) || require.extensions) {
      answer = compile(code, options);
      code = (_ref = answer.js) != null ? _ref : answer;
    }
    return mainModule._compile(code, mainModule.filename);
  };

  exports.run.stopStackTrace = true;

  exports["eval"] = function(code, options) {
    var Module, Script, js, k, o, r, sandbox, v, _i, _len, _module, _ref, _ref1, _require;
    if (options == null) {
      options = {};
    }
    if (!(code = code.trim())) {
      return;
    }
    Script = vm.Script;
    if (Script) {
      if (options.sandbox != null) {
        if (options.sandbox instanceof Script.createContext().constructor) {
          sandbox = options.sandbox;
        } else {
          sandbox = Script.createContext();
          _ref = options.sandbox;
          for (k in _ref) {
            if (!__hasProp.call(_ref, k)) continue;
            v = _ref[k];
            sandbox[k] = v;
          }
        }
        sandbox.global = sandbox.root = sandbox.GLOBAL = sandbox;
      } else {
        sandbox = global;
      }
      sandbox.__filename = options.filename || 'eval';
      sandbox.__dirname = path.dirname(sandbox.__filename);
      if (!(sandbox !== global || sandbox.module || sandbox.require)) {
        Module = require('module');
        sandbox.module = _module = new Module(options.modulename || 'eval');
        sandbox.require = _require = function(path) {
          return Module._load(path, _module, true);
        };
        _module.filename = sandbox.__filename;
        _ref1 = Object.getOwnPropertyNames(require);
        for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
          r = _ref1[_i];
          if (r !== 'paths') {
            _require[r] = require[r];
          }
        }
        _require.paths = _module.paths = Module._nodeModulePaths(process.cwd());
        _require.resolve = function(request) {
          return Module._resolveFilename(request, _module);
        };
      }
    }
    o = {};
    for (k in options) {
      if (!__hasProp.call(options, k)) continue;
      v = options[k];
      o[k] = v;
    }
    o.bare = true;
    js = compile(code, o);
    if (sandbox === global) {
      return vm.runInThisContext(js);
    } else {
      return vm.runInContext(js, sandbox);
    }
  };

  exports.register = function() {
    return require('./register');
  };

  if (require.extensions) {
    _ref = exports.FILE_EXTENSIONS;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      ext = _ref[_i];
      if ((_base = require.extensions)[ext] == null) {
        _base[ext] = function() {
          throw new Error("Use CoffeeScript.register() or require the coffee-script/register module to require " + ext + " files.");
        };
      }
    }
  }

  exports._compileFile = function(filename, sourceMap) {
    var raw, stripped;
    if (sourceMap == null) {
      sourceMap = false;
    }
    raw = fs.readFileSync(filename, 'utf8');
    stripped = raw.charCodeAt(0) === 0xFEFF ? raw.substring(1) : raw;
    return compile(stripped, {
      filename: filename,
      sourceMap: sourceMap,
      literate: helpers.isLiterate(filename)
    });
  };

  lexer = new Lexer;

  parser.lexer = {
    lex: function() {
      var tag, token;
      token = this.tokens[this.pos++];
      if (token) {
        tag = token[0], this.yytext = token[1], this.yylloc = token[2];
        this.errorToken = token.origin || token;
        this.yylineno = this.yylloc.first_line;
      } else {
        tag = '';
      }
      return tag;
    },
    setInput: function(tokens) {
      this.tokens = tokens;
      return this.pos = 0;
    },
    upcomingInput: function() {
      return "";
    }
  };

  parser.yy = require('./nodes');

  parser.yy.parseError = function(message, _arg) {
    var errorLoc, errorTag, errorText, errorToken, token, tokens, _ref1;
    token = _arg.token;
    _ref1 = parser.lexer, errorToken = _ref1.errorToken, tokens = _ref1.tokens;
    errorTag = errorToken[0], errorText = errorToken[1], errorLoc = errorToken[2];
    errorText = errorToken === tokens[tokens.length - 1] ? 'end of input' : errorTag === 'INDENT' || errorTag === 'OUTDENT' ? 'indentation' : helpers.nameWhitespaceCharacter(errorText);
    return helpers.throwSyntaxError("unexpected " + errorText, errorLoc);
  };

  formatSourcePosition = function(frame, defSrcMap) {
    var as, column, fileLocation, fileName, functionName, isConstructor, isMethodCall, line, methodName, source, sourceMap, tp, typeName;
    fileName = void 0;
    fileLocation = '';
    if (frame.isNative()) {
      fileLocation = "native";
    } else {
      if (frame.isEval()) {
        fileName = frame.getScriptNameOrSourceURL();
      } else {
        fileName = frame.getFileName();
      }
      line = frame.getLineNumber();
      column = frame.getColumnNumber();
      if (fileName) {
        sourceMap = getSourceMap(fileName);
      } else {
        sourceMap = defSrcMap;
      }
      if (sourceMap) {
        source = sourceMap.sourceLocation(line - 1, column - 1);
        if (source) {
          fileLocation = helpers.locationDataToString(source);
        }
      }
      if (!fileLocation) {
        fileLocation = "" + (fileName || '<anonymous>') + ":" + line + ":" + column;
      }
    }
    functionName = frame.getFunctionName();
    isConstructor = frame.isConstructor();
    isMethodCall = !(frame.isToplevel() || isConstructor);
    if (isMethodCall) {
      methodName = frame.getMethodName();
      typeName = frame.getTypeName();
      if (functionName) {
        tp = as = '';
        if (typeName && functionName.indexOf(typeName)) {
          tp = "" + typeName + ".";
        }
        if (methodName && functionName.indexOf("." + methodName) !== functionName.length - methodName.length - 1) {
          as = " [as " + methodName + "]";
        }
        return "" + tp + functionName + as + " (" + fileLocation + ")";
      } else {
        return "" + typeName + "." + (methodName || '<anonymous>') + " (" + fileLocation + ")";
      }
    } else if (isConstructor) {
      return "new " + (functionName || '<anonymous>') + " (" + fileLocation + ")";
    } else if (functionName) {
      return "" + functionName + " (" + fileLocation + ")";
    } else {
      return fileLocation;
    }
  };

  sourceMaps = {};

  getSourceMap = function(filename) {
    var answer, _ref1;
    if (sourceMaps[filename]) {
      return sourceMaps[filename];
    }
    if (_ref1 = path != null ? path.extname(filename) : void 0, __indexOf.call(exports.FILE_EXTENSIONS, _ref1) < 0) {
      return;
    }
    answer = exports._compileFile(filename, true);
    return sourceMaps[filename] = answer.sourceMap;
  };

  Error.prepareStackTrace = function(err, stack) {
    var frame, frames;
    frames = (function() {
      var _j, _len1, _ref1, _results;
      _results = [];
      for (_j = 0, _len1 = stack.length; _j < _len1; _j++) {
        frame = stack[_j];
        if ((_ref1 = frame.getFunction()) != null ? _ref1.stopStackTrace : void 0) {
          break;
        }
        _results.push("  at " + (formatSourcePosition(frame, err.srcMap)));
      }
      return _results;
    })();
    return "" + (err.toString()) + "\n" + (frames.join('\n')) + "\n";
  };

}).call(this);
