# Cloud9 IDE Java Language Features

## TODOs

* EclipseClient protocol exhaustive testing
* General: Substitute the user's workspace in the EclipseClient creation
* General: Inner classes --> features testing and fixing pass
* Refactor: figure out how to change the refactor import without highlighting it
* Variable locations : the constructor is marked as a use --> not declaration
* Refactor: pressing enter key should also do the refactoring and pressing escape should cancel the refactoring
* Refactor: changed files must be noted !! --> maybe need a tree reload action
* Hierarchy: Source navigation to classes in the hierarchy tree
* Hierarchy: benefit from cursor type references (not just classes and inner classses)
* Better error handling in all features (including worker flows)
* Add something to base_handler to express how frequently a handler should be called
* Some handler methods needn't be called again if the file contents doesn't change (e.g. analyze)
* Some handler methods needn't be called if the cursor position doesn't change (e.g. getVariableLocations).

## Major Remaining Tasks
* Source navigation
* Subtypes hierarchy besides the current supertypes hierarchy
* Call Hierarchy
* Stop continous file saving requests (collaboration feature may help here)