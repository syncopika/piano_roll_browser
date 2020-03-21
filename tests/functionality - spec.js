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
		// make sure pianoRoll has default tempo of 500 ms / beat (120 bpm)
		assert.equal(pianoRoll.currentTempo, 500);
		
		// check quarter note length at 120bpm
		expect(getCorrectLength("quarter", pianoRoll)).to.equal(500);
		
		// check eighth note length at 120bpm
		expect(getCorrectLength("eighth", pianoRoll)).to.equal(250);
		
		// check 16th note length at 120bpm
		expect(getCorrectLength("sixteenth", pianoRoll)).to.equal(125);
	});
	

	it('testing stopPlay', function(){
		stopPlay(pianoRoll);
		assert(pianoRoll.isPlaying === false);
		assert(pianoRoll.timers.length === 0);
		assert(pianoRoll.currentInstrumentNoteQueue.length === 0);
	});

});