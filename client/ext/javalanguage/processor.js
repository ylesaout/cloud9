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
}

var calculateOffset = function(doc, cursorPos) {
    var offset = 0;
    var prevLines = doc.getLines(0, cursorPos.row - 1);

    for (var i=0; i < prevLines.length; i++) {
      offset += prevLines[i].length;
      offset += 1;
    }
    offset += cursorPos.column;

    return offset;
};

// TODO implement
var calculatePosition = function(doc, offset) {
    return null;
};

var saveFileAndDo = function(sender, callback) {
  var checkSavingDone = function() {
    var data = event.data;
      if (data.command != saveCmd.command) 
        return;
      sender.removeEventListener("commandComplete", saveFileAndComplete);
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

handler.handlesLanguage = function(language) {
    return language === "java";
};

handler.complete = function(doc, fullAst, cursorPos, currentNode, callback) {
    var _self = this;
    
    var doComplete = function(savingDone) {
      if (! savingDone)
        return callback([]);
      // The file has been saved, proceed to code complete request
      var data = {
        command : "jvmfeatures",
        subcommand : "complete",
        file : getFilePath(_self.path),
        offset: calculateOffset(doc, cursorPos)
      };
      _self.proxy.once("result", "jvmfeatures:complete", function(message) {
        console.log(message.body);
        callback(message.body.matches);
      });
      _self.proxy.send(data);
    };

    saveFileAndDo(doComplete);
};

handler.getVariablePositions = function(doc, fullAst /*null*/, pos, currentNode /*null*/, callback) {
    var _self = this;

    var line = doc.getLine(pos.row);
    var identifier = completeUtil.retrieveFullIdentifier(line, pos.column);
    console.log("Identifier:" + identifier);
    var offset = calculateOffset(doc, identifier.start);
    var data = {
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
        console.log(message.body);
        
        var v = message.body;
        var elementPos = {column: identifier.start, row: pos.row};
        var others = [];

        var appendToOthers = function(match) {
           if(offset !== match.offset) {
              var pos = calculatePosition(doc, match.offset);
              others.push(pos);
            }
        };

        v.declarations.forEach(appendToOthers);
        v.references.forEach(appendToOthers);

        callback({
            length: identifier.text.length,
            pos: elementPos,
            others: others
        });
      });
      _self.proxy.send(data);
    };

    saveFileAndDo(doGetVariablePositions);
};

handler.outline = function(doc, ast /* null */, callback) {
    callback();
};

/* TODO maybe used to free some user's instance memory
handler.onDocumentOpen = function(path, doc, oldPath, callback) {
    callback();
};
handler.onDocumentClose = function(path, callback) {
    callback();
};
*/

handler.analysisRequiresParsing = function() {
    return true;
};

});
