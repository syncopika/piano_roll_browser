var assert = require('assert');
var expect = require('chai').expect;
var { Instrument, PianoRoll } = require('../src/classes.js');
var {    
    initGain,
    readInNotes,
    stopPlay,
    getCorrectLength,
    getNumGainNodesPerInstrument,
    getNotePosition,
    createNewInstrument,
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
    
    // probably not a great idea since we really need a working DOM to
    // test correctness. this is probably best tested in an e2e setting but just trying it out
    it('testing getNumGainNodesPerInstrument', function(){
        // mock some functions first (this is actually not needed in the case of a single note (or a single chord))
        // having these messes up subsequent tests though as well.
        /*
        document.getElementById = function(element){
            return {
                style: {
                    width: '40px'
                }
            };
        }
        
        getNotePosition = function(element){
            return 60;
        }
        */
        
        var instrument = new Instrument("Instrument 1", {}, []);
        instrument.notes = [
            [
                {freq: 3729.31, duration: 250, block: {id: 'note0', volume: '0.2', style: 'default'}},
                {freq: 440.0, duration: 250, block: {id: 'note1', volume: '0.2', style: 'default'}}
            ],
        ];
        
        var instrumentNotePointers = [0];
    
        var res = getNumGainNodesPerInstrument([instrument], instrumentNotePointers);
        //console.log(res);
        
        expect(typeof(res)).to.equal('object');
        expect(res[0]).to.equal(2);
    });
    
});