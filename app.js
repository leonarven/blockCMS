
var port     = 3000,
	express  = require('express'),
	cjson    = require('cjson'),
	jade     = require('jade'),
	redis    = require('redis'),
	app      = express(),
	db       = require('./db.js'),
	config   = cjson.load("./config.json"),
	block    = require('./block.js'),    
	element  = require('./element.js'),  elements  = {},
	template = require('./template.js'), templates = {},
	page     = require('./page.js'),     pages     = {},
	hashlist = {},
	jadeOptions = {};

config.page  = cjson.load("./pages.json");

/*console.log('Creating client');   var client  = redis.createClient();

client.on("error", function (err) {
	console.error("Error", err);
});*/

console.log('Start to listen port ' + port);
app.listen(port);

console.log('Loading and generating configurations');
app.configure(function(){
	app.set('views', __dirname + '/views');
	app.set('view engine', 'jade');
	app.use(express.cookieParser());
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(app.router);
	app.use(express.static(__dirname + '/public'));
});

/*	var hashList	| { hash: page_id, ... } -tyyppinen lista sivuista
	var page_id		| halutun sivun ID
	var pages		| Lista sivuista
	var pagesList	| Generoitu lista sivuista. Tärkeimmät tiedot
	var tpage		| pages[page_id], generoitu täydelliset elementit
*/

/*				- var classes = "";
				- if (element.classes.length) classes = ".".element.classes.join(".");
				article#element!{classes}*/

var _templates = db.get(config,"templates");
for( i in _templates )
	templates[_templates[i].template_id] = _templates[i];

console.log("Starting to generate elements");
var _elements = db.get(config,"elements");
for( i in _elements ) { // Läpikäydään jokainen elementti
	// Jos perittävää templatea ei ole määritetty tai sitä ei ole, ohitetaan
	if ( templates[_elements[i].template_id] === undefined ) continue;

	var t = templates[_elements[i].template_id];

	if (_elements[i]["classes"] !== undefined) {
		if (t["classes"] !== undefined) _elements[i]["classes"] = _elements[i]["classes"].concat(t["classes"]);
	}

	for ( e  in t ) {// Läpikäydään jokainen templaten arvo 
		// Jos elementtiin ei ole asetettu jotain templaten arvoa, se asetetaan
		if ( _elements[i][e] === undefined ) _elements[i][e] = t[e];
	}

	if (_elements[i]["classes"].indexOf("element") === -1) _elements[i]["classes"].push("element");
	if (_elements[i]["classes"].indexOf(_elements[i].name) === -1) _elements[i]["classes"].push(_elements[i].name);
	
	// Ollaan generoitu, asetetaan element_id:n määrittämään paikkaan taulukkoonsa
	elements[_elements[i].element_id] = _elements[i];
} console.log("... ready!");


console.log("Starting to generate pages");
var _pages = db.get(config,"pages");
for( i in _pages ) {
	// Läpikäydään sivun elementit ja täydennetään ne
	for( e in _pages[i].elements )
		_pages[i].elements[e] = elements[_pages[i].elements[e]];

	_pages[i].hash = [];
	pages[_pages[i].page_id] = _pages[i];
}

console.log("Getting hashlist");

hashlist = db.get(config,"hashlist");
for( i in hashlist ) { // Läpikäydään kaikki hashit ja tehdään sivut tietoisiksi itsestään
	if (hashlist[i] === undefined) continue;
	pages[hashlist[i]]["hash"].push(i);
} console.log("... ready!");

renderMain = function(req, res) {
	if (hashlist[req.params.hash] === undefined ||
		pages[hashlist[req.params.hash]] === undefined) req.params.hash = "404";

	var hash    = req.params.hash,
		page_id = hashlist[hash],
		tpage   = pages[page_id];

	res.render("index", {	hashlist:      hashlist,
							block:         block,
							page_id:       page_id,
							tpage:         tpage,
							hash:          hash,
							noJavascript:  false
						});
};

app.get('/', function(req, res){ req.params.hash = "front"; renderMain(req, res); });
app.get('/:hash', renderMain);
