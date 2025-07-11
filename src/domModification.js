/************** 

DOM MODIFICATION 

many functions here rely on an instance of
the PianoRoll class in classes.js 
and playbackFunctionality.js

these functions have to do with interacting
with the piano roll grid, instruments grid

***************/

// returns whther num is within leftLim and rightLim 
// @param num, leftLim, rightLim: an integer
// @return: true if num in range, else false 
function inRange(num, leftLim, rightLim){
  return num >= leftLim && num <= rightLim;
}

// add newNote to the object currNotes 
// @param currNotes: an object mapping HTML element ids to HTML elements 
// @param newNote: a HTML element representing a note
function addNoteToCurrInstrument(currNotes, newNote){
  currNotes[newNote.id] = newNote;
}

// gets a list of possible positions that a note could be placed within a grid cell based on the current note size lock set
// @param containerElement: an HTML element representing a grid cell, where notes can be placed
// @param pianoRollObject: an instance of PianoRoll
// @param scrollOffset: a number representing any horizontal scroll offset of the main container
// @return: a list of integers, with each integer representing a possible style.left value (in px) of a note of the container
function getSubdivisionPositions(containerElement, pianoRollObject, scrollOffset=0){
  const targetContPos = containerElement.getBoundingClientRect().left + scrollOffset;
  const currLockType = pianoRollObject.lockNoteSize;
  const subdivisionCount = Math.floor(parseInt(containerElement.style.width) / (pianoRollObject.noteSizeMap[currLockType]));
  const possibleNotePos = [];
    
  for(let i = 0; i <= subdivisionCount; i++){
    possibleNotePos.push(targetContPos + (i * (pianoRollObject.noteSizeMap[currLockType])));
  }
    
  return possibleNotePos;
}

// checks to see if a note can be placed within a grid cell
// @param posToPlace: an integer representing the x coordinate of a position to place
// @param currContainerChildren: an HTMLCollection of child nodes of an html element
// @param scrollOffset: a number representing any horizontal scroll offset of the main container
// @return: true if posToPlace can hold a new note, else false
function canPlaceNote(posToPlace, currContainerChildren, scrollOffset=0){
  // check to make sure posToPlace doesn't equal the left position of any of the 
  // children of the target container to place in - also, we only care about
  // children that are part of this current instrument's notes, so check opacity
  for(let i = 0; i < currContainerChildren.length; i++){
    const note = currContainerChildren[i];
    if((note.getBoundingClientRect().left + scrollOffset) === posToPlace &&
            note.style.opacity == 1){
      return false;
    }
  }
    
  return true;
}

// places a note at the position specified by evt. placement depends on the current note lock size
// @param note: an html element representing a note, or null for creating a new note
// @param pianoRollObject: an instance of PianoRoll
// @param evt: a MouseEvent 
// @return: the note that was placed if it was, else null
function placeNoteAtPosition(note, pianoRollObject, evt){
  let targetContainer = evt.target;
    
  if(!targetContainer.classList.contains("noteContainer")){
    if(targetContainer.classList.contains("noteElement")){
      targetContainer = targetContainer.parentNode;
    }else{
      return null;
    }
  }
    
  const scrollOffset = document.getElementById("piano").scrollLeft;

  // a little tricky but note that the last entry in possibleNotePos will be the start position 
  // of the neighboring note container to the right!
  const possibleNotePos = getSubdivisionPositions(targetContainer, pianoRollObject, scrollOffset);

  const currX = evt.x + scrollOffset;
  const lockNoteLength = pianoRollObject.noteSizeMap[pianoRollObject.lockNoteSize];
  let posToPlace = null;

  for(let i = 0; i < possibleNotePos.length; i++){
    if(i < possibleNotePos.length - 1){
      if(currX >= possibleNotePos[i] && currX < possibleNotePos[i+1]){
        posToPlace = possibleNotePos[i];
        break;
      }
    }else{
      // the closest boundary is the last entry in possibleNotePos,
      // so it's the next note container over to the right.
      posToPlace = possibleNotePos[possibleNotePos.length-1];
      targetContainer = targetContainer.nextSibling;
    }
  }
    
  // create a new note if null was passed in for note (i.e. when using addNote() instead of moveHelper())
  if(!note){
    note = createNewNoteElement(pianoRollObject);
  }
  // update lastNoteSize (even if not placing, allow clicking an already
  // placed note to update the last selected size)
  pianoRollObject.lastNoteSize = parseInt(note.style.width);
    
  // make sure this current instrument doesn't already have a note in position to place
  if(canPlaceNote(posToPlace, targetContainer.children, scrollOffset)){
    // update current column header before moving (if moving a note)
    const container = note.parentNode;
    if(container){
      const colHeader = document.getElementById(container.id.substring(container.id.indexOf("col")));
      colHeader.setAttribute("data-num-notes", parseInt(colHeader.dataset.numNotes - 1));
    }
        
    note.style.left = (posToPlace - 8) + "px"; // TODO: why is there 8px of extra padding showing up somewhere? this works but not sure why/where it's coming from :(
    targetContainer.appendChild(note);
        
    const newColHeader = document.getElementById(targetContainer.id.substring(targetContainer.id.indexOf("col")));
    newColHeader.setAttribute("data-num-notes", parseInt(newColHeader.dataset.numNotes + 1));
        
    return note;
  }
    
  return null;
}

