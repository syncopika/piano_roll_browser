const assert = require('assert');
const expect = require('chai').expect;
const { PianoRoll, Instrument } = require('../src/classes.js');
const { buildGrid } = require('../src/gridBuilder.js');
const { 
  addNote, 
  createNewNoteElement, 
  highlightRow,
  getSubdivisionPositions,
  canPlaceNote,
  clearGrid,
} = require('../src/domModification.js');

describe('testing domModification.js', function(){

  let pianoRoll, container;

  beforeEach(function(){
    global.lastNote = null;
    global.currNote = null; // these vars are supposed to be global vars. :|
    pianoRoll = new PianoRoll();
    //pianoRoll.init(); // have some mocking to do (i.e. audiocontext)
        
    // create an instrument
    const initialInstrument = new Instrument("Instrument 1", {}, []);
    pianoRoll.instruments.push(initialInstrument);
    pianoRoll.currentInstrument = pianoRoll.instruments[0];
        
    container = document.createElement('div');
  });
    
  it('testing getSubdivisionPositions with lock size == 16th note', function(){
    expect(pianoRoll.lockNoteSize).to.equal("16th");
    expect(pianoRoll.noteSizeMap[pianoRoll.lockNoteSize]).to.equal(20);
       
    // the first column grid cell should have an offset of 60
    const gridCell = {style: {width: "40px"}, getBoundingClientRect: function(){return {left: 60};}}; // mock a grid cell element
    const possiblePositions = getSubdivisionPositions(gridCell, pianoRoll);
       
    expect(possiblePositions.length).to.equal(3);
    expect(possiblePositions[0]).to.equal(60);
    expect(possiblePositions[1]).to.equal(80);
    expect(possiblePositions[2]).to.equal(100);
  });
    
  it('testing getSubdivisionPositions with lock size == 32nd note', function(){
    pianoRoll.lockNoteSize = "32nd";
    expect(pianoRoll.lockNoteSize).to.equal("32nd");
    expect(pianoRoll.noteSizeMap[pianoRoll.lockNoteSize]).to.equal(10);
       
    // the first column grid cell should have an offset of 60
    const gridCell = {style: {width: "40px"}, getBoundingClientRect: function(){return {left: 60};}};
    const possiblePositions = getSubdivisionPositions(gridCell, pianoRoll);
       
    expect(possiblePositions.length).to.equal(5);
    expect(possiblePositions[0]).to.equal(60);
    expect(possiblePositions[1]).to.equal(70);
    expect(possiblePositions[2]).to.equal(80);
    expect(possiblePositions[3]).to.equal(90);
    expect(possiblePositions[4]).to.equal(100);
  });
    
  it('testing canPlaceNote', function(){
    // mock child elements of a grid cell (e.g. notes that already exist within a cell)
    // in this case we have a note at pos with x=60 so another note should not be able to be placed there
    // we also have an onion-skinned note@ x=70 which belongs to another instrument, so we can still place a 
    // note for the current instrument at that same position
    const children = [
      {style: {opacity: 1}, getBoundingClientRect: function(){return {left: 60};}},
      {style: {opacity: 0.5}, getBoundingClientRect: function(){return {left: 70};}},
    ];
       
    expect(canPlaceNote(60, children)).to.equal(false);
    expect(canPlaceNote(70, children)).to.equal(true);
    expect(canPlaceNote(80, children)).to.equal(true);
  });
    
  it('testing createNewNoteElement', function(){
    const newNote = createNewNoteElement(pianoRoll);
    assert(newNote !== undefined);
    assert(newNote.style.zIndex == 100);
  });
    
  it('testing highlightRow', function(){
    // setting up pianoNotes is necessary
    const pianoNotes = document.createElement('div');
    pianoNotes.id = "pianoNotes";
    document.body.appendChild(pianoNotes);
        
    container.id = "piano2";
    document.body.appendChild(container);
    buildGrid(container.id, pianoRoll); 
        
    const target = document.getElementById('C8col_0');
        
    highlightRow(target.id, 'rgb(0, 255, 255)');
        
    assert(target.parentNode.style.backgroundColor === 'rgb(0, 255, 255)');
        
    document.body.removeChild(pianoNotes);
    document.body.removeChild(container);        
  });
    
  it('testing clearGrid', function(){
    clearGrid(pianoRoll.currentInstrument);
    expect(Object.keys(pianoRoll.currentInstrument.activeNotes).length).to.equal(0);
    expect(pianoRoll.currentInstrument.notes.length).to.equal(0);
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