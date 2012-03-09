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
var oldCommandKey;

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
    
    hook: function(ext, worker) {
        var _self = this;
        this.worker = worker;

        worker.on("enableRefactorings", function(event) {
            _self.enableRefactorings(event);
        });

        worker.on("variableLocations", function(event) {
            _self.enableVariableRefactor(event.data);
            worker.emit("startRefactoring", {data: {}});
        });

        worker.on("refactorResult", function(event) {
            var data = event.data;
            if (! data.success) {
                console.log("ERROR: now we should reset the document and pop a refactor error");
                _self.cancelRefactoring();
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

        // There is a problem with APF setting the $disabled attribute of
        // a cloned menu item, so we have to create a second one ourselves
        this.refactorItemDup = new apf.item({
            caption: "Rename variable",
            disabled: true,
            onclick: function() {
                _self.renameVariable();
            }
        });

        nodes.push(this.refactorItem, this.refactorItemDup);

        mnuEdit.appendChild(this.refactorItem);

        ide.addEventListener("init.ext/statusbar/statusbar", function (e) {
            e.ext.addToolsItem(new apf.divider(), 3);
            e.ext.addToolsItem(_self.refactorItemDup, 4);
        });

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
        this.refactorItemDup.setAttribute('disabled', !enableVariableRename);
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
        
        // Monkey patch
        if(!oldCommandKey) {
            var ace = ceEditor.$editor;
            oldCommandKey = ace.keyBinding.onCommandKey;
            ace.keyBinding.onCommandKey = this.onKeyPress.bind(this);
        }

        p.on("cursorLeave", function() {
            _self.finishRefactoring();
        });
    },

    renameVariable: function() {
        var editor = ceEditor.$editor;
        editor.focus();
        var curPos = editor.getCursorPosition();
        var doc = ceEditor.getDocument();
        var line = doc.getLine(curPos.row);
        var oldId = retrieveFullIdentifier(line, curPos.column);
        this.oldIdentifier = {
            column: oldId.sc,
            row: curPos.row,
            text: oldId.text
        };
        this.worker.emit("fetchVariablePositions", {data: curPos});
    },

    finishRefactoring: function() {
        // Finished refactoring in editor
        // -> continue with the worker giving the initial refactor cursor position
        var doc = ceEditor.getDocument();
        var oPos = this.placeHolder.pos;
        var line = doc.getLine(oPos.row);
        var newIdentifier = retrieveFullIdentifier(line, oPos.column);
        this.worker.emit("finishRefactoring", {data: { oldId: this.oldIdentifier, newName: newIdentifier.text } });
        this.$cleanup();
    },

    cancelRefactoring: function() {
        this.placeHolder.cancel();
        this.worker.emit("cancelRefactoring", {data: {}});
        this.$cleanup();
    },

    $cleanup: function() {
        this.placeHolder && this.placeHolder.detach();
        marker.enableMarkerType('occurrence_main');
        marker.enableMarkerType('occurrence_other');
        this.placeHolder = null;
        this.oldIdentifier = null;
        if(oldCommandKey) {
            ceEditor.$editor.keyBinding.onCommandKey = oldCommandKey;
            oldCommandKey = null;
        }
    },

    onKeyPress : function(e, hashKey, keyCode) {
        var keyBinding = ceEditor.$editor.keyBinding;

        switch(keyCode) {
            case 32: // Space can't be accepted as it will ruin the logic of retrieveFullIdentifier
            case 27: // Esc
                this.cancelRefactoring();
                e.preventDefault();
                break;
            case 13: // Enter
                this.finishRefactoring();
                e.preventDefault();
                break;
            default:
                oldCommandKey.apply(keyBinding, arguments);
                break;
        }
    }
};

});