/************

these functions control functionality such as:

- note reading/scheduling/playback
- play/stop/record
- clicking notes

relies on PianoRoll object in classes.js 

************/

// TODO: move elsewhere? like under Piano Roll?
// create a new gain object
// @param context: an AudioContext instance
function initGain(context){
  const newGain = context.createGain();
  // set gain to 0 initially so no sound will be heard 
  newGain.gain.setValueAtTime(0.0, 0.0);
  return newGain;
}

// plays the corresponding pitch of a block when clicked 
// @param id: an HTML element id 
// @param waveType: a string representing the sound type (i.e. sine, triangle, etc.)
// @param volume: a float number representing the volume that the note should sound
// @param pianoRollObject: an instance of PianoRoll
function clickNote(id, waveType, volume, pianoRollObject){
  // resume the context per the Web Audio autoplay policy 
  pianoRollObject.audioContext.resume().then(() => {
    if(waveType === "percussion"){
      clickPercussionNote(id, volume, pianoRollObject);
    }else if(waveType === "piano"){
      clickPianoNote(id, volume, pianoRollObject);
    }else{
      const parent = document.getElementById(id).parentNode.id.replace('s', '#'); // replace any 's' with '#' so we can match a key in noteFrequencies
      const now = pianoRollObject.audioContext.currentTime;
            
      if(pianoRoll.instrumentPresets[waveType]){
        // custom intrument preset!
        onClickCustomPreset(pianoRollObject, waveType, volume, parent);
      }else{    
        // create a new oscillator just for this note
        const osc = pianoRollObject.audioContext.createOscillator();
        osc.type = waveType;
        osc.frequency.setValueAtTime(pianoRollObject.noteFrequencies[parent], 0);
                
        // borrow the currentInstrument's gain node 
        const gain = pianoRollObject.currentInstrument.gain;
                
        // setup the StereoPannerNode
        const panNode = pianoRollObject.audioContext.createStereoPanner();
        const panVal = pianoRollObject.currentInstrument.pan;
        osc.connect(panNode);
        panNode.connect(gain);
        panNode.pan.setValueAtTime(panVal, now);
                
        // set volume
        gain.gain.setTargetAtTime(volume, now, 0.002);
        osc.start(0);
                
        // silence the oscillator 
        gain.gain.setTargetAtTime(0.0, now + 0.080, 0.002);
        osc.stop(now + .100);
      }
    }
  });
}

function clickPercussionNote(id, volume, pianoRollObject){
  const parent = document.getElementById(id).parentNode.id.replace('s', '#');
  const context = pianoRollObject.audioContext;
  const gain = pianoRollObject.currentInstrument.gain;
  const now = pianoRollObject.audioContext.currentTime;
  const octave = parseInt(parent.match(/[0-9]/g)[0]);
    
  if(octave >= 2 && octave <= 4){
    // kick drum 
    pianoRollObject.PercussionManager.kickDrumNote(pianoRollObject.noteFrequencies[parent], volume, now, false);        
  }else if(octave === 5){
    // snare drum 
    pianoRollObject.PercussionManager.snareDrumNote(pianoRollObject.noteFrequencies[parent], volume, now, false);        
  }else{
    // hi-hat 
    pianoRollObject.PercussionManager.hihatNote(volume, now, false);
  }
}

function clickPianoNote(id, volume, pianoRollObject){
  const noteName = document.getElementById(id).parentNode.id.split("col")[0]; // get the note name, i.e. D7, Ds6
  const context = pianoRollObject.audioContext;
  const gain = pianoRollObject.currentInstrument.gain;
  const now = pianoRollObject.audioContext.currentTime;
  const noteDataBuf = pianoRollObject.PianoManager.noteMap[noteName].buffer;
    
  const newNoteBufferNode = context.createBufferSource();
  newNoteBufferNode.buffer = noteDataBuf;
    
  // setup the StereoPannerNode
  const panNode = pianoRollObject.audioContext.createStereoPanner();
  const panVal = pianoRollObject.currentInstrument.pan;
  newNoteBufferNode.connect(panNode);
  panNode.connect(gain);
  panNode.pan.setValueAtTime(panVal, now);
    
  // set volume (the piano notes are quiet so they need to be amplified a bit more)
  gain.gain.setTargetAtTime(volume*4, now, 0.002);
  newNoteBufferNode.start(0);
    
  // silence the oscillator 
  gain.gain.setTargetAtTime(0.0, now + 0.300, 0.002);
  newNoteBufferNode.stop(now + .300);
}


// sort an instrument's notes by position 
// an instrument's activeNotes map is evaluated and a new map where the key 
// represents an x-position and each value is a list of notes at that position is generated 
// @param instrument: an instance of Instrument 
// @return: an object that maps positions to the notes at those positions
function sortNotesByPosition(instrument){
  // organize notes by position
  const positionMapping = {};
  for(const noteId in instrument.activeNotes){
    const note = instrument.activeNotes[noteId];
        
    if(note.style.left === ""){
      note.style.left = (getNotePosition(note) + "px");
    }
        
    const position = parseInt(note.style.left);
        
    if(positionMapping[position] === undefined){
      positionMapping[position] = [note];
    }else{
      positionMapping[position].push(note);
    }
  }

  return positionMapping;
}