// helper function to utilize a couple other arguments besides evt on mouse move when resizing
// @param newNote: an html element representing a note 
// @param pianoRollObject: an instance of PianoRoll 
// @param evt: a MouseEvent
function resizeHelper(newNote, pianoRollObject, evt){
  if(newNote.style.opacity != 1){
    // don't accidentally resize onion-skinned notes
    return;
  }
    
  evt.preventDefault();

  const scrollOffset = document.getElementById("piano").scrollLeft;
  const pos = evt.x + scrollOffset;
  const diff = pos - (newNote.getBoundingClientRect().left + parseInt(newNote.style.width) + scrollOffset);

  const currLockType = pianoRollObject.lockNoteSize;
  const currNoteWidth = parseInt(newNote.style.width);
  const noteSize = pianoRollObject.noteSizeMap[currLockType];
    
  const newNoteLeft = newNote.getBoundingClientRect().left;
  const nextBlockPos = scrollOffset + newNoteLeft + currNoteWidth + noteSize;
  const prevBlockPos = scrollOffset + newNoteLeft + currNoteWidth - noteSize;

  if(diff > 0){
    if(inRange(pos, nextBlockPos, nextBlockPos+3)){
      // extending
      newNote.style.width = (currNoteWidth + noteSize) + "px";
    }
  }else{
    // minimizing
    if(inRange(pos, prevBlockPos-3, prevBlockPos)){
      // do not allow 0 width 
      const newWidth = currNoteWidth - noteSize;
      if(newWidth <= 0){
        return;
      }
      newNote.style.width = (currNoteWidth - noteSize) + "px";
    }
  }
}

// helper function to utilize a couple other arguments besides evt on mouse move 
// @param newNote: an html element representing a note 
// @param pianoRollObject: an instance of PianoRoll
// @param evt: a MouseEvent
function moveHelper(newNote, pianoRollObject, evt){
  evt.preventDefault();
    
  if(newNote.style.opacity != 1){
    return;
  }
    
  placeNoteAtPosition(newNote, pianoRollObject, evt);
}

// since this doesn't actually use a MouseEvent, can probably be moved into the function that takes the MouseEvent?
function mouseupHelper(newNote, pianoRollObject, pianoRollInterface, eventsToRemove){
  // allow user to click on an already-placed note to hear it again
  // but not when resizing
  if(newNote.style.cursor !== "w-resize"){
    const waveType = pianoRollObject.currentInstrument.waveType;
    const vol = parseFloat(newNote.dataset.volume);
    clickNote(newNote.parentNode.id, waveType, vol, pianoRollObject);
  }

  const currNotes = pianoRollObject.currentInstrument.activeNotes;
  addNoteToCurrInstrument(currNotes, newNote);
    
  pianoRollObject.lastNoteSize = parseInt(newNote.style.width);
    
  for(const event in eventsToRemove){
    pianoRollInterface.removeEventListener(event, eventsToRemove[event]);
  }
}

