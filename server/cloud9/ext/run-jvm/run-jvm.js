/**
 * Java Runtime Module for the Cloud9 IDE
 *
 * @copyright 2010, Ajax.org B.V.
 * @license GPLv3 <http://www.gnu.org/licenses/gpl.txt>
 */
var Path              = require("path"),
    Plugin            = require("cloud9/plugin"),
    sys               = require("sys"),
    netutil           = require("cloud9/netutil"),
    jvm               = require("jvm-run/lib/jvm_instance"),
    JVMInstance       = jvm.JVMInstance,
    ScriptJVMInstance = jvm.ScriptJVMInstance,
    WebJVMInstance    = jvm.WebJVMInstance,
    build             = jvm.build;

var JVMRuntimePlugin = module.exports = function(ide, workspace) {
    this.ide = ide;
    this.workspace = workspace;
    this.hooks = ["command"];
    this.name = "jvm-runtime";
};

sys.inherits(JVMRuntimePlugin, Plugin);

(function() {
    this.init = function() {
        var _self = this;
        this.workspace.getExt("state").on("statechange", function(state) {
            state.javaProcessRunning = !!_self.instance;
        });
    };

    this.JAVA_DEBUG_PORT = 9000;

    this.command = function(user, message, client) {
        if (!(/java|jpy|jrb|groovy|js-rhino/.test(message.runner)))
          return false;

        var _self = this;

        var cmd = (message.command || "").toLowerCase(),
            res = true;
        switch (cmd) {
            case "run": case "rundebug": case "rundebugbrk": // We don"t debug python just yet.
                this.$run(message, client);
                break;
            case "kill":
                this.$kill();
                break;
            default:
                res = false;
                break;
        }
        return res;
    };

    this.$kill = function() {
        var instance = this.instance;
        if (!instance)
            return;
        try {
            instance.kill();
        }
        catch(e) {}
    };

    this.$run = function(message, client) {
        var _self = this;

        if (this.instance)
            return _self.workspace.error("Child process already running!", 1, message);

        var file = _self.workspace.workspaceDir + "/" + message.file;
        
        Path.exists(file, function(exists) {
           if (!exists)
               return _self.workspace.error("File does not exist: " + message.file, 2, message);
            
           var cwd = _self.ide.workspaceDir + "/" + (message.cwd || "");
           Path.exists(cwd, function(exists) {
               if (!exists)
                   return _self.workspace.error("cwd does not exist: " + message.cwd, 3, message);
                // lets check what we need to run
                var args = [].concat(file).concat(message.args || []);
                // message.runner = "java", "jy", "jrb", "groovy", "js-rhino"
                _self.$runJVM(message.runner, file.substring(cwd.length), args, cwd, message.env || {}, message.debug || false);
           });
        });
    };

    this.$runJVM = function(runner, file, args, cwd, env, debug) {
        var _self = this;

        // mixin process env
        for (var key in process.env) {
            if (!(key in env))
                env[key] = process.env[key];
        }

        var jvmInstance;

        switch (runner) {
            case "java":
                var javaClass = file.substring("src/".length).replace(new RegExp("/", "g"), ".").replace(/\.java$/, "");
                console.log("java class: " + javaClass);
                jvmInstance = new JVMInstance(cwd, javaClass);
                build(cwd, function(compilationResult) {
                    if (compilationResult.errors.length == 0)
                        start();
                    else {
                        // TODO send compilation errors
                        console.error(JSON.stringify(compilationResult));
                    }
                });
                break;
            case "jpy":
                jvmInstance = new ScriptJVMInstance(cwd, "jython", file);
                break;
            case "jrb":
                jvmInstance = new ScriptJVMInstance(cwd, "jruby1.8.7", file);
                break;
            case "groovy":
                jvmInstance = new ScriptJVMInstance(cwd, "groovy", file);
                break;
            case "js-rhino":
                console.error("JS-Rhino not tested yet");
                break;
            default:
                console.error("unsupported runtime environment")
        }
        
        switch (runner) {
            case "jpy":
            case "jrb":
            case "groovy":
            case "js-rhino":
                start();
                break;
        }
        
        function start() {
            console.log("JVM started");
            jvmInstance.on("output", sender("stdout"));
            jvmInstance.on("err", sender("stderr"));

            _self.instance = jvmInstance;
            _self.ide.broadcast(JSON.stringify({"type": "node-start"}), _self.name);
            jvmInstance.start();

            jvmInstance.on("exit", function(code) {
                _self.ide.broadcast(JSON.stringify({"type": "node-exit"}), _self.name);
                _self.debugClient = false;
                delete _self.instance;
            });
        }

        function sender(stream) {
            return function(data) {
                var message = {
                    "type": "node-data",
                    "stream": stream,
                    "data": data.toString("utf8")
                };
                _self.ide.broadcast(JSON.stringify(message), _self.name);
            };
        }

        return jvmInstance;
    };

    this.dispose = function(callback) {
        this.$kill();
        callback();
    };
    
}).call(JVMRuntimePlugin.prototype);
