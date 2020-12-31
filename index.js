const fs = require('fs');


let JSONSets = function(dbName = null) {
	this._log = `${__dirname}/jsonsets.log`;
	if (!fs.existsSync(this._log)) fs.writeFileSync(this._log, 'Hello !');
	
	this._pointersAvailable = ['global_var', 'inner_var'];
	this._name = 'dbj';
	this._pointer = 'inner_var';
	this._setsDir = `${__dirname}/.sets/`;
	
	// Check if a config file exists
	const configFile = `${__dirname}/config.txt`;
	if (fs.existsSync(configFile)) {
		const configTxt = fs.readFileSync(configFile, 'utf8');

		let pointer = configTxt.match(/pointer=([a-zA-Z_]*)/); // Determine what kind of variable we want
		if (Array.isArray(pointer) && this._pointersAvailable.includes(pointer[1])) this._pointer = pointer[1];
		
		let prodName = configTxt.match(/prodname=([a-zA-Z0-9_]*)/); // Determine the production filename we want
		if (Array.isArray(prodName)) this._name = prodName[1];			
	}
	if (dbName !== null) this._name = dbName;
	this._mainFile = `${__dirname}/.prod/${this._name}.json`;
	
	this._sets = [];
	this[`d${this._name}`] = {}; // Original cached base
	if (this._pointer === 'inner_var') this[`m${this._name}`] = {}; // Modified base, inner_var mode only
	
	this.first();
}

/**
 * First initialization - check prod file and load it
 */
JSONSets.prototype.first = async function() {
	if (!fs.existsSync(this._mainFile)) await this.prodCompile(true);
	await this.prodLoad();
}

/**
 * Writes an error in a specific file
 * @param {String}		error
 */
JSONSets.prototype.logToFile = function(error) {
	fs.writeFileSync(this._log, `${fs.readFileSync(this._log)}\n${error}`);
}

/**
 * Lists every sets in the defined sets' directory
 * @return 		sets loaded in class' variable ._sets
 */
JSONSets.prototype.setsList = function() {
	return new Promise((resolve, reject) => {
		fs.readdir(this._setsDir, { withFileTypes: true }, (err, files) => {
			if (err) {
				this.logToFile(err);
				return reject(false);
			}
			files.forEach((file) => {
				if (file.name === '.prod') return;
				if (file.name.substring(file.name.length - 5, file.name.length) !== '.json') return;
				const fileName = file.name.substring(0, file.name.length - 5);
				if (this._sets.includes(fileName)) this.logToFile(`Skipped file duplicata ${fileName}.json`);
				else this._sets.push(fileName);
			});
			resolve(true);
		});
	});
}

/**
 * Erases the original content of sets files
 */
JSONSets.prototype.setsReplace = function() {
	return new Promise((resolve, reject) => {
		for (let set of Object.keys(this[`d${this._name}`])) {
			if (this._pointer === 'inner_var')
				if (JSON.stringify(this[`m${this._name}`][set]) === JSON.stringify(this[`d${this._name}`][set])) continue;
			else if (this._pointer === 'global_var')
				if (JSON.stringify(global[this._name][set]) === JSON.stringify(this[`d${this._name}`][set])) continue;
			fs.writeFileSync(`${this._setsDir}/${set}.json`, JSON.stringify(this[`d${this._name}`][set], null, 4));
		}
		resolve();
	});
}

/**
 * Loads the production file in var
 */
JSONSets.prototype.prodLoad = function() {
	return new Promise((resolve, reject) => {
		// Main file (in .prod)
		if (!fs.existsSync(this._mainFile)) return reject(`prodLoad : unable to get file prod`);
		const fileContent = fs.readFileSync(this._mainFile);
		this[`d${this._name}`] = JSON.parse(fileContent);
		switch (this._pointer) {
			case 'inner_var':
				this[`m${this._name}`] = this[`d${this._name}`];
				break;
			case 'global_var':
				global[this._name] = this[`d${this._name}`];
				break;
			default:
				return reject(`prodLoad : unable to define which var to use`);
		}
		resolve(this._pointer);
	});
}

