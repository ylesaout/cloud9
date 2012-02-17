/**
 * Cloud9 Language Foundation
 *
 * @copyright 2011, Ajax.org B.V.
 * @license GPLv3 <http://www.gnu.org/licenses/gpl.txt>
 */
define(function(require, exports, module) {

var baseLanguageHandler = require("ext/language/base_handler");
var completeUtil = require("ext/codecomplete/complete_util");

var handler = module.exports = Object.create(baseLanguageHandler);

var getFilePath = function(filePath) {
    if (filePath.indexOf("/workspace/") === 0)
        filePath = filePath.substr(11);
    return filePath;
};

var calculateOffset = function(doc, cursorPos) {
    var offset = 0, newLineLength = doc.getNewLineCharacter().length;
    var prevLines = doc.getLines(0, cursorPos.row - 1);

    for (var i=0; i < prevLines.length; i++) {
      offset += prevLines[i].length;
      offset += newLineLength;
    }
    offset += cursorPos.column;

    return offset;
};

var calculatePosition = function(doc, offset) {
    var row = 0, column, newLineLength = doc.getNewLineCharacter().length;;
    while (offset > 0) {
      offset -= doc.getLine(row++).length;
      offset -= newLineLength; // consider the new line character(s)
    }
    if (offset < 0) {
      row--;
      offset += newLineLength; // add the new line again
      column = doc.getLine(row).length + offset;
    } else {
      column = 0;
    }
    return {
      row: row,
      column: column
    };
};

var convertToOutlineTree = function(doc, root) {
  var items = root.items, newItems = [];
  var start = calculatePosition(doc, root.offset);
  var end = calculatePosition(doc, root.offset + root.length);
  var newRoot = {
    icon: root.type,
    name: root.name,
    items: newItems,
    meta: root.meta,
    pos: {
      sl: start.row,
      sc: start.column,
      el: end.row,
      ec: end.column
    },
    modifiers: root.modifiers
  };
  for (var i = 0; i < items.length; i++) {
    newItems.push(convertToOutlineTree(doc, items[i]));
  }
  return newRoot;
};

var saveFileAndDo = function(sender, callback) {
  var checkSavingDone = function(event) {
    var data = event.data;
      if (data.command != "save")
        return;
      sender.removeEventListener("commandComplete", checkSavingDone);
      if (! data.success) {
        console.log("Couldn't save the file !!");
        return callback(false);
      }
      console.log("Saving Complete");
      callback(true);
  };
  sender.addEventListener("commandComplete", checkSavingDone);
  sender.emit("commandRequest", { command: "save" });
};

(function() {

    this.handlesLanguage = function(language) {
        return language === "java";
    };

    this.complete = function(doc, fullAst, cursorPos, currentNode, callback) {
        var _self = this;
        var doComplete = function(savingDone) {
          if (! savingDone)
            return callback([]);
          // The file has been saved, proceed to code complete request
          var offset = calculateOffset(doc, cursorPos);
          var command = {
            command : "jvmfeatures",
            subcommand : "complete",
            file : getFilePath(_self.path),
            offset: offset
          };
          console.log("offset = " + offset);
          _self.proxy.once("result", "jvmfeatures:complete", function(message) {
            console.log(message.body);
            callback(message.body.matches);
          });
          _self.proxy.send(command);
        };

        saveFileAndDo(this.sender, doComplete);
    };

    this.onCursorMovedNode = function(doc, fullAst /*null*/, cursorPos, currentNode /*null*/, callback) {

        console.log("onCursorMovedNode called");

        if (this.inProgress || this.refactorInProgress)
          return callback();
        this.inProgress = true;

        var _self = this;
        var markers = [];
        var enableRefactorings = [];

        var originalCallback = callback;
        callback = function() {
          console.log("onCursorMove callback called");
          _self.inProgress = false;
          originalCallback.apply(null, arguments);
        };

        var line = doc.getLine(cursorPos.row);
        var identifier = completeUtil.retrieveFullIdentifier(line, cursorPos.column);
        if (! identifier)
          return callback();

        var offset = calculateOffset(doc, { row: cursorPos.row, column: identifier.sc } );
        var length = identifier.text.length;
        console.log("cursor: " + cursorPos.row + ":" + cursorPos.column + " & offset: " + offset + " & length: " + identifier.text.length);
        var command = {
          command : "jvmfeatures",
          subcommand : "get_locations",
          file : getFilePath(_self.path),
          offset: offset,
          length: length
        };

        var doGetVariablePositions = function(savingDone) {
          if (! savingDone)
            return callback();

          _self.proxy.once("result", "jvmfeatures:get_locations", function(message) {
            // console.log(message.body);

            var v = message.body;

            _self.proxy.emitter.removeAllListeners("result:jvmfeatures:get_locations");
            // console.log("variable positions retrieved");

            highlightVariable(v);
            enableRefactorings.push("renameVariable");
            doneHighlighting();
          });
          _self.proxy.send(command);
        };

        function highlightVariable(v) {
            if (!v)
                return callback();
            v.declarations.forEach(function(match) {
                var pos = calculatePosition(doc, match.offset);
                markers.push({
                    pos: {
                      sl: pos.row, el: pos.row,
                      sc: pos.column, ec: pos.column + length
                    },
                    type: 'occurrence_main'
                });
            });
            v.uses.forEach(function(match) {
                var pos = calculatePosition(doc, match.offset);
                markers.push({
                    pos: {
                      sl: pos.row, el: pos.row,
                      sc: pos.column, ec: pos.column + length
                    },
                    type: 'occurrence_other'
                });
            });
        }

        function doneHighlighting() {
          if (! _self.isFeatureEnabled("instanceHighlight"))
            return callback({ enableRefactorings: enableRefactorings });

          callback({
              markers: markers,
              enableRefactorings: enableRefactorings
          });
        }

        saveFileAndDo(this.sender, doGetVariablePositions);
    };

    this.getVariablePositions = function(doc, fullAst /*null*/, pos, currentNode /*null*/, callback) {

        var _self = this;

        var line = doc.getLine(pos.row);
        var identifier = completeUtil.retrieveFullIdentifier(line, pos.column);
        var offset = calculateOffset(doc, { row: pos.row, column: identifier.sc } );
        var command = {
          command : "jvmfeatures",
          subcommand : "get_locations",
          file : getFilePath(_self.path),
          offset: offset,
          length: identifier.text.length
        };

        var doGetVariablePositions = function(savingDone) {
          if (! savingDone)
            return callback();

          _self.proxy.once("result", "jvmfeatures:get_locations", function(message) {

            _self.proxy.emitter.removeAllListeners("result:jvmfeatures:get_locations");

            var v = message.body;
            var elementPos = {column: identifier.sc, row: pos.row};
            var others = [];

            var appendToOthers = function(match) {
               if(offset !== match.offset) {
                  var pos = calculatePosition(doc, match.offset);
                  others.push(pos);
                }
            };

            v.declarations.forEach(appendToOthers);
            v.uses.forEach(appendToOthers);

            callback({
                length: identifier.text.length,
                pos: elementPos,
                others: others
            });
          });
          _self.proxy.send(command);
        };

        saveFileAndDo(this.sender, doGetVariablePositions);
    };

    this.finishRefactoring = function(doc, oldId, newName, callback) {
        var _self = this;
        this.refactorInProgress = true;

        var offset = calculateOffset(doc, oldId);

        var command = {
          command : "jvmfeatures",
          subcommand : "refactor",
          file : getFilePath(_self.path),
          offset: offset,
          newname: newName,
          length: oldId.text.length
        };

        console.log("finishRefactoring called");

        this.proxy.once("result", "jvmfeatures:refactor", function(message) {
          _self.refactorInProgress = false;
          callback(message.body);
        });
        this.proxy.send(command);
    };

    this.outline = function(doc, ast /*null*/, callback) {
        var _self = this;
        var command = {
          command : "jvmfeatures",
          subcommand : "outline",
          file : getFilePath(_self.path)
        };

        console.log("outline called");

        var doGetOutline = function() {
          _self.proxy.once("result", "jvmfeatures:outline", function(message) {
            console.log(message.body);
            callback(convertToOutlineTree(doc, message.body));
          });
          _self.proxy.send(command);
        };

        saveFileAndDo(this.sender, doGetOutline);
    };

    this.analysisRequiresParsing = function() {
        return false;
    };

    this.analyze = function(doc, fullAst /* null */, callback) {
        callback();
    };

}).call(handler);

});