// get an array of Note object arrays for an instrument 
// since chords are allowed and multiple notes may start at the same x-position,
// each array within the resulting array represents the note(s) at a position.
//
// @param instrument: an instance of Instrument 
// @param pianoRollObject: an instance of PianoRoll
// @return: an array of arrays containing Note objects
function readInNotes(instrument, pianoRollObject){
  const notePosMap = sortNotesByPosition(instrument);
  const tempo = pianoRollObject.currentTempo;
  const allNotes = [];

  const notePositions = Object.keys(notePosMap).sort(function(a, b){ return a - b; });
  notePositions.forEach(function(position){
    const notes = notePosMap[position]; // a list of at least 1 note
            
    // single note or not, just put them all in lists so it'll be easier to process in the scheduler
    const group = []; // these notes should be played at the same time 
        
    notes.forEach(function(note){
      const row = note.parentNode.parentNode.id;
      const freq = pianoRollObject.noteFrequencies[row.replace('s', '#')];
      const noteWidth = parseInt(note.style.width);
      group.push(new Note(freq, getCorrectLength(noteWidth, pianoRollObject), note));
    });
        
    allNotes.push(group);
  });
    
  // update active notes
  return allNotes;
}


// calculate length of note in milliseconds
// @param length: length in px 
// @param pianoRollObject: instance of PianoRoll
// @return: an integer representing the length of px in milliseconds
function getCorrectLength(length, pianoRollObject){
  const currentTempo = pianoRollObject.currentTempo;
  return Math.round((currentTempo / 40) * length); // 40 px == 1 eighth note.
}

// get the position of a note element
// @param noteElement: an HTML element of a note 
// @return: a float value representing the position of the note element
function getNotePosition(noteElement){
  const scrollOffset = document.getElementById("piano").scrollLeft; // TODO: pass in scrollLeft rather than hardcode element here?
  return noteElement.getBoundingClientRect().left + scrollOffset;
}

/*** 
    
    scheduler helper functions
    
***/
// get the note start and end positions for each note.
// @param instrumentNotes: an array of arrays representing the notes
// @return: an array of objects representing the notes, each containing 
//          the attributes start and end for the start and end positions of the note
function getNotesStartAndEnd(instrumentNotes){
  const notes = [];
  instrumentNotes.forEach((noteGroup) => {
    noteGroup.forEach(note => {
      const n = document.getElementById(note.block.id);
      const startPos = getNotePosition(n);
      notes.push({
        start: startPos,
        end: startPos + parseInt(n.style.width),
      });
    });
  });
  return notes;
}

// uses a priority queue to figure out the minimum number of gain nodes
// needed to play all the notes of an instrument
// @param notesStartAndEnd: an array of objects representing the notes, each containing 
//                          the attributes start and end for the start and end positions 
//                          of the note
// @return: an integer representing the minimum number of gain nodes needed
function getMinGainNodes(notesStartAndEnd){
  let minNumGainNodes = 1;
    
  const pq = new PriorityQueue();
    
  if(notesStartAndEnd.length > 1){
    pq.add(notesStartAndEnd[0].end);
    for(let i = 1; i < notesStartAndEnd.length; i++){
      if(pq.peek() <= notesStartAndEnd[i].start){
        pq.remove();
      }
            
      pq.add(notesStartAndEnd[i].end);
    }
    minNumGainNodes = pq.size;
  }
    
  return minNumGainNodes;
}

// figure out for each instrument the minimum number of gain nodes (which is also the num of oscillator nodes) we need 
// in order to minimize the number of nodes we need to create since that adds performance overhead
// see /notes directory
//
// @param instruments: a map of instrument indexes to instruments
// @param instrumentNotePointers: an array where each index corresponds to an instrument 
//                                and at each index is a number representing the index of the instrument's note to start playing at
// @return: a map where key: instrument index, value: total number of nodes needed for that instrument
function getNumGainNodesPerInstrument(instruments, instrumentNotePointers){
  const numGainNodePerInst = {};
    
  for(const instIndex in instruments){
    const start = instrumentNotePointers[instIndex];
    const notes = instruments[instIndex].notes.slice(start); // the notes should already be sorted in order
    const notesStartAndEnd = getNotesStartAndEnd(notes);
        
    numGainNodePerInst[instIndex] = getMinGainNodes(notesStartAndEnd);
  }
    
  return numGainNodePerInst;
}

