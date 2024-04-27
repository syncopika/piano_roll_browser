const assert = require('assert');
const expect = require('chai').expect;
const {     
  PianoRoll,
  Instrument,
  Note,
  ElementNode,
  PriorityQueue,
} = require('../src/classes.js');

describe('testing classes.js', function(){
    
  it('testing PianoRoll class', function(){
    const pianoRoll = new PianoRoll();
    expect(pianoRoll.numberOfMeasures).to.equal(4);
    expect(pianoRoll.currentTempo).to.equal(250);
    expect(pianoRoll.subdivision).to.equal(8);
    expect(pianoRoll.timeSignature).to.equal("4/4");
    expect(pianoRoll.audioContext).to.be.undefined;
    expect(pianoRoll.init).to.not.be.undefined;
        
    // check note styles
    expect(Object.keys(pianoRoll.defaultNoteStyles).length).to.equal(4);
        
    // check default instruments
    expect(Object.keys(pianoRoll.defaultInstrumentSounds).length).to.equal(6);
        
    // check note size map (i.e. 8th, 16th, 32nd mapped to their cell size in px)
    expect(Object.keys(pianoRoll.noteSizeMap).length).to.equal(3);
  });
    
  it('testing Instrument class', function(){
    const name = 'test';
    const dummyGain = {};
    const notesArr = [];
    const instrument = new Instrument(name, dummyGain, notesArr);
    expect(instrument.volume).to.equal(0.2);
    expect(instrument.name).to.equal('test');
    expect(instrument.onionSkinOn).to.be.true;
    expect(instrument.isMute).to.be.false;
    expect(instrument.noteColorStart).to.not.be.undefined;
    expect(instrument.noteColorEnd).to.not.be.undefined;
  });
    
  it('testing ElementNode class', function(){
    const el = document.createElement('div');
    el.setAttribute("data-volume", .5);
    el.setAttribute("data-type", "legato");
    el.id = "test";
        
    const elNode = new ElementNode(el);
    expect(elNode.id).to.equal(el.id);
    expect(elNode.volume).to.equal(el.dataset.volume);
    expect(elNode.style).to.equal(el.dataset.type);
  });
    
  it('testing Note class', function(){
    const freq = 100;
    const duration = 100;
        
    const el = document.createElement('div');
    el.setAttribute("data-length", 5);
    el.setAttribute("data-volume", .5);
    el.setAttribute("data-type", "legato");
    el.id = "test";
        
    const note = new Note(freq, duration, el);
    expect(note.freq).to.equal(freq);
  });

  describe('testing priority queue (min heap)', function(){
    it('priority queue creation', function(){
      const pq = new PriorityQueue();
      expect(pq).to.not.be.null;
      expect(pq.array.length).to.equal(0);
      expect(pq.lastIndex).to.equal(0);
      expect(pq.remove()).to.be.null;
    });
        
    it('priority queue works', function(){
      const pq = new PriorityQueue();
      pq.add(5);
      pq.add(100);
      pq.add(3);
      pq.add(1);
            
      expect(pq.array.length).to.equal(4);
      expect(pq.peek()).to.equal(1);
      expect(pq.lastIndex).to.equal(4);
      expect(pq.size).to.equal(4);
            
      let smallest = pq.remove();
      expect(smallest).to.equal(1);
      expect(pq.peek()).to.equal(3);
      expect(pq.lastIndex).to.equal(3);
      expect(pq.size).to.equal(3);
      expect(pq.array.length).to.equal(4); //we're not actually removing anything so the length won't decrease
            
      smallest = pq.remove();
      expect(smallest).to.equal(3);
      expect(pq.lastIndex).to.equal(2);
            
      smallest = pq.remove();
      expect(smallest).to.equal(5);
            
      expect(pq.peek()).to.equal(100);
      expect(pq.array.length).to.equal(4);
      expect(pq.lastIndex).to.equal(1);
            
      pq.add(2);
      expect(pq.peek()).to.equal(2);
      expect(pq.lastIndex).to.equal(2);
            
      pq.remove();
      pq.remove();
      expect(pq.lastIndex).to.equal(0);
      expect(pq.size).to.equal(0);
      expect(pq.remove()).to.be.null;
    });
  });
    
});