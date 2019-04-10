var assert = require('assert');
var expect = require('chai').expect;
var { replaceSharp, appendDummyElement, buildGrid, buildGridHeader } = require('../scripts/grid_builder.js');
var { PianoRoll } = require('../scripts/classes.js');

describe('testing grid_builder.js', function(){
	
	var pianoRoll, el;
	
	beforeEach(function(){
		pianoRoll = new PianoRoll();
		el = document.createElement('div');
	});
  
	it('testing replaceSharp', function(){
		/*
		* cases: "F#5","F5","Eb5"
		*/
		var str = "F#5";
		assert.equal(str.indexOf('#'), 1);
		str = replaceSharp(str);
		assert.equal(str.indexOf('#'), -1);
		
		str = "F5";		
		assert.equal(str.indexOf('#'), -1);
		str = replaceSharp(str);
		assert.equal(str.indexOf('#'), -1);
		
		str = "Eb5";
		assert.equal(str.indexOf('#'), -1);
		str = replaceSharp(str);
		expect(str.indexOf('#')).to.equal(-1);
	}); 
	
	it('testing appendDummyElement', function(){
		el.id = 'testElement';
		document.body.appendChild(el);
		expect(document.getElementById(el.id).children.length).to.equal(0);
		appendDummyElement(el);
		expect(document.getElementById(el.id).children.length).to.equal(1);
		expect(document.getElementById(el.id).children[0].id).to.equal(el.id + "_dummy");
	});
	
	it('testing buildGridHeader', function(){
		el.id = "columnHeaderRow";
		document.body.appendChild(el);
		buildGridHeader(el.id, pianoRoll);
		// expect 34 elements in the header: 8 cells * 4 measures = 32 + 1 for the piano keys + 1 dummy element
		// why do we need a dummy element again?
		expect(document.getElementById(el.id).children.length).to.equal(34);
	});
	
	// 61 unique notes for current config 
	it('testing buildGrid', function(){
		el.id = "piano";
		document.body.appendChild(el);
		
		// pianoNotes is a separate div from piano 
		var pianoNotes = document.createElement('div');
		pianoNotes.id = "pianoNotes";
		document.body.appendChild(pianoNotes);
		
		buildGrid(el.id, pianoRoll);
		
		// there should be a row (div) for each note, + the pianoNotes div 
		// the pianoNotes div should have n children, where n = number of unique notes
		var numUniqueNotes = 61; //Object.keys(pianoRoll.noteFrequencies).length;
		expect(document.getElementById(el.id).children.length).to.equal(numUniqueNotes);
		expect(document.getElementById(pianoNotes.id).children.length).to.equal(numUniqueNotes);
	});
	
 
});