// add the appropriate number of gain nodes and oscillator nodes for each instrument.
// we can then reuse these nodes instead of making new ones for every single note, which is unnecessary.
// especially if we have a lot of notes that aren't part of chords and can be used with just one gain node and oscillator.
// but need to be careful here! if we import a custom preset, we may be importing a network of nodes (that can be reused).
// we can still maintain a 1:1 gain to route relationship but instead of the usual case where we have 1 gain for a route, we 
// have one network of nodes (with maybe 2 gain nodes) for a route.
//
// @param pianoRollObject: an instance of PianoRoll
// @param numGainNodePerInst: a map of instrument index to the number of nodes needed for that instrument
// @param instrumentGainNodes: a map where each key is the index of an instrument and each value will be an array of gain nodes
// @param instrumentOscNodes: a map where each key is the index of an instrument and each value will be an array of oscillator nodes
function addNodesPerInstrument(pianoRollObject, numGainNodePerInst, instrumentGainNodes, instrumentOscNodes){
  let gainCount = 0;
  let oscCount = 0;

  for(const instIndex in numGainNodePerInst){
    instrumentGainNodes[instIndex] = [];
    instrumentOscNodes[instIndex] = [];

    // this is the somewhat tricky part. if we have a custom instrument preset,
    // instead of just making 1 gain and 1 osc, we need to create an instance of that preset 
    // and take its gain nodes and osc nodes and add them as lists to the above lists. 
    // so in the end we should have a list of lists for gain and osc nodes 
    for(let i = 0; i < numGainNodePerInst[instIndex]; i++){
      var newGainNodes;
      var newOscNodes;
      const currInst = pianoRollObject.instruments[instIndex];
            
      if(pianoRollObject.instrumentPresets[currInst.waveType]){
        // handle custom instrument presets
        const presetData = pianoRollObject.instrumentPresets[currInst.waveType];
        const currPreset = createPresetInstrument(presetData, pianoRollObject.audioContext);
        const nodes = getNodesCustomPreset(currPreset);
                
        // note that these nodes are already connected
        newGainNodes = nodes.gainNodes;
        newOscNodes = nodes.oscNodes;

        newGainNodes.forEach((gain) => {
          gain.id = ("gain" + (gainCount++));
        });
                
        newOscNodes.forEach((osc) => {
          osc.id = ("osc" + (oscCount++));
        });
      }else{
        // only need 1 gain and 1 osc (with standard wave 'instruments')
        newGainNodes = [initGain(pianoRoll.audioContext)];
        newGainNodes[0].id = ("gain" + (gainCount++));
                
        newOscNodes = [pianoRoll.audioContext.createOscillator()];
        newOscNodes[0].id = ("osc" + (oscCount++));
                
        newOscNodes[0].connect(newGainNodes[0]);
      }
            
      instrumentGainNodes[instIndex].push(newGainNodes); // push an array of arrays (we want to maintain the node groups here) - a node group is responsible for playing a note as if it were one node 
      instrumentOscNodes[instIndex].push(newOscNodes);
      pianoRollObject.timers = pianoRollObject.timers.concat(newOscNodes);
    }
  }
}

// 'route' the notes i.e. assign them to the gain/osc nodes
// @param instruments: a map of instrument indexes to instruments
// @param instrumentNotePointers: an array where each index corresponds to an instrument 
//                                and at each index is a number representing the index of the instrument's note to start playing at
// @param instrumentGainNodes: a map of instrument index to an array of gain nodes for that instrument
// @param routes: a map of instrument index to another map of gain nodes (the routes) to the notes they need to play
// @param posTracker: a map of instrument index to another map where each key represents a gain node (a route)
//                    and each value is the end position of the last note assigned
function routeNotesToNodes(instruments, instrumentNotePointers, instrumentGainNodes, routes, posTracker){
  for(var instrumentIndex in instruments){
    const instrument = instruments[instrumentIndex];
        
    if(instrumentGainNodes[instrumentIndex] === undefined){
      // this instrument doesn't have any notes. skip it.
      continue;
    }
        
    routes[instrumentIndex] = {};
    posTracker[instrumentIndex] = {}; // stores the end position (i.e. start + note width) of the last note assigned to a gain node for an instrument
        
    for(let j = 0; j < instrumentGainNodes[instrumentIndex].length; j++){
      routes[instrumentIndex][j] = [];
      posTracker[instrumentIndex][j] = 0;
    }
        
    // use instrumentNotePointers to take into account the startMarker 
    const start = instrumentNotePointers[instrumentIndex];
    for(let index = start; index < instrument.notes.length; index++){
      const group = instrument.notes[index];
            
      group.forEach((note, noteIndex) => {
        const lastEndPositions = posTracker[instrumentIndex]; // this is a map!
        const htmlNote = document.getElementById(note.block.id);
        const notePos = getNotePosition(htmlNote);
        const startPosCurrNote = notePos;
        const endPosCurrNote = notePos + parseInt(htmlNote.style.width);
        const gainNodeRoutes = instrumentGainNodes[instrumentIndex];
                
        // try each gain node in the map to see if they can handle this note. i.e. if another note should be playing for this gain 
        // while this current note is supposed to start, then this gain node cannot support this current note.
        // there should always be a possible gain node route option available
        for(let j = 0; j < gainNodeRoutes.length; j++){
          if(lastEndPositions[j] <= startPosCurrNote){
            // we can use this gain node!
            routes[instrumentIndex][j].push(note); // assign this note to the gain node
            lastEndPositions[j] = endPosCurrNote;  // log its ending position 
            break;
          }
        }
      });
    }
  }
}

