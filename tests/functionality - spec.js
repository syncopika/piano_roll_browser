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
} = require('../src/playbackFunctionality.js');

describe('testing playbackFunctionality.js', function(){

	var pianoRoll;

	beforeEach(function(){
		global.lastNote = null;
		global.currNote = null; // these vars are supposed to be global vars. :|
		pianoRoll = new PianoRoll();
	});

	it('testing getCorrectLength', function(){
		// make sure pianoRoll has default tempo of 250 ms per eigth note
		assert.equal(pianoRoll.currentTempo, 250);
		
		// check quarter note length (we're assuming an 8th note has length of 40px)
		var quarter = 80;
		expect(getCorrectLength(quarter, pianoRoll)).to.equal(500);
		
		// check eighth note at 120bpm
		expect(getCorrectLength(40, pianoRoll)).to.equal(250);
		
		// check 16th note at 120bpm
		expect(getCorrectLength(20, pianoRoll)).to.equal(125);
	});	

	it('testing stopPlay', function(){
		stopPlay(pianoRoll);
		assert(pianoRoll.isPlaying === false);
		assert(pianoRoll.timers.length === 0);
	});

});