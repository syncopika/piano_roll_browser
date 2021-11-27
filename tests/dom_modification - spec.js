var assert = require('assert');
var expect = require('chai').expect;
var { PianoRoll, Instrument } = require('../src/classes.js');
var { buildGrid } = require('../src/gridBuilder.js');
var { 
    addNote, 
    createNewNoteElement, 
    highlightRow,
    getSubdivisionPositions,
} = require('../src/domModification.js');

describe('testing domModification.js', function(){

    var pianoRoll, container;

    beforeEach(function(){
        global.lastNote = null;
        global.currNote = null; // these vars are supposed to be global vars. :|
        pianoRoll = new PianoRoll();
        //pianoRoll.init(); // have some mocking to do (i.e. audiocontext)
        
        // create an instrument
        var initialInstrument = new Instrument("Instrument 1", {}, []);
        pianoRoll.instruments.push(initialInstrument);
        pianoRoll.currentInstrument = pianoRoll.instruments[0];
        
        container = document.createElement('div');
    });
    
    it('testing getSubdivisionPositions with lock size == 16th note', function(){
       expect(pianoRoll.lockNoteSize).to.equal("16th");
       
       // the first column grid cell should have an offset of 60
       var gridCell = {style: {width: "40px"}, getBoundingClientRect: function(){return {left: 60}}};
       var possiblePositions = getSubdivisionPositions(gridCell, pianoRoll);
       
       expect(possiblePositions.length).to.equal(3);
       expect(possiblePositions[0]).to.equal(60);
       expect(possiblePositions[1]).to.equal(80);
       expect(possiblePositions[2]).to.equal(100);
    });
    
    it('testing createNewNoteElement', function(){
        var newNote = createNewNoteElement(pianoRoll);
        assert(newNote !== undefined);
        assert(newNote.style.zIndex == 100);
    });
    
    it('testing highlightRow', function(){
        // setting up pianoNotes is necessary
         var pianoNotes = document.createElement('div');
        pianoNotes.id = "pianoNotes";
        document.body.appendChild(pianoNotes);
        
        container.id = "piano2";
        document.body.appendChild(container);
        buildGrid(container.id, pianoRoll); 
        
        var target = document.getElementById('C8col_0');
        
        highlightRow(target.id, 'rgb(0, 255, 255)');
        
        assert(target.parentNode.style.backgroundColor === 'rgb(0, 255, 255)');
        
        document.body.removeChild(pianoNotes);
        document.body.removeChild(container);        
    });
    
    /* TODO: need to mock some stuff first. also might need to add column headers first (integration testing?)
    it('testing addNote', function(){
        container.id = "piano2";
        document.body.appendChild(container);
        
        // pianoNotes is a separate div from piano, which is necessary 
         var pianoNotes = document.createElement('div');
        pianoNotes.id = "pianoNotes";
        document.body.appendChild(pianoNotes);

        buildGrid(container.id, pianoRoll); 
        
        var target = document.getElementById('C8col_0');
        addNote("note", pianoRoll, {'target': target, 'x': target.getBoundingClientRect().x, 'y': target.getBoundingClientRect().y});
        //console.log(target.style.zIndex);
        
        document.body.removeChild(container);
        document.body.removeChild(pianoNotes);
    });
    */

});