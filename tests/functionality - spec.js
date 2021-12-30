var expect = require('chai').expect;

var { 
    Instrument, 
    PianoRoll,
    PriorityQueue,
} = require('../src/classes.js');

var {    
    initGain,
    readInNotes,
    getMinGainNodes,
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
        global.currNote = null; // these vars are supposed to be global vars atm. :|
        global.PriorityQueue = PriorityQueue; // hmmmm :/
        
        pianoRoll = new PianoRoll();
    });

    it('testing getCorrectLength', function(){
        // make sure pianoRoll has default tempo of 250 ms per eigth note
        expect(pianoRoll.currentTempo).to.equal(250);
        
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
        expect(pianoRoll.isPlaying).to.be.false;
        expect(pianoRoll.timers.length).to.equal(0);
    });
    
    describe('testing getMinGainNodes', function(){
        it('test getMinGainNodes 1', function(){
            var instrument = new Instrument("Instrument 1", {}, []);

            // TODO: test w/ Cypress for getNotesStartAndEnd AND getNumGainNodesPerInstrument
            expect(
                getMinGainNodes([{start: 60, end: 100}, {start: 60, end: 120}])
            ).to.equal(2);
        });
        
        it('test getMinGainNodes 2', function(){
            var instrument = new Instrument("Instrument 1", {}, []);
            expect(
                getMinGainNodes([
                    {start: 60, end: 100}, 
                    {start: 60, end: 120}, 
                    {start: 80, end: 120},
                ])
            ).to.equal(3);
        });
        
        it('test getMinGainNodes 3', function(){
            var instrument = new Instrument("Instrument 1", {}, []);
            expect(
                getMinGainNodes([
                    {start: 60, end: 100}, 
                    {start: 100, end: 140},
                ])
            ).to.equal(1);
        });
        
        it('test getMinGainNodes 4', function(){
            var instrument = new Instrument("Instrument 1", {}, []);
            expect(
                getMinGainNodes([
                    {start: 10940, end: 11020}, 
                    {start: 10940, end: 10960},
                    {start: 10980, end: 11000},
                    {start: 11020, end: 11040},
                ])
            ).to.equal(2);
        });
        
    });
    
    /* probably not a great idea since we really need a working DOM to
    // test correctness. this is probably best tested in an e2e setting but just trying it out
    it('testing getNumGainNodesPerInstrument', function(){
        // mock some functions first (this is actually not needed in the case of a single note (or a single chord))
        // having these messes up subsequent tests though as well.
        //document.getElementById = function(element){
        //    return {
        //        style: {
        //            width: '40px'
        //        }
        //    };
        //}
        
        //getNotePosition = function(element){
        //    return 60;
        //}
        
        var instrument = new Instrument("Instrument 1", {}, []);
        instrument.notes = [
            [
                {freq: 3729.31, duration: 250, block: {id: 'note0', volume: '0.2', style: 'default'}},
                {freq: 440.0, duration: 250, block: {id: 'note1', volume: '0.2', style: 'default'}}
            ], // this represents a single chord
        ];
        
        var instrumentNotePointers = [0];
    
        var res = getNumGainNodesPerInstrument([instrument], instrumentNotePointers);
        //console.log(res);
        
        expect(typeof(res)).to.equal('object');
        expect(res[0]).to.equal(2);
    });*/
    
});
    