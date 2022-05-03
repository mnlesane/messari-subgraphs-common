const path = require('path')
//const yargs = require('yargs')
const { exec } = require('child_process');
const fs = require ('fs');
const fse = require('fs-extra');
const yaml = require('js-yaml');
const directoryTree = require('directory-tree');

const run = async argv => {
    var args = process.argv.slice(2);
    var cmds = ["price-oracle","abis","common","mappings"];
    var cmd = args.shift();
    switch (cmd) {
      case 'install':
	install(args.shift());
	break;
      case 'remove':
	remove(args.shift());	
	break;
      case 'install-all':
	cmds.forEach(element => {
	    install(element)
	})
	break;
      case 'remove-all':
	cmds.forEach(element => {
	    remove(element)
	})
	break;
      case 'update':
	// Everything
	cmds.forEach(element => {
	    remove(element);
	    install(element)
	})
	break;
    }
}

function cprp(src,dest) {
    var res = fse.copySync(src, dest, {overwrite:true}, function (err) {
	if(err) {
	    console.error(err);
	    return false;
	} else {
	    console.log("cp -rp "+src+" "+dest)
	    return true;
	}
    });
    return res;
}

function dir_exists(dir) {
}

function install(submod) {
    var appRoot = process.env.PWD;
    var modRoot = path.dirname(__dirname);
    var refRoot = modRoot+"/_reference_";
    
    switch (submod) {
	//TODO refactor and confirm if files or folders will be overwritten
    case 'price-oracle':
	// ./abis/Prices/
	if (!fse.existsSync(appRoot+"/abis/")) {
	    fse.mkdirSync(appRoot+"/abis/");
	}
	cprp(refRoot+"/abis/Prices/",appRoot+"/abis/Prices");
	// ./src/prices/
	if (!fs.existsSync(appRoot+"/src/")) {
	    fs.mkdirSync(appRoot+"/src/");
	}
	cprp(refRoot+"/src/prices/",appRoot+"/src/prices");
	// ./subgraph.yaml insertion
        j = JSON.parse(fs.readFileSync(refRoot+'/config/priceOracleABIs.json'))
        abis = j.priceOracleABIs
        jy = yaml.load(abis);

	try {
		y = yaml.load(fs.readFileSync(appRoot+'/subgraph.yaml'))
	} catch (e) {
		y = null;
	}
	if(y) {
		jy.forEach(item => function(){
		  y.dataSources.forEach(source => function() {
		    sma = source.mapping.abis
		    var match = sma.filter(function(val) { return val.file === item.file});
		    if(!match.length) {
		      sma.push(item)
		    }
		  }());
		}())
		var output = yaml.dump(y); // TODO warning: no comments afterward.
		fs.closeSync(fs.openSync(appRoot+'/subgraph.yaml', "w"));
		fs.writeFileSync(appRoot+'/subgraph.yaml',output,function(err) { console.log(err); });
	} else {
		//Use the default.
		fse.copySync(
		  refRoot+"/subgraph.yaml",
		  appRoot+"/subgraph.yaml"
		)
	}
	break;
    case 'abis':
        // ./abis/*.json
	if (!fs.existsSync(appRoot+"/abis/")) {
	    fs.mkdirSync(appRoot+"/abis/");
	}
	var tree = directoryTree(refRoot+'/abis',{extensions:/\.json/});
	tree.children.forEach(file => function() {
	  if(file.children) return
	  fse.copySync(file.path,appRoot+'/abis/'+file.name);
	}());
	break;
    case 'common':
	if (!fs.existsSync(appRoot+"/src/")) {
	    fs.mkdirSync(appRoot+"/src/");
	}
        // ./src/common/
	cprp(refRoot+"/src/common/",appRoot+"/src/common");
	break;
    case 'mappings':
        // ./src/common/mappings
	if (!fs.existsSync(appRoot+"/src/")) {
	    fs.mkdirSync(appRoot+"/src/");
	}
	cprp(refRoot+"/src/mappings",appRoot+"/src/mappings");
	break;
    }
}

function remove(submod) {
    // Always ask for a confirmation before proceeding.  Later, check git.
    var appRoot = process.env.PWD;
    var modRoot = path.dirname(__dirname);
    var refRoot = modRoot+"/_reference_";
    
    switch (submod) {
	//TODO refactor and confirm if files or folders will be overwritten
    case 'price-oracle':
	// ./abis/Prices/
	fse.removeSync(appRoot+"/abis/Prices", { recursive: true, force: true });
	// ./src/prices/
	fse.removeSync(appRoot+"/src/prices", { recursive: true, force: true });
	// ./subgraph.yaml insertion
        j = JSON.parse(fs.readFileSync(refRoot+'/config/priceOracleABIs.json'))
        abis = j.priceOracleABIs
        jy = yaml.load(abis);

	try {
		y = yaml.load(fs.readFileSync(appRoot+'/subgraph.yaml'))
	} catch (e) {
		y = null;
	}
	if(y) {
		jy.forEach(item => function(){
		  y.dataSources.forEach(source => function() {
		    sma = source.mapping.abis;
		    sma = sma.filter(function(val) { return val.file !== item.file});
		    source.mapping.abis = sma;
		  }());
		}())
		var output = yaml.dump(y); // TODO warning: no comments afterward.
		fs.closeSync(fs.openSync(appRoot+'/subgraph.yaml', "w"));
		fs.writeFileSync(appRoot+'/subgraph.yaml',output,function(err) { console.log(err); });
	} else {
		//???
	}
	break;
    case 'abis':
        // ./abis/*.json
	var tree = directoryTree(refRoot+'/abis',{extensions:/\.json/});
	tree.children.forEach(file => function() {
	  if(file.children) return;
	  fse.unlinkSync(appRoot+'/abis/'+file.name);
	}());
	break;
	break;
    case 'common':
        // ./src/common/
	fse.removeSync(appRoot+"/src/common", { recursive: true, force: true });
	break;
    case 'mappings':
        // ./src/mappings
	fse.removeSync(appRoot+"/src/mappings", { recursive: true, force: true });
	break;
    }
}

module.exports = { run }
