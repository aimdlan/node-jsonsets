# Node JSONSets

> A small database based on JSON files, for Node.JS.
> Made as an alternative to a document-oriented database for small projects only.

## How it works

This module compiles/merges several JSON files into one, which is called the mainFile / prodFile. Every JSON file merged is considered as a set (= a part of the main file). Each set acts like a classic database table.  

As an example, you can easily have a really basic and flexible structure for a game. Your main file `.prod/game.json` would be a mix of multiple sets defined by JSON files (players.json, rounds.json, points.json) located in a specific directory (`.sets/*.json`).
```
.prod/
    game.json
.sets/
    players.json
    points.json
    rounds.json
```

## Installation

Just clone the repository. 📄

## Configuration

A .config file can be added in the script directory. Check the .config.example for a model.
Here is a list of the editable parameters :  

### prodname (String)
The name you want to use for the production JSON file.  
It can be whatever you want, default is "dbj".
### pointer (String)
The way the module will store the modified data.  
It can be inner_var (default) or global_var.

## Usage

```js
const JSONSets = require('./node-jsonsets/index.js');
let jsets = new JSONSets('FILE_NAME');
// the FILE_NAME argument is the production file name. It overrides the name defined in the config file.
```

```js
// Retrieve data
jsets.get('.'); // All data
jsets.get('.players'); // All data from the players set
jsets.get('.players.61696d65646576.name'); // The name of the player, by ID, from the players set
```

```js
// Set data
jsets.set('.file1.hello', 'world !');
jsets.set('.file1.hello', ['me', 'you', 'world !']);

// Remove data
jsets.del('.file1.hello');

// Add or remove item(s) from array 
jsets.push('.file1.hello', 'them');
jsets.push('.file1.hello', ['them', 'guys']);
jsets.splice('.file1.array', index, nbValues, newValues);
const someValuePosition = jsets.get('.file1.array').indexOf('someValue');
jsets.splice('.file1.array', someValuePosition, nbValues, newValues);
```

## Contributing

[🎫 Submit an issue](https://gitlab.com/aimedev/node-jsonsets/-/issues)

## Licence

MIT - [Aimedev](https://gitlab.com/aimedev)