/**
 * Generates the prod JSON file
 * @param {Boolean} overrideSets	if true, it reloads the prod VAR with the content of each set
 */
JSONSets.prototype.prodCompile = function(overrideSets = true) {
	return new Promise(async (resolve, reject) => {
		if (overrideSets === true) {
			const setLoaded = await this.setsList(); // Foreach set, load in prod var
			if (!setLoaded) return reject(`prodCompile : unable to list sets for compiler`);
			for (let set of this._sets) {
				let fileContent = fs.readFileSync(`${this._setsDir}/${set}.json`);
				fileContent = JSON.parse(fileContent);
				if (JSON.stringify(fileContent) !== JSON.stringify(this[`d${this._name}`][set]))
					this[`d${this._name}`][set] = fileContent;
			}
		}
		
		// Save prod file
		if (!fs.existsSync(this._mainFile)) {
			this.logToFile(`prodLoad : unable to get file prod`);
			return reject();
		}
		fs.writeFileSync(this._mainFile, JSON.stringify(this[`d${this._name}`], null, 4));
		resolve();
	});
}

/**
 * Decodes a json path in steps
 * @param {String} path		The path, like `static.example1.1100110.example2`
 * @param {Object} k		The JSON to use for making steps
 * @return {Object} k		The JSON processed after going through steps
 */
JSONSets.prototype.processJSONPath = function(path = '.', k) {
	if (!path) {
		this.logToFile(`processJSONPath : missing path`);
		return;
	}
	if (path === '.') return { k, steps: [], last: null };
	else if (path.substring(0, 1) === '.') path = path.substring(1);
	var steps = path.split('.');
	var last = steps.pop();
	steps.forEach(e => (k[e] = k[e] || {}) && (k = k[e]));
	return { k,	steps, last };
}

/**
 * Common functions for interacting with the database
 */
JSONSets.prototype.get = function(path = '.') {
	const k = this.getPointer();
	let processed = this.processJSONPath(path, k);
	return (processed.last) ? processed.k[processed.last] : processed.k;
}

JSONSets.prototype.set = function(path = '.', value = null) {
	const k = this.getPointer();
	let processed = this.processJSONPath(path, k);
	if (processed.last) processed.k[processed.last] = value;
	else processed.k = value;
}

JSONSets.prototype.del = function(path = '.') {
	const k = this.getPointer();
	let processed = this.processJSONPath(path, k);
	if (processed.last) delete processed.k[processed.last];
	else processed.k = {};
}

JSONSets.prototype.push = function(path = '.', value = null) {
	const k = this.getPointer();
	let processed = this.processJSONPath(path, k);
	if (Array.isArray(value)) processed.k[processed.last] = processed.k[processed.last].concat(value); // It can merge arrays !
	else processed.k[processed.last].push(value);
}

JSONSets.prototype.splice = function(path = '.', index = 0, nb = 0, value = null) {
	const k = this.getPointer();
	let processed = this.processJSONPath(path, k);
	if (Array.isArray(value)) {
		for (let i = 0; i < value.length; i += 1) processed.k[processed.last].splice(index + i, nb, value[i]);
	} else {
		processed.k[processed.last].splice(index, nb, value);
	}
}


/**
 * Check which database pointer is used (global var | class/inner var)
 * @return {Object}		The var used by the class to store the edited database
 */
JSONSets.prototype.getPointer = function() {
	return (this._pointer === 'global_var')
		? global[this._name]
		: (this._pointer === 'inner_var')
			? this[`m${this._name}`]
			: this[`d${this._name}`];
}

/**
 * Finally saves edited JSON in sets files
 */
JSONSets.prototype.save = function() {
	return new Promise((resolve, reject) => {
		this.setsReplace().then(() => {
			this.prodCompile(false).then(() => {
				this.prodLoad().then(() => { resolve(); });
			});
		})
		.catch((err) => {
			this.logToFile(`Unable to replace ${this._name} sets - ${err}`);
			reject();
		});
	});
}

/**
 * Recompiles the prod file after you edited manually a set file (FTP)
 */
JSONSets.prototype.manu = function() {
	this.prodCompile(true).then(() => {
		this.prodLoad();
	});
}


module.exports = JSONSets;