// TODO: pass in a map for defined values?
// creates a new html element representing a note 
// @param pianoRollObject: an instance of PianoRoll
function createNewNoteElement(pianoRollObject){
  const currInst = pianoRollObject.currentInstrument;
    
  const newNote = document.createElement('div');
  newNote.setAttribute("data-volume", currInst.volume);
  newNote.setAttribute("data-type", "default"); 
  newNote.style.background = `linear-gradient(90deg, ${currInst.noteColorStart} 90%, ${currInst.noteColorEnd} 99%`;
  newNote.style.height = "15px";
  newNote.style.position = "absolute";
  newNote.style.opacity = 1.0;
  newNote.style.zIndex = 100;
  newNote.classList.add("noteElement");
  newNote.classList.add("context-menu-note");
  newNote.id = "note" + pianoRollObject.noteIdNum++;
    
  if(pianoRollObject.addNoteSize === "last selected"){
    newNote.style.width = pianoRollObject.lastNoteSize + "px";
  }else{
    newNote.style.width = pianoRollObject.noteSizeMap[pianoRollObject.addNoteSize] + "px";
  }
    
  newNote.addEventListener("pointermove", function(e){
    // allow resize cursor to show when the mouse moves over the right edge of the note
    if(e.offsetX >= (parseInt(newNote.style.width) - 3)){
      newNote.style.cursor = "w-resize";
    }else{
      newNote.style.cursor = "";
    }
  });
    
  const pianoRollInterface = document.getElementById("piano");
    
  newNote.addEventListener("pointerdown", function(e){
    if(newNote.style.opacity != 1){
      return;
    }
        
    e.preventDefault();
    e.stopPropagation();
        
    if(e.which == 2){
      // middle mouse button
      const container = newNote.parentNode;
      const colHeader = document.getElementById(container.id.substring(container.id.indexOf("col")));
      colHeader.setAttribute("data-num-notes", colHeader.dataset.numNotes - 1);
            
      container.removeChild(newNote);
      delete pianoRollObject.currentInstrument.activeNotes[newNote.id];
            
      return;
    }
        
    if(e.which === 3){
      // don't let right-click do anything
      return;
    }

    pianoRollInterface.style.touchAction = "none"; // prevent horizontal scroll when moving note

    if(newNote.style.cursor === "w-resize" || e.offsetX >= (parseInt(newNote.style.width) - 3)){
      function resizeNote(evt){
        resizeHelper(newNote, pianoRollObject, evt);
      }
      pianoRollInterface.addEventListener("pointermove", resizeNote);
      pianoRollInterface.addEventListener("pointerup", function mouseupResize(e){
        pianoRollObject.lastNoteSize = parseInt(newNote.style.width);
        pianoRollInterface.removeEventListener("pointermove", resizeNote);
        pianoRollInterface.removeEventListener("pointerup", mouseupResize);
        pianoRollInterface.style.touchAction = "auto"; // allow horizontal scroll again
      });
    }else{
      function moveNote(evt){
        moveHelper(newNote, pianoRollObject, evt);
      }
            
      const evtsToRemove = {
        "pointermove": moveNote,
        "pointerup": mouseupMove
      };
            
      function mouseupMove(evt){
        mouseupHelper(newNote, pianoRollObject, pianoRollInterface, evtsToRemove);
        pianoRollInterface.style.touchAction = "auto"; // allow horizontal scroll again
      }
            
      pianoRollInterface.addEventListener("pointermove", moveNote);
      pianoRollInterface.addEventListener("pointerup", mouseupMove);
    }
  });
    
  return newNote;
}