// preprocess the nodes further by figuring out how long each note should be and its start/stop times
// note that we should NOT actually stop any oscillators because we will reuse them; they should just be set to 0 freq and 0 gain when they should not be playing
// combine all notes of each instrument into an array. each element will be a map of note properties and the osc node for that note.
//
// @param routes: an object where each key is an instrument index mapped to a map of gain nodes mapped to the notes those gain nodes are responsible for playing. 
// @param pianoRollObject: instance of PianoRoll
// @param instrumentGainNodes: a map of instrument to gain nodes
// @param instrumentOscNodes: a map of instrument to osc nodes
// @return: an object with each key being an isntrument index and each value being a list of note configurations (which are objects)
function configureInstrumentNotes(routes, pianoRollObject, instrumentGainNodes, instrumentOscNodes){
  const allNotesPerInstrument = {};
    
  for(var instIndex in routes){
    allNotesPerInstrument[instIndex] = [];
        
    const instrumentRoutes = routes[instIndex];
    const currInstGainNodes = instrumentGainNodes[instIndex]; // this is a list of lists!
    const currInstOscNodes = instrumentOscNodes[instIndex];   // this is a list of lists!
    let gainIndex = 0;
        
    for(const route in instrumentRoutes){
      const notes = instrumentRoutes[route];
      const gainsToUse = currInstGainNodes[gainIndex];
      const oscsToUse = currInstOscNodes[gainIndex];
            
      // hook up gain to the correct destination
      gainsToUse.forEach((gain) => {
        // take into account the current instrument's panning
        const panNode = pianoRollObject.audioContext.createStereoPanner();
        const panVal = pianoRollObject.instruments[instIndex].pan;
        gain.connect(panNode);
                
        if(pianoRollObject.recording){
          panNode.connect(pianoRollObject.audioContextDestMediaStream);
        }
                
        if(pianoRollObject.showVisualizer){
          panNode.connect(pianoRollObject.analyserNode);
        }else{
          panNode.connect(pianoRollObject.audioContextDestOriginal);
        }
                
        // set pan node value
        panNode.pan.setValueAtTime(panVal, 0.0);
                
        // silence gains initially
        // yes, this part is necessary (don't know the exact details but it makes sure the audio can start normally, otherwise
        // you get an awful blast of sound without it). but - for custom presets, we wipe out their gain values (i.e. a preset may
        // have multiple gain nodes, each mapping to a specific wave sound and so they need to keep those values). we need to keep
        // these values somewhere to refer to when scaling the volume.
        gain.gain.setValueAtTime(0.0, 0.0);
      });
            
      let timeOffsetAcc = 0; // time offset accumulator so we know when notes need to start relative to the beginning of the start of playing
      for(let i = 0; i < notes.length; i++){
        const thisNote = notes[i]; 
        const volume = thisNote.freq > 0.0 ? parseFloat(thisNote.block.volume) : 0.0;
                
        // by default, 70% of the note duration should be played 
        // the rest of the time can be devoted to the spacer 
        var realDuration;
        if(thisNote.block.style === "staccato"){
          realDuration = (0.50 * thisNote.duration) / 1000;
        }else if(thisNote.block.style === "legato"){
          realDuration = (0.95 * thisNote.duration) / 1000;
        }else{
          realDuration = (0.70 * thisNote.duration) / 1000;
        }
                
        let startTimeOffset = 0;
        var thisNotePos;
        if(i === 0){
          // the first note on the piano roll might not start at the beginning (i.e. there might be an initial rest)
          // so let's account for that here 
          // if startMarker is specified, we can use its position to figure out the initial rest
          let startPos = 60; // 60 is the x-position of the very first note of the piano roll
          if(pianoRollObject.playMarker){
            startPos = getNotePosition(document.getElementById(pianoRollObject.playMarker));
          }
          const firstNoteStart = getNotePosition(document.getElementById(notes[i].block.id));
          thisNotePos = firstNoteStart;
          if(firstNoteStart !== startPos){
            startTimeOffset = getCorrectLength(firstNoteStart - startPos, pianoRoll) / 1000;
          }
        }else{
          // find out how much space there is between curr note and prev note to figure out when curr note should start
          const prevNotePos = getNotePosition(document.getElementById(notes[i-1].block.id));
          var thisNotePos = getNotePosition(document.getElementById(thisNote.block.id));
          const timeDiff = getCorrectLength(thisNotePos - prevNotePos, pianoRollObject) / 1000;
          startTimeOffset = timeOffsetAcc + timeDiff;
          thisNotePos = thisNotePos;
        }

        timeOffsetAcc = startTimeOffset;
                
        const noteSetup = {
          "note": thisNote,
          "osc": oscsToUse,
          "gain": gainsToUse,
          "duration": realDuration,
          "volume": volume,
          "startTimeOffset": startTimeOffset,
          "position": thisNotePos
        };
                
        allNotesPerInstrument[instIndex].push(noteSetup);
      }
      gainIndex++;
    }
    
    // so calculating startTimeOffset seems to be a bit tricky and yields different values 
    // for notes that should be started at the same time (i.e. in a chord). 
    // to remedy this, go through all the notes again real quick and if we find notes that 
    // should start at the same time, decide on an offset and fix the values as needed.
    // use the positions of each note to figure out which start together
    // TODO: correct time scheduling precision errors? or look into gradual scheduling, if possible?
    var positionMap = {}; // group notes by positions
    const instrumentNotes = allNotesPerInstrument[instIndex];
    instrumentNotes.forEach((note) => {
      if(positionMap[note.position]){
        // record the pitches present at this column number
        positionMap[note.position].push(note);
      }else{
        positionMap[note.position] = [note];
      }
    });
        
    // now only adjust the offset for notes in the same chord
    for(const position in positionMap){
      var chord = positionMap[position];
      if(chord.length > 1){
        // assign everyone the same startTimeOffset value
        chord.forEach((note) => {
          note.startTimeOffset = chord[0].startTimeOffset;
        });
      }
    }
  }
    
  return allNotesPerInstrument;
}

