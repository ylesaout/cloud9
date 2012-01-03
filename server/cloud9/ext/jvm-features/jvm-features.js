/**
 * Python Runtime Module for the Cloud9 IDE
 *
 * @copyright 2010, Ajax.org B.V.
 * @license GPLv3 <http://www.gnu.org/licenses/gpl.txt>
 */
var Path             = require("path"),
    Plugin           = require("cloud9/plugin"),
    sys              = require("sys"),
    util             = require("util"),
    netutil          = require("cloud9/netutil"),
    EclipseClient    = require("eclipse/eclipse_client");

var JVMFeatures = module.exports = function(ide, workspace) {
    Plugin.call(this, ide, workspace);
    this.hooks = ["connect", "disconnect", "command"];
    this.name = "jvm-features";
    this.basePath  = ide.workspaceDir + "/";
};

sys.inherits(JVMFeatures, Plugin);

(function() {

    this.ECLIPSE_START_PORT = 10000;

    this.command = function(user, message, client) {
        var cmd = message.command;
        if (cmd != "jvmfeatures")
            return false;

        var _self = this;
        
        /*
        netutil.findFreePort(this.ECLIPSE_START_PORT, this.ECLIPSE_START_PORT + 1000, "localhost",
          function(err, port) {
            if (err)
              return _self.$error("Could not find a free port", 1, err);
            var client = new EclipseClient("localhost", port, "/home/eweda/runtime-CodeCompletePlugin.Cloud9Eclipse");
            client.on("lifecycle:connected", function() {
              console.log("Eclipse session initalied");
              // TODO do something here
            });
            client.initEclipseSession();
        });

        client.codeComplete("sossa1", "src/HelloWorld2.java", 267,
          function(data) {
            if (! data.success)
              return _self.$error("Could not execute complete request", 2);
            var suggestions = data.body;
            console.log("Suggestions: " + suggestions);
            for (var i = 0; i < suggestions.length; i++) {
              console.log(util.inspect(suggestions[i], true, null));
            }
        });
        */
        var subCmd = (message.subcommand || "").toLowerCase(),
            res = true;
        switch (subCmd) {
            case "complete":
              this.sendResult(0, cmd + ":" + subCmd, {
                matches: []
              });
              break;
            case "outline":
                break;
            default:
                res = false;
                break;
        }
        return res;
    };
    
    this.$error = function(message, code, data) {
        this.ide.broadcast(JSON.stringify({
            "type": "error",
            "message": message,
            "code": code || 0,
            "data": data || ""
        }), this.name);
    };
    
    this.connect = function(user, client) {
        // TODO get to know user and client and how to store and get from the session
        // TODO maybe init the eclipse instance for that user
        return true;
    };
    
    this.disconnect = function(user, client) {
        // TODO kill the eclipse instance of that user
        return true;
    };
    
    this.dispose = function(callback) {
        // TODO kill all eclipse instances
        callback();
    };
    
}).call(JVMFeatures.prototype);
