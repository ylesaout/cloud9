/**
 * Cloud9 Language Foundation
 *
 * @copyright 2011, Ajax.org B.V.
 * @license GPLv3 <http://www.gnu.org/licenses/gpl.txt>
 */
define(function(require, exports, module) {

var baseLanguageHandler = require("ext/language/base_handler");

var handler = module.exports = Object.create(baseLanguageHandler);

var calculateOffset = function(doc, cursorPos) {
  return 20; // TODO implement
}

handler.handlesLanguage = function(language) {
    return language === "java";
};

handler.complete = function(doc, fullAst, cursorPos, currentNode, callback) {
    console.log("path: " + this.path);
    var data = {
      command : "jvmfeatures",
      subcommand : "complete",
      file : this.path,
      offset: calculateOffset(doc, cursorPos)
    };
    this.proxy.subscribe("result", "jvmfeatures:complete", function(message) {
      console.log(message.body);
      callback([]);
    });
    this.proxy.send(data);
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