// used when clicking on a row cell/note container to add a new note 
// @param id: the html element id of a row cell to add a note to 
// @param pianoRollObject: instance of PianoRoll
// @param evt: a MouseEvent
function addNote(id, pianoRollObject, evt){
  if(evt.target.style.zIndex == 100){
    // prevent shrinking a note from also creating a new note
    // because there'll be a click (which triggers this function) and a mouseup registered when resizing,
    // when shrinking a note the cursor will be on the note being shrunk, so we can check the target
    return;
  }
    
  const newNote = placeNoteAtPosition(null, pianoRollObject, evt);
  if(newNote){
    // play click sound if placing new note
    const waveType = pianoRollObject.currentInstrument.waveType;
    const volume = pianoRollObject.currentInstrument.volume;
    clickNote(id, waveType, volume, pianoRollObject);
    
    // add the note to the current instrument
    addNoteToCurrInstrument(pianoRollObject.currentInstrument.activeNotes, newNote);
  }
}

// used for highlighting the row of the grid the cursor is hovering over
// @param id: the html element id of a row cell / note container
// @param color: the color to highlight with 
function highlightRow(id, color){
  const parent = document.getElementById(id).parentNode;
  parent.style.backgroundColor = color;
}

// clear the notes of an instrument (which effectively clears the grid of their notes)
// @param instrument: an instance of Instrument to clear the notes for 
function clearGrid(instrument){
  const currNotes = instrument.activeNotes;
  for(const noteId in currNotes){
    const note = document.getElementById(noteId);
    note.parentNode.removeChild(note);
  }
  instrument.activeNotes = {};
  instrument.notes = [];
}

// @param pianoRollObject: instance of PianoRoll
function clearGridAll(pianoRollObject){
  for(let i = 0; i < pianoRollObject.instruments.length; i++){
    clearGrid(pianoRollObject.instruments[i]);
  }
}

// @param pianoRollObject: instance of PianoRoll
// @param container: an HTML element representing the container of the column header elements
function addNewMeasure(pianoRollObject, container){
  const columnHeaderParent = container;
    
  const lastColNum = pianoRollObject.numberOfMeasures * pianoRollObject.subdivision + 1;
  for(let i = lastColNum; i < lastColNum + pianoRollObject.subdivision; i++){
    const newHeader = createColumnHeader(i, pianoRollObject);
    columnHeaderParent.appendChild(newHeader);
  }
    
  // now add new columns for each note 
  const noteRowsParent = document.getElementById("grid"); // TODO: pls don't get element by id here
  const noteRowsChildren = Array.from(noteRowsParent.children);
  const startIndex = noteRowsChildren.findIndex(x => x.id === "C8"); // in case there's other elements in noteRowsParent (but really there shouldn't be)
    
  // start at the index of C8
  for(let j = startIndex; j < noteRowsChildren.length; j++){
    const rowParent = noteRowsChildren[j];
    const pitch = rowParent.id;
    for(let k = 0; k < pianoRollObject.subdivision; k++){
      const newColumnCell = createColumnCell(pitch, lastColNum+k-1, pianoRollObject);
      rowParent.appendChild(newColumnCell);
    }
  }
  
  pianoRollObject.numberOfMeasures++;
}

// deletes the last measure
// @param pianoRollObject: an instance of PianoRoll
function deleteMeasure(pianoRollObject){
  const lastMeasureStartColNum = (pianoRollObject.numberOfMeasures-1) * pianoRollObject.subdivision;
    
  // go through each instrument's activenotes and delete
  for(const instrument of pianoRollObject.instruments){
    const instNotes = instrument.activeNotes;
    for(const note in instNotes){
      if(parseInt(instNotes[note].parentNode.id.split("_")[1]) >= lastMeasureStartColNum){
        //console.log("need to delete column note: " + parseInt(instNotes[note].parentNode.id.split("_")[1]));
        const noteElement = instNotes[note];
        noteElement.parentNode.removeChild(noteElement);
        delete instNotes[note];
      }
    }
  }
    
  // calculate width of measure to remove
  let measureWidth = 0;
  for(let i = lastMeasureStartColNum; i < lastMeasureStartColNum + pianoRollObject.subdivision; i++){
    const colHeader = document.getElementById("col_" + i);
    measureWidth += parseInt(colHeader.style.width);
  }
    
  // remove the columns from the ui
  for(let i = lastMeasureStartColNum; i < lastMeasureStartColNum + pianoRollObject.subdivision; i++){
    const colHeader = document.getElementById("col_" + i);
    colHeader.parentNode.removeChild(colHeader);
        
    for(const note in pianoRollObject.noteFrequencies){
      const noteName = note.replace('#', 's');
      const col = document.getElementById(noteName + "col_" + i);
      if(col){
        col.parentNode.removeChild(col);
      }
    }
  }
    
  // adjust width of each row
  for(const note in pianoRollObject.noteFrequencies){
    const noteName = note.replace('#', 's');
    const row = document.getElementById(noteName);
    if(row){
      row.style.width = (parseInt(row.style.width) - measureWidth) + "px";
    }
  }
    
  // update num measure in pianoRollObject
  pianoRollObject.numberOfMeasures--;
}

