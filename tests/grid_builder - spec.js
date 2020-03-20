var assert = require('assert');
var expect = require('chai').expect;
var { replaceSharp, buildGrid, buildGridHeader, highlightHeader } = require('../src/gridBuilder.js');
var { PianoRoll } = require('../src/classes.js');

describe('testing gridBuilder.js', function(){
	
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
	
	it('testing buildGridHeader', function(){
		el.id = "columnHeaderRow";
		document.body.appendChild(el);
		buildGridHeader(el.id, pianoRoll);
		// expect 33 elements in the header: 8 cells * 4 measures = 32 + 1 for the piano keys

		expect(document.getElementById(el.id).children.length).to.equal(33);
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
	 
	it('testing highlightHeader', function(){
		el.id = "columnHeaderRow";
		document.body.appendChild(el);
		buildGridHeader(el.id, pianoRoll);
		
		expect(document.getElementById("col_1").style.backgroundColor).to.equal("");
		highlightHeader("col_1", pianoRoll);
		expect(pianoRoll.playMarker).to.equal("col_1");
		expect(document.getElementById("col_1").style.backgroundColor).to.equal("rgb(50, 205, 50)");
		
		// as an integration test later simulate a click on another header column 
		// and check that the previous one does not have a colored background anymore
		// and make sure the right element is highlighted
	});
	
 
});