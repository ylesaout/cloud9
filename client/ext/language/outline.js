/**
 * Module that implements outlines
 * Currently DISABLED
 */
define(function(require, exports, module) {

var editors = require("ext/editors/editors");
var Range = require("ace/range").Range;
var ide = require("core/ide");

module.exports = {
    hook: function(ext, worker) {
        var _self = this;
        
        worker.on("outline", function(event) {
            _self.renderOutline(event);
        });

        var outlineItem = new apf.item({
            caption: "Outline",
            onclick: function() {
                worker.emit("outline", {data: {}});
            }
        });
        var node = ide.mnuEdit.appendChild(outlineItem);
        ext.nodes.push(node);
    },

    outlineJsonToXml: function(array, selected) {
        var xmlS = '';
        for (var i = 0; i < array.length; i++) {
            var elem = array[i];
            xmlS += '<entry name="' + elem.name + '" icon="' + elem.icon
                + '" sl="' + elem.pos.sl + '" el="' + elem.pos.el
                + '" sc="' + elem.pos.sc + '" ec="' + elem.pos.ec
                + '"' + (elem === selected ? ' selected="true"' : '') + '>\n';
            xmlS += this.outlineJsonToXml(elem.items, selected);
            xmlS += '</entry>';
        }
        return xmlS;
    },

    findCursorInOutline: function(json, cursor) {
        for (var i = 0; i < json.length; i++) {
            var elem = json[i];
            if(cursor.row < elem.pos.sl || cursor.row > elem.pos.el)
                continue;
            var inChildren = this.findCursorInOutline(elem.items, cursor);
            return inChildren ? inChildren : elem;
        }
        return null;
    },

    renderOutline : function(event) {
        console.log("Rendering layout");
        var ace = editors.currentEditor.ceEditor.$editor;
        var outline = event.data;
        
        barOutline.setAttribute('visible', true);
        var selected = this.findCursorInOutline(outline, ace.getCursorPosition());
        mdlOutline.load(apf.getXml('<data>' + this.outlineJsonToXml(outline.items, selected) + '</data>'));
        
        var node = mdlOutline.queryNode("//entry[@selected]");
        if(node) {
            treeOutline.select(node);
            var htmlNode = apf.xmldb.getHtmlNode(node, treeOutline);
            htmlNode.scrollIntoView();
        }
        //document.addEventListener("click", this.closeOutline);
        ace.container.addEventListener("DOMMouseScroll", this.closeOutline);
        ace.container.addEventListener("mousewheel", this.closeOutline);

        apf.popup.setContent("outline", barOutline.$ext);
        setTimeout(function() {
            apf.popup.show("outline", {
                x        : editors.currentEditor.ceEditor.getWidth()/2 - 150,
                y        : 0,
                animate  : false,
                ref      : ace.container,
                callback : function() {
                    barOutline.setHeight(300);
                    barOutline.setWidth(300);
                    sbOutline.$resize();
                    setTimeout(function() {
                        treeOutline.focus();
                    }, 100);
                }
            });
        }, 0);
    },

    jumpTo: function(el) {
        setTimeout(function() {
            var editor = editors.currentEditor.ceEditor.$editor;
            var range = new Range(+el.getAttribute("sl"), +el.getAttribute("sc"),
                +el.getAttribute("el"), +el.getAttribute("ec"));
            editor.selection.setSelectionRange(range);
            editor.centerSelection();
        });
    },

    jumpToAndClose: function(el) {
        this.closeOutline();
    },

    closeOutline : function(event) {
        var ace = editors.currentEditor.ceEditor.$editor;
        //document.removeEventListener("click", this.closeOutline);
        ace.container.removeEventListener("DOMMouseScroll", this.closeOutline);
        ace.container.removeEventListener("mousewheel", this.closeOutline);
        barOutline.$ext.style.display = "none";
        setTimeout(function() {
            editors.currentEditor.ceEditor.$editor.focus();
        }, 100);
    },

    escapeOutline: function(event) {
        if(event.keyCode === 27) {
            this.closeOutline();
        }
    }
};
});