// @param thisElement: the id of an html element representing an instrument
// @param pianoRollObject: an instance of PianoRoll 
function chooseInstrument(thisElement, pianoRollObject){
  // look at grid, collect the notes, save them to the current instrument, and
  // move on to the clicked-on instrument
  pianoRollObject.currentInstrument.notes = readInNotes(pianoRollObject.currentInstrument, pianoRollObject);
    
  // reset the playMarker because the previously-set marker might be a column header 
  // that doesn't exist anymore (i.e. because of subdivision or rejoining)
  const prevMarker = document.getElementById(pianoRollObject.playMarker);
  if(prevMarker){
    prevMarker.style.backgroundColor = "#fff";
  }
  pianoRollObject.playMarker = null;
    
  // instrumentTable is specific to my implementation
  const instrumentsView = document.getElementById('instrumentTable').children;

  // change other instruments' label background color to transparent
  for(let i = 0; i < instrumentsView.length; i++){
    if(instrumentsView[i]){
      instrumentsView[i].style.backgroundColor = "transparent";
            
      // detach context menu from old instrument 
      instrumentsView[i].classList.remove("context-menu-instrument");
    }
  }

  // get index of clicked-on instrument in instrumentTable and subtract 1 to
  // account for 0-index when we use it to look in pianoRoll object 'instruments' 
  // array for the corresponding instrument object
  // we are assuming that when an instrument gets deleted, all of these instrument tab elements
  // will get corrected so that this will not fail (i.e. we should always have sequentially id'd elements)
  const index = parseInt(thisElement) - 1;
    
  // then change current instrument to the one clicked on 
  pianoRollObject.currentInstrument = pianoRollObject.instruments[index];
    
  // attach new context menu only to current instrument via class name
  document.getElementById('instrumentTable').children[index].classList.add("context-menu-instrument");
    
  showOnionSkin(pianoRollObject);
    
  // then draw the previously-saved notes, if any, onto the grid of the clicked-on instrument
  drawNotes(pianoRollObject.currentInstrument); 

  document.getElementById(thisElement).style.backgroundColor = pianoRollObject.instrumentTableColor;
}

// changes all the notes of the given instrument to opacity 1.0, making them fully visible
// @param instrumentObject: instance of Instrument
function drawNotes(instrumentObject){
  const notes = instrumentObject.activeNotes;
    
  for(const n in notes){
    notes[n].classList.add("context-menu-one");
    notes[n].style.opacity = 1.0;
    notes[n].style.zIndex = 100;
  }
}

// this function relies on an INPUT box's ID to get the user-inputted tempo
// @param pianoRollObject: instance of PianoRoll
// @param tempoElement: the HTML input element to read the tempo from
function changeTempo(pianoRollObject, tempoElement){
  const selectedTempo = parseInt(tempoElement.value);
    
  if(isNaN(selectedTempo)){
    return;
  }
    
  // getting milliseconds PER EIGHTH NOTE (1 block on grid)
  pianoRollObject.currentTempo = ((Math.round((60000 / selectedTempo) * 1000)) / 2000);
    
  // go through all instruments and adjust duration of each note in their note arrays
  // according to new current tempo
  for(let i = 0; i < pianoRollObject.instruments.length; i++){
    pianoRollObject.instruments[i].notes = readInNotes(pianoRollObject.instruments[i], pianoRollObject); // readInNotes is from playbackFunctionality.js
  }
}


