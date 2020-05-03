var assert = require('assert');
var expect = require('chai').expect;
var { 	PianoRoll,
		Instrument,
		Note,
		ElementNode
} = require('../src/classes.js');

describe('testing classes.js', function(){
	
	it('testing PianoRoll class', function(){
		var pianoRoll = new PianoRoll()
		assert(pianoRoll.numberOfMeasures === 4);
	});
	
	it('testing Instrument class', function(){
		var name = 'test';
		var dummyGain = {};
		var notesArr = [];
		var instrument = new Instrument(name, dummyGain, notesArr);
		assert(instrument.volume === 0.2);
		assert(instrument.name === 'test');
		assert(instrument.onionSkinOn === true);
	});
	
	it('testing ElementNode class', function(){
		var el = document.createElement('div');
		el.setAttribute("volume", .5);
		el.setAttribute("type", "legato");
		el.id = "test";
		
		var elNode = new ElementNode(el);
		assert(elNode.id === el.id);
		assert(elNode.volume === el.getAttribute("volume"));
		assert(elNode.style === el.getAttribute("type"));
	});
	
	it('testing Note class', function(){
		var freq = 100;
		var duration = 100;
		
		var el = document.createElement('div');
		el.setAttribute("length", 5);
		el.setAttribute("volume", .5);
		el.setAttribute("type", "legato");
		el.id = "test";
		
		var note = new Note(freq, duration, el);
		assert(note.freq === freq);
	});
	
	
});