// set up all the notes and schedule them for playback
// @param pianoRoll: an instance of PianoRoll
// @param allInstruments: boolean indicating if all instruments should be played or not
function scheduler(pianoRoll, allInstruments){
  // for each instrument initialize their index in instrumentNotePointers to 0, which means that playing should 
  // start at the beginning (0 being the index of the first note of that instrument)
  const instrumentsToPlay = {}; // collect all instruments that should be playing and map their indexes to them
    
  // each instrument may have a different number of notes.
  // keep a map where each key represents the index of an instrument to play from pianoRoll.instruments
  // and each value will be a number representing the index of an instrument's notes to start playing at
  const instrumentNotePointers = {};
    
  if(!allInstruments && !pianoRoll.currentInstrument.isMute){
    // just the current instrument
    for(var j = 0; j < pianoRoll.instruments.length; j++){
      if(pianoRoll.instruments[j] === pianoRoll.currentInstrument){
        instrumentsToPlay[j] = pianoRoll.instruments[j];
        instrumentNotePointers[j] = 0;
        break;
      }
    }
  }else if(allInstruments){
    // only non-muted instruments
    for(var i = 0; i < pianoRoll.instruments.length; i++){
      if(!pianoRoll.instruments[i].isMute){
        instrumentsToPlay[i] = pianoRoll.instruments[i];
        instrumentNotePointers[i] = 0;
      }
    }
  }
    
  // gather the column headers so we can process them to indicate the approx. current location for playback with a marker
  // filter columnHeadersToHighlight a bit more - we only want to include up to the last column that has notes.
  // any column past that we don't want 
  let columnHeadersToHighlight = Array.from(document.getElementById("columnHeaderRow").children).splice(1); // remove first col header since it's for cosmetic purposes
  let lastColWithNotes;
  columnHeadersToHighlight.forEach((col, index) => {
    if(col.dataset.numNotes > 0){
      lastColWithNotes = index;
    }
  });
  if(lastColWithNotes){
    columnHeadersToHighlight = columnHeadersToHighlight.slice(0, lastColWithNotes+1);
  }
    
  // keep track of when to start and stop oscillators responsible for highlighting the current approx. playback location
  const ctx = pianoRoll.audioContext;
  let highlightNextTime = ctx.currentTime;
    
  // in the case where the user specified a measure to start playing at, we need to update instrumentNotePointers to start at the right note
  const startMarker = pianoRoll.playMarker; // if it's currently paused OR user specified a certain column to start playing at
  if(startMarker){
    const startPos = getNotePosition(document.getElementById(startMarker));
    for(const instIdx in instrumentsToPlay){
      const currInst = instrumentsToPlay[instIdx];
      // have each instrument start with the note at index given by startMarker
      for(var j = 0; j < currInst.notes.length; j++){
        try{
          // the elements of the notes array are arrays of Note objects, hence the [0]
          const columnCell = document.getElementById(currInst.notes[j][0].block.id).parentNode;
          const cellId = columnCell.id;
          const cellPos = getNotePosition(columnCell);

          if(cellId.indexOf(startMarker) > -1){
            instrumentNotePointers[instIdx] = j;
            break;
          }else if(cellPos > startPos){
            // this is the first note that appears after the selected column to start playing from 
            instrumentNotePointers[instIdx] = j;
            break;
          }
        }catch(error){
          console.error(error);
          console.error(currInst.notes[j].block.id);
        }
      }
    }
    columnHeadersToHighlight = columnHeadersToHighlight.splice(parseInt(startMarker.match(/[0-9]+/g)[0]));
  }
    
  // set up oscillator just for highlighting approx. the current column header
  // note each column header is 40 px in length (that's 1 eighth note)
  // so they should all be the same length in duration
  columnHeadersToHighlight.forEach((header) => {
    const highlightOsc = ctx.createOscillator();
    highlightOsc.start(highlightNextTime);
    highlightNextTime += (getCorrectLength(40, pianoRoll) / 1000);
    highlightOsc.stop(highlightNextTime);
        
    // onendFunc comes from domModification.js
    highlightOsc.onended = onendFunc(
      header.id,
      columnHeadersToHighlight[columnHeadersToHighlight.length-1].id,
      pianoRoll
    );
        
    // TODO: maybe use a separate timers array just for these highlight oscillators? don't mix with the notes
    pianoRoll.timers.push(highlightOsc);
  });
    
  // figure out for each instrument the minumum number of gain nodes
  const numGainNodePerInst = getNumGainNodesPerInstrument(instrumentsToPlay, instrumentNotePointers);
    
  // add the appropriate number of gain nodes and oscillator nodes for each instrument.
  const instrumentGainNodes = {};
  const instrumentOscNodes = {};
  addNodesPerInstrument(pianoRoll, numGainNodePerInst, instrumentGainNodes, instrumentOscNodes);
    
  // assign the notes to the right nodes for each instrument
  const routes = {}; // map instrument to another map of gain nodes mapped to the notes that should be played by those nodes
  const posTracker = {};
  routeNotesToNodes(instrumentsToPlay, instrumentNotePointers, instrumentGainNodes, routes, posTracker);
    
  // determine duration, start time, volume, etc. of each note to be played
  const allNotesPerInstrument = configureInstrumentNotes(routes, pianoRoll, instrumentGainNodes, instrumentOscNodes);

  const thisTime = ctx.currentTime;
    
  // start up the oscillators
  for(const inst in instrumentOscNodes){
    instrumentOscNodes[inst].forEach((oscGroup) => {
      oscGroup.forEach((osc) => {
        osc.start(thisTime);
      });
    });
  }
    
  for(var i in instrumentsToPlay){
    const currInstNotes = allNotesPerInstrument[i];
    if(currInstNotes === undefined){
      // no notes for this instrument
      continue;
    }
        
    currInstNotes.forEach((note) => {
      // schedule the notes!
      const oscs = note.osc; // this is a list
      const gains = note.gain; // this is a list    
      const duration = note.duration;
      const volume = note.volume;
      const startTimeOffset = note.startTimeOffset;
      const startTime = thisTime + startTimeOffset;
      const endTime = startTime + duration;
      const otherParams = note.note;
            
      // useful for debugging time drift of notes' start times. I found out that I was getting non-uniform start offset values for chords.
      //console.log(`instrument: ${instrumentsToPlay[i].name}; note: ${document.getElementById(otherParams.block.id).parentNode.id}; starting@ ${startTime} and ending@ ${endTime}; duration: ${duration}; start offset: ${startTimeOffset}`);
      // TODO: note start time drift is still a problem I need to solve and am currently using a cheap solution where 
      // I just make sure all notes in a chord start at the same time based on the first note in the chord.
            
      // log the time the last note will play
      pianoRoll.lastTime = Math.max(pianoRoll.lastTime, (thisTime + startTimeOffset));
            
      if(instrumentsToPlay[i].waveType === "percussion"){
        // handling percussion! in this case we're not caring about oscs and gains
        // hmm gotta make a new osc for every percussion note? need to explore this some more.
        const noteContainer = document.getElementById(otherParams.block.id).parentNode;
        const octave = parseInt(noteContainer.id.match(/[0-9]/g)[0]);
        let oscList;
                
        if(octave >= 2 && octave <= 4){
          oscList = pianoRoll.PercussionManager.kickDrumNote(otherParams.freq, volume, startTime, true);
        }else if(octave === 5){
          oscList = pianoRoll.PercussionManager.snareDrumNote(otherParams.freq, volume, startTime, true);
        }else{
          oscList = pianoRoll.PercussionManager.hihatNote(volume, startTime, true);
        }
                
        oscList.forEach((osc) => {
          pianoRoll.timers.push(osc);
          osc.start(startTime);
          osc.stop(endTime);
        });
                
      }else if(instrumentsToPlay[i].waveType === "piano"){
        // handling piano. in this case we're not caring about oscs (but we can use the gain nodes)
        // because for now we will create a new buffersource node for each note
        // in this case, we can be sure that there would be a 1:1 mapping of gain node to audio buffer node
        const noteName = document.getElementById(otherParams.block.id).parentNode.id.split('col')[0]; // i.e. get D7 from D7col_3
                
        const newAudioBufferNode = ctx.createBufferSource();
        newAudioBufferNode.buffer = pianoRoll.PianoManager.getAudioBufferForNote(noteName);
                
        oscs.forEach((osc) => {
          osc.disconnect();
        });
                
        gains.forEach((gain) => {
          newAudioBufferNode.connect(gain);
          pianoRoll.timers.push(newAudioBufferNode); // so we can stop playing whenever
                    
          gain.gain.setTargetAtTime(volume*4, startTime, 0.0045); // the piano is kinda quiet so raise the volume a bit
          gain.gain.setTargetAtTime(0.0, (endTime - .0025), 0.0070);
                    
          newAudioBufferNode.start(startTime);
          newAudioBufferNode.stop(endTime);
        });
      }else if(pianoRoll.instrumentPresets[instrumentsToPlay[i].waveType]){
        // for handling custom instrument preset!
        let gainValueSum = 0.0;
        gains.forEach((gain) => {
          if(gain.baseGainValue){
            // I'm not completely sure if it's safe to assume all gains here will
            // have the baseGainValue property, even though they should, I think,
            // since they're part of a custom preset
            gainValueSum += gain.baseGainValue;
          }
        });
                
        // schedule the gain nodes
        gains.forEach((gain) => {                    
          let gainValue = gain.gain.value;
                    
          // scale the volume appropriately based on the current note's volume 
          // if there's a baseGainValue property
          if(gain.baseGainValue){
            gainValue = (gain.baseGainValue / gainValueSum) * volume;
          }
                    
          if(gain.envelope){
            // apply ADSR envelope as needed
            gain.envelope.applyADSR(gain.gain, startTime, duration, gainValue);
          }else{                    
            gain.gain.setTargetAtTime(gainValue, startTime, 0.0045);
            gain.gain.setTargetAtTime(0.0, (endTime - .0025), 0.0010);
          }
        });
                
        // schedule the osc nodes 
        oscs.forEach((osc) => {
          if(osc.frequency){
            if(otherParams.freq < 440){
              osc.frequency.setValueAtTime(0.0, 0.0);
            }

            if(otherParams.block.style === "glide"){
              osc.frequency.setTargetAtTime(otherParams.freq, startTime, 0.025);
            }else{
              osc.frequency.setValueAtTime(otherParams.freq, startTime);
            }
                        
            osc.frequency.setValueAtTime(0.0, endTime);
          }
        });
                
      }else{
        // handling regular instruments! (sine, square, triangle, sawtooth)
        gains.forEach((gain) => {
          // setting gain value here depending on condition allows for the 'articulation' of notes without 
          // the 'helicopter' sound when a certain note frequency is 0 but gain is not 0.
          // this is fixed by always setting gain to 0 if a note's frequency is 0.
          gain.gain.setTargetAtTime(volume, startTime, 0.0045);  // setting the time-constant to a really small value helps produce a softer attack for notes.
                    
          // cut the duration by just a little bit to give the impression of articulation
          gain.gain.setTargetAtTime(0.0, (endTime - .0025), 0.0010);
        });
                
        oscs.forEach((osc) => {
          osc.type = instrumentsToPlay[i].waveType;

          if(otherParams.block.style === "glide"){
            osc.frequency.setTargetAtTime(otherParams.freq, startTime, 0.025);
          }else{
            osc.frequency.setValueAtTime(otherParams.freq, startTime);
          }
                    
          osc.frequency.setValueAtTime(0.0, endTime);
        });
                
      }
    });
  }

  /*
    if(pianoRoll.loopFlag && pianoRoll.isPlaying){
        // is this actually correct? the last oscillator in timers might not be necessarily the last note of the piece?
        // seems to work well most, if not all the time though so far.
        pianoRoll.timers[pianoRoll.timers.length-1].onended = function(){loopSignal(pianoRoll, allInstruments)};
    }*/
}

