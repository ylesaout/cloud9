/**
 * Cloud9 Language Foundation
 *
 * @copyright 2011, Ajax.org B.V.
 * @license GPLv3 <http://www.gnu.org/licenses/gpl.txt>
 */
define(function(require, exports, module) {

var PlaceHolder = require("ace/placeholder").PlaceHolder;
var marker = require("ext/language/marker");
var ide = require("core/ide");
var code = require("ext/code/code");

var ID_REGEX = /[a-zA-Z_0-9\$]/;

var retrieveFullIdentifier = function(text, pos) {
    var buf = [];
    var i = pos >= text.length ? (text.length - 1) : pos;
    while (i < text.length && ID_REGEX.test(text[i]))
        i++;
    // e.g edge semicolon check
    i = pos == text.length ? i : i-1;
    for (; i >= 0 && ID_REGEX.test(text[i]); i--) {
        buf.push(text[i]);
    }
    i++;
    var text = buf.reverse().join("");
    if (text.length == 0)
        return null;
    return {
        sc: i,
        text: text
    };
};

module.exports = {
    renameVariableItem: null,
    worker: null,
    
    hook: function(ext, worker) {
        var _self = this;
        this.worker = worker;
        
        worker.on("enableRefactorings", function(event) {
            _self.enableRefactorings(event);
        });
        
        worker.on("variableLocations", function(event) {
            _self.enableVariableRefactor(event.data);
        });

        worker.on("refactorResult", function(event) {
            _self.placeHolder && _self.placeHolder.detach();
            marker.enableMarkerType('occurrence_main');
            marker.enableMarkerType('occurrence_other');

            var data = event.data;
            if (! data.success) {
                console.log("TODO: reset the document and pop a refactor error");
                // TODO reset the document to its initial state && show the error message
            }
        });

        var nodes = [];
        this.refactorItem = new apf.item({
            caption: "Rename variable",
            disabled: true,
            onclick: function() {
                _self.renameVariable();
            }
        });
        
        var mnuRefactor = new apf.menu({id: "mnuRefactor"});
        apf.document.body.appendChild(mnuRefactor);
        
        nodes.push(mnuRefactor.appendChild(this.refactorItem));
        var refactorItem = new apf.item({
            caption: "Refactor",
            submenu: "mnuRefactor"
        });
        nodes.push(ide.mnuEdit.appendChild(refactorItem));
        
        code.commandManager.addCommand({
            name: "renameVar",
            exec: function(editor) {
                _self.renameVariable();
            }
        });
        
        ext.hotitems.renameVar = [nodes[0]];
        ext.nodes.push(nodes[0], nodes[1]);
    },
    
    enableRefactorings: function(event) {
        var names = event.data;
        var enableVariableRename = false;
        for (var i = 0; i < names.length; i++) {
            var name = names[i];
            if (name === 'renameVariable') {
                enableVariableRename = true;
            }
        }
        this.refactorItem.setAttribute('disabled', !enableVariableRename);
    },
    
    enableVariableRefactor: function(data) {
        var _self = this;

        // Temporarily disable these markers, to prevent weird slow-updating events whilst typing
        marker.disableMarkerType('occurrence_main');
        marker.disableMarkerType('occurrence_other');
        var cursor = ceEditor.$editor.getCursorPosition();
        var mainPos = data.pos;

        var p = this.placeHolder = new PlaceHolder(ceEditor.$editor.session, data.length, mainPos, data.others, "language_rename_main", "language_rename_other");
        if(cursor.row !== mainPos.row || cursor.column < mainPos.column || cursor.column > mainPos.column + data.length) {
            // Cursor is not "inside" the main identifier, move it there
            ceEditor.$editor.moveCursorTo(mainPos.row, mainPos.column);
        }
        p.showOtherMarkers();

        p.on("cursorLeave", function() {
            // Finished refactoring in editor
            // -> continue with the worker giving the initial refactor cursor position
            if (_self.oldIdentifier) {
                var doc = ceEditor.getDocument();
                var oPos = _self.placeHolder.pos;
                var line = doc.getLine(oPos.row);
                var newIdentifier = retrieveFullIdentifier(line, oPos.column);
                _self.worker.emit("finishRefactoring", {data: { oldId: _self.oldIdentifier, newName: newIdentifier.text } });
                _self.oldIdentifier = null;
            }
        });
    },

    renameVariable: function() {
        var curPos = ceEditor.$editor.getCursorPosition();
        var doc = ceEditor.getDocument();
        var line = doc.getLine(curPos.row);
        var oldId = retrieveFullIdentifier(line, curPos.column);
        this.oldIdentifier = {
            column: oldId.sc,
            row: curPos.row,
            text: oldId.text
        };
        this.worker.emit("fetchVariablePositions", {data: curPos});
    }
};

});