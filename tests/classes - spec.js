var assert = require('assert');
var expect = require('chai').expect;
var {     
    PianoRoll,
    Instrument,
    Note,
    ElementNode
} = require('../src/classes.js');

describe('testing classes.js', function(){
    
    it('testing PianoRoll class', function(){
        var pianoRoll = new PianoRoll()
        assert(pianoRoll.numberOfMeasures === 4);
        assert(pianoRoll.currentTempo === 250);
        assert(pianoRoll.subdivision === 8);
        assert(pianoRoll.timeSignature === "4/4");
        assert(pianoRoll.audioContext === undefined);
        assert(pianoRoll.init !== undefined);
        
        // check note styles
        assert(Object.keys(pianoRoll.defaultNoteStyles).length === 4);
        
        // check default instruments
        assert(Object.keys(pianoRoll.defaultInstrumentSounds).length === 6);
        
        // check note size map (i.e. 8th, 16th, 32nd mapped to their cell size in px)
        assert(Object.keys(pianoRoll.noteSizeMap).length === 3);
    });
    
    it('testing Instrument class', function(){
        var name = 'test';
        var dummyGain = {};
        var notesArr = [];
        var instrument = new Instrument(name, dummyGain, notesArr);
        assert(instrument.volume === 0.2);
        assert(instrument.name === 'test');
        assert(instrument.onionSkinOn === true);
        assert(instrument.isMute === false);
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