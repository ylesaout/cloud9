/**
 * Cloud9 Language Foundation
 *
 * @copyright 2011, Ajax.org B.V.
 * @license GPLv3 <http://www.gnu.org/licenses/gpl.txt>
 */
define(function(require, exports, module) {

var baseLanguageHandler = require("ext/language/base_handler");

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

handler.handlesLanguage = function(language) {
    return language === "java";
};

handler.complete = function(doc, fullAst, cursorPos, currentNode, callback) {
    var _self = this;

    var saveCmd = {
      command: "save"
    };
    
    var saveFileAndComplete = function(event) {
      var data = event.data;
      if (data.command != saveCmd.command) 
        return;
      _self.sender.removeEventListener("commandComplete", saveFileAndComplete);

      if (! data.success) {
        console.log("Couldn't save the file !!");
        return callback([]);
      }
      console.log("commandComplete");
      
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

    this.sender.addEventListener("commandComplete", saveFileAndComplete);
    this.sender.emit("commandRequest", saveCmd);
};

handler.getVariablePositions = function(doc, fullAst /*null*/, pos, currentNode /*null*/, callback) {
    callback();
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
