var assert = require('assert');
var expect = require('chai').expect;
var { PianoRoll } = require('../src/classes.js');
var {	initGain,
		readInNotes,
		scheduler,
		play,
		playAll,
		stopPlay,
		getCorrectLength,
		createNewInstrument 
} = require('../src/playback_functionality.js');

describe('testing functionality.js', function(){

	var pianoRoll;//, el;

	beforeEach(function(){
		pianoRoll = new PianoRoll();
		//el = document.createElement('div');
	});

	it('testing getCorrectLength', function(){
		
		// make sure pianoRoll has default tempo of 500 ms / beat (120 bpm)
		assert.equal(pianoRoll.currentTempo, 500);
		
		// check quarter note length at 120
		expect(getCorrectLength("quarter", pianoRoll)).to.equal(500);
		
	});

});