// change time signature and subdivision (can only switch between 4/4 and 3/4)
function changeTimeSignature(pianoRollObject, newTimeSig){
  if(newTimeSig === '4/4'){
    pianoRollObject.subdivision = 8;
    pianoRollObject.timeSignature = '4/4';
  }else{
    pianoRollObject.subdivision = 6;
    pianoRollObject.timeSignature = '3/4';
  }
}

/***
    show current note playing
    
    // https://www.html5rocks.com/en/tutorials/audio/scheduling/
    // trying to sync visual (show currently playing note) with audio...
    // right now I'm using the oscillator node's onended function to 
    // highlight where the current note playing is.
***/
const onendFunc = function(colHeaderId, lastColId, pianoRollObject){
  return function(){
    if(pianoRollObject.recording && colHeaderId === lastColId){
      // add some extra silence so it doesn't end so abruptly
            
      // stop the recorder when the last column has been reached
      pianoRollObject.recorder.stop();
      pianoRollObject.recording = false;
            
      // relies on specific html element: not the best thing to do here...
      document.getElementById('record').style.border = "";
    }

    // take away highlight of previous note 
    if(pianoRollObject.lastNoteColumn && pianoRollObject.playMarker !== pianoRollObject.lastNoteColumn.id){
      pianoRollObject.lastNoteColumn.style.backgroundColor = '#fff';
    }
        
    const currCol = document.getElementById(colHeaderId);
    if(pianoRollObject.isPlaying && pianoRollObject.playMarker !== colHeaderId){
      currCol.style.backgroundColor = pianoRollObject.currNotePlayingColor;
            
      if(pianoRollObject.autoScroll){
        const pageWidth = document.body.getBoundingClientRect().width;
        document.getElementById("piano").scrollTo({
          left: currCol.offsetLeft,
          behavior: "smooth",
        });
      }
    }

    pianoRollObject.lastNoteColumn = currCol;
  };
};


// see where the other instruments' notes are.
// if an instrument has onionSkinOn unchecked, then they will not have 
// their notes shown as onion skin 
// onion skin opacity is currently set to 0.3.
// @param: pianoRollObject: instance of PianoRoll
function showOnionSkin(pianoRollObject){
  for(let i = 0; i < pianoRollObject.instruments.length; i++){
    const currInstrument = pianoRollObject.instruments[i];
    if(currInstrument !== pianoRollObject.currentInstrument){
      const activeNotes = currInstrument.activeNotes;
      for(const activeNote in activeNotes){
        const note = activeNotes[activeNote];
        if(!currInstrument.onionSkinOn){
          note.style.opacity = 0.0;
        }else{
          note.style.opacity = 0.3;
        }
        note.style.zIndex = -1;
        note.classList.remove("context-menu-one");
      }
    }
  }
}