// implements looping play functionality - TODO: fix this
// @param pianoRollObject: an instance of PianoRoll
// @param allInstruments: true if playing all instruments, false if not.
function loopSignal(pianoRollObject, allInstruments){
  setTimeout(function(){
    scheduler(pianoRollObject, allInstruments);
  }, 80); // 80 ms before re-executing scheduler
}


// play notes for current instrument
// @param pianoRollObject: an instance of PianoRoll
function play(pianoRollObject){
  const ctx = pianoRollObject.audioContext;
  if(!pianoRollObject.isPlaying || (pianoRollObject.isPlaying && pianoRollObject.lastTime < ctx.currentTime)){
    pianoRollObject.isPlaying = true;
    pianoRollObject.currentInstrument.notes = readInNotes(pianoRollObject.currentInstrument, pianoRollObject);
    scheduler(pianoRollObject, false);
  }
}

// play all instruments
// @param pianoRollObject: an instance of PianoRoll
function playAll(pianoRollObject){
  const ctx = pianoRollObject.audioContext;
  if(!pianoRollObject.isPlaying || (pianoRollObject.isPlaying && pianoRollObject.lastTime < ctx.currentTime)){
    pianoRollObject.isPlaying = true;
    for(const instrument of pianoRollObject.instruments){
      instrument.notes = readInNotes(instrument, pianoRollObject);
    }
    scheduler(pianoRollObject, true);
  }
}

