# Cloud9 IDE Java Language Features

## TODOs
* EclipseClient protocol exhaustive testing
* General: Substitute the user's workspace in the EclipseClient creation
* General: Extract project name from the workspace
* Autocompletion: complete.js --> autocompletion box (prefix work (populateMatches and replace>Text))
* Refactor: Adjust placeholder to take (positions + lengths and where to adjust) to be able to mark imports
* Variable locations : the constructor is marked as a use --> not declaration
* Add automatic imports when auto-completing a class using the pkg attribute
* Autocomplete: private, protected and public access constraints
* Autocomplete: access icons
* Refactor: pressing enter key should also do the refactoring and pressing escape should cancel the refactoring
* Refactor: changed files must be noted !! --> maybe need a tree reload action

Major Tasks
* Outline
* processor.analyze -> build and get error markers