# Cloud9 IDE Java Language Features

## TODOs

* Subtypes hierarchy fix for binary types e.g. (List and Document)
* Restore analyze seamlessness in editing from previous revisions (without the new setInterval way)
* EclipseClient protocol exhaustive testing
* General: Substitute the user's workspace in the EclipseClient creation
* General: Inner classes --> features testing and fixing pass
* Refactor: figure out how to change the refactor import without highlighting it (maybe apply deltas)
* Refactor: changed files must be noted !! --> maybe need a tree reload action
* Better error handling in all features (including worker flows)
* Add something to base_handler to express how frequently a handler should be called
* Some handler methods needn't be called again if the file contents doesn't change (e.g. analyze)

## Major Remaining Tasks
* Call Hierarchy
* Stop continous file saving requests (collaboration feature may help here)