// record playback (for all instruments)
// @param pianoRollObject: an instance of PianoRoll
function recordPlay(pianoRollObject){
  if(pianoRollObject.recording){
    return;
  }else{
    pianoRollObject.recording = true;
    pianoRollObject.recorder.start();
    playAll(pianoRollObject);
  }
}

// paused playback
// @param pianoRollObject: an instance of PianoRoll
function pausePlay(pianoRollObject){
  // highlightHeader comes from gridBuilder.js
  highlightHeader(pianoRollObject.lastNoteColumn.id, pianoRollObject);
  
  pianoRollObject.isPlaying = false;

  // stop all currently-playing or scheduled nodes
  for(let i = 0; i < pianoRollObject.timers.length; i++){
    const node = pianoRollObject.timers[i];
    node.stop(0);
    node.ended = null; // unhook onendFunc 
    node.disconnect();
  }
    
  // add a new fresh gain node for each instrument
  for(let j = 0; j < pianoRollObject.instruments.length; j++){
    // create a new gain for each instrument (this really is only needed when clicking notes, not playback)
    const newGain = initGain(pianoRollObject.audioContext);
        
    if(pianoRollObject.showVisualizer){
      newGain.connect(pianoRollObject.analyserNode);
    }else{
      newGain.connect(pianoRollObject.audioContext.destination);
    }
        
    pianoRollObject.instruments[j].gain = newGain;
  }

  // clear out timers array (which holds the oscillator nodes)
  pianoRollObject.timers = [];
}