// redraw thick grid cell lines for the correct cells if subdivision changes (i.e. going from 4/4 to 3/4)
// @param pianoRollObject: an instance of PianoRoll
// @param headerId: the id of the element that holds all the column header elements
function redrawCellBorders(pianoRollObject, headerId){
  const subdivision = pianoRollObject.subdivision; 
  const headers = Array.from(document.getElementById(headerId).children);
  let measureCounter = 1;
    
  for(let i = 1; i < headers.length; i++){
    const columnHeader = headers[i];
    const colNum = parseInt(headers[i].id.match(/\d+/g)[0]);
    columnHeader.textContent = "";
    columnHeader.className = "thinBorder";
        
    const subdiv = (i % subdivision) === 0 ? subdivision : (i % subdivision);

    // mark the measure number 
    if(subdiv === 1){
      const measureNumber = document.createElement("h2");
      measureNumber.textContent = measureCounter++;
      measureNumber.style.margin = '0 0 0 0';
      measureNumber.style.color = pianoRollObject.measureNumberColor;
            
      columnHeader.appendChild(measureNumber);
      columnHeader.className = "";
    }else{
      if(subdivision === subdiv){
        columnHeader.className = "thickBorder";
      }
      headers[i].textContent = subdiv; 
    }
        
    const columnCells = document.querySelectorAll('[id$=' + '\"' + columnHeader.id + '\"]');
        
    // skip the first element, which is the column header (not a note on the grid)
    for(let j = 1; j < columnCells.length; j++){
      const gridCell = columnCells[j];
      gridCell.className = "noteContainer " + ((columnHeader.className === "") ? "thinBorder" : columnHeader.className);
    };
        
    // update piano roll num measures 
    pianoRollObject.numberOfMeasures = measureCounter-1;
  }
        
  // now we have to check if changing the meter altered the last measure in such a way that 
  // we have to add more columns (i.e. going from 4/4 to 3/4 may leave the last measure consisting of only 2 columns!)
  // what if user keeps switching between 4/4 and 3/4? the total number of measures will keep increasing
    
  let lastColNum = parseInt(headers[headers.length-1].id.match(/\d+/g)[0]);
  const headerColumnRow = document.getElementById(headerId);
  let currColHeadNum = ((lastColNum + 1) % subdivision) + 1;
    
  while((lastColNum + 1) % subdivision !== 0){
    const newColumnHead = document.createElement('div');
    newColumnHead.id = "col_" + (lastColNum + 1); 
    newColumnHead.style.display = "inline-block";
    newColumnHead.style.margin = "0 auto";
    newColumnHead.className = ((lastColNum + 2) % subdivision === 0) ? "thickBorder" : "thinBorder";
    newColumnHead.style.textAlign = "center";
    newColumnHead.style.width = '40px';
    newColumnHead.style.height = '12px';
    newColumnHead.style.fontSize = '10px';
    newColumnHead.textContent = currColHeadNum;
    headerColumnRow.append(newColumnHead);
        
    // add the rest of the column 
    for(const note in pianoRollObject.noteFrequencies){
      // ignore enharmonics 
      if(note.substring(0, 2) === "Gb" || note.substring(0, 2) === "Db" ||
               note.substring(0, 2) === "D#" || note.substring(0, 2) === "G#" ||
               note.substring(0, 2) === "A#"){
        continue;
      }
      const n = replaceSharp(note);
      const noteRow = document.querySelector('[id^=' + n + ']');
      noteRow.append(createColumnCell(note, lastColNum + 1, pianoRollObject));
    }
        
    currColHeadNum++;
    lastColNum++;
  }
}


// @param name: name of the instrument 
// @param createBool: true to create a new Instrument instance, false to not 
// @param pianoRollObject: instance of PianoRoll
function addNewInstrument(name, createBool, pianoRollObject){
  const instrumentTable = document.getElementById("instrumentTable");
  const newInstrument = document.createElement('td');
    
  // we want to be able to access the instruments in sequential order
  newInstrument.id = (pianoRollObject.instruments.length + 1);
  newInstrument.className = "instrument";
  newInstrument.style.backgroundColor = "transparent";
    
  if(name === undefined){
    newInstrument.textContent = "new_instrument";
  }else{
    newInstrument.textContent = name;
  }
  newInstrument.addEventListener('click', function(event){
    // pass the event target's id to chooseInstrument()
    chooseInstrument(event.target.id, pianoRollObject);
  });
    
  instrumentTable.appendChild(newInstrument);
    
  // when importing data, this createNewInstrument step is not needed
  if(createBool){
    createNewInstrument("new_instrument", pianoRollObject);
  }
}


try{
  module.exports = {
    addNote: addNote,
    createNewNoteElement: createNewNoteElement,
    highlightRow: highlightRow,
    clearGrid: clearGrid,
    clearGridAll: clearGridAll,
    addNewMeasure: addNewMeasure,
    deleteMeasure: deleteMeasure,
    chooseInstrument: chooseInstrument,
    drawNotes: drawNotes,
    showOnionSkin: showOnionSkin,
    onendFunc: onendFunc,
    changeTempo: changeTempo,
    addNewInstrument: addNewInstrument,
    getSubdivisionPositions: getSubdivisionPositions,
    canPlaceNote: canPlaceNote,
  };
}catch(e){
  // ignore 
}