//stop playback
// @param pianoRollObject: an instance of PianoRoll
function stopPlay(pianoRollObject){
  pianoRollObject.isPlaying = false;

  // stop all currently-playing or scheduled nodes
  for(let i = 0; i < pianoRollObject.timers.length; i++){
    const node = pianoRollObject.timers[i];
    node.stop(0);
    node.ended = null; // unhook onendFunc 
    node.disconnect();
  }
    
  // add a new fresh gain node for each instrument
  for(let j = 0; j < pianoRollObject.instruments.length; j++){
    // I don't think this actually helps since we might have multiple gains per instrument :<
    //pianoRollObject.instruments[j].gain.disconnect();
        
    // create a new gain for each instrument (this really is only needed when clicking notes, not playback)
    const newGain = initGain(pianoRollObject.audioContext);
        
    if(pianoRollObject.showVisualizer){
      newGain.connect(pianoRollObject.analyserNode);
    }else{
      newGain.connect(pianoRollObject.audioContext.destination);
    }
        
    pianoRollObject.instruments[j].gain = newGain;
  }

  // clear out timers array (which holds the oscillator nodes)
  pianoRollObject.timers = [];
    
  // this is a cheap hack for now (for dealing with showCurrentNote)
  if(pianoRollObject.lastNoteColumn && pianoRollObject.lastNoteColumn.id !== pianoRollObject.playMarker){
    pianoRollObject.lastNoteColumn.style.backgroundColor = '#fff';
  }
    
  // clear play marker if set
  const prevMarker = document.getElementById(pianoRollObject.playMarker);
  if(prevMarker){
    prevMarker.style.backgroundColor = "#fff";
  }
  pianoRollObject.playMarker = null;
    
  // if recording
  if(pianoRollObject.recording){
    pianoRollObject.recorder.stop();
    pianoRollObject.recording = false;
    // this is relying on an assumed id - probably not the best thing to do here...
    document.getElementById('record').style.border = "";
  }
    
  pianoRollObject.lastNoteColumn = null;
}

// TODO: move elsewhere? like under Piano Roll?
// create a new instrument
// @param name: name of the instrument
// @param pianoRollObject: instance of PianoRoll
function createNewInstrument(name, pianoRollObject){
  // make new gain node for the instrument 
  const newGain = initGain(pianoRollObject.audioContext);
    
  if(pianoRollObject.showVisualizer){
    newGain.connect(pianoRollObject.analyserNode);
  }else{
    newGain.connect(pianoRollObject.audioContext.destination);
  }
    
  // create new instrument with oscillator
  const newInstrument = new Instrument("new_instrument", newGain, []);
  pianoRollObject.instruments.push(newInstrument);
}

try {
  module.exports = {
    initGain,
    getNotesStartAndEnd,
    getMinGainNodes,
    readInNotes,
    scheduler,
    play,
    playAll,
    pausePlay,
    stopPlay,
    getCorrectLength,
    getNumGainNodesPerInstrument,
    getNotePosition,
    createNewInstrument,
  };
}catch(e){
  // ignore errors (i.e. if adding the script to an html page)
  // we need this export for unit testing though 
}