/************** 

DOM MODIFICATION 

many functions here rely on an instance of
the PianoRoll class in classes.js 
and playbackFunctionality.js

these functions affect what's being displayed on the DOM 

***************/

// returns whther num is within leftLim and rightLim 
// @param num, leftLim, rightLim: an integer
// @return: true if num in range, else false 
function inRange(num, leftLim, rightLim){
	return num >= leftLim && num <= rightLim;
}

// add newNote to the hashmap currNotes 
// @param currNotes: a hashmap mapping HTML element ids to HTML elements 
// @param newNote: a HTML element representing a note
function addNoteToCurrInstrument(currNotes, newNote){
	currNotes[newNote.id] = newNote;
}

// gets a list of possible positions that a note could be placed within a grid cell / note container 
// @param containerElement: an HTML element representing a grid cell, where notes can be placed
// @param pianoRollObject: an instance of PianoRoll
// @return: a list of integers, with each integer representing a possible style.left value (in px) of a note of the container
function getSubdivisionPositions(containerElement, pianoRollObject){
	
	var targetContPos = containerElement.getBoundingClientRect().left + window.pageXOffset;
	var currLockType = pianoRollObject.lockNoteSize;
	var subdivisionCount = Math.floor(parseInt(containerElement.style.width) / (pianoRollObject.noteSizeMap[currLockType]));
	var possibleNotePos = [];
	
	for(var i = 0; i <= subdivisionCount; i++){
		possibleNotePos.push(targetContPos + (i * (pianoRollObject.noteSizeMap[currLockType])));
	}
	
	return possibleNotePos;
}

// checks to see if a note can be placed within a row cell / note container 
// @param posToPlace: an integer 
// @param currContainerChildren: an HTMLCollection of child nodes of an html element
// @return: true if posToPlace can hold a new note, else false
function canPlaceNote(posToPlace, currContainerChildren){
	// check to make sure posToPlace doesn't equal the left position of any of the 
	// children of the target container to place in - also, we only care about
	// children that are part of this current instrument's notes, so check opacity
	for(var i = 0; i < currContainerChildren.length; i++){
		var note = currContainerChildren[i];
		if((note.getBoundingClientRect().left + window.pageXOffset) === posToPlace &&
			note.style.opacity == 1){
			return false;
		}
	}
	
	return true;
}

// places a note at the position specified by evt 
// placement depends on the current note lock size
// @param note: an html element representing a note 
// @param pianoRollObject: an instance of PianoRoll
// @param evt: a MouseEvent 
// @return: the note that was placed if it was, else null
function placeNoteAtPosition(note, pianoRollObject, evt){
	
	var targetContainer = evt.target;
	
	if(!targetContainer.classList.contains("noteContainer")){
		if(targetContainer.classList.contains("noteElement")){
			targetContainer = targetContainer.parentNode;
		}else{
			return null;
		}
	}
	
	// a little tricky but note that the last entry in possibleNotePos will be the start position 
	// of the neighboring note container to the right!
	var possibleNotePos = getSubdivisionPositions(targetContainer, pianoRollObject);
	var currX = evt.x + window.pageXOffset;
	var lockNoteLength = pianoRollObject.noteSizeMap[pianoRollObject.lockNoteSize];
	var posToPlace = null;

	for(var i = 0; i < possibleNotePos.length; i++){
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
	
	// create a new note if no note was passed in (i.e. in addNote)
	if(!note){
		note = createNewNoteElement(pianoRollObject);
	}
	// update lastNoteSize (even if not placing, allow clicking an already
	// placed note to update the last selected size)
	pianoRollObject.lastNoteSize = parseInt(note.style.width);
	
	// make sure this current instrument doesn't already have a note in position to place
	if(canPlaceNote(posToPlace, targetContainer.children)){
		note.style.left = possibleNotePos[i] + "px";
		targetContainer.appendChild(note);
		return note;
	}

	return null;
}

// helper function to utilize a couple other arguments besides evt on mouse move 
// when resizing
// @param newNote: an html element representing a note 
// @param pianoRollObject: an instance of PianoRoll 
// @param evt: a MouseEvent
function resizeHelper(newNote, pianoRollObject, evt){
	
	if(newNote.style.opacity != 1){
		return;
	}
	
	evt.preventDefault();

	var pos = evt.x + window.pageXOffset;
	var diff = pos - (newNote.getBoundingClientRect().left + parseInt(newNote.style.width) + window.pageXOffset);

	var currLockType = pianoRollObject.lockNoteSize;
	var currNoteWidth = parseInt(newNote.style.width);
	var noteSize = pianoRollObject.noteSizeMap[currLockType];
	
	var nextBlockPos = window.pageXOffset + newNote.getBoundingClientRect().left + currNoteWidth + noteSize;
	var prevBlockPos = window.pageXOffset + newNote.getBoundingClientRect().left + currNoteWidth - noteSize;

	if(diff > 0){
		if(inRange(pos, nextBlockPos, nextBlockPos+3)){
			// extending
			if(evt.target.className === "noteContainer"){
				noteSize += parseInt(evt.target.style.borderRight);
			}
			newNote.style.width = (currNoteWidth + noteSize) + "px";
		}
	}else{
		// minimizing
		if(inRange(pos, prevBlockPos-3, prevBlockPos)){
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
	
	var currPos = evt.target.getBoundingClientRect().left + window.pageXOffset;
	var currNotes = pianoRollObject.currentInstrument.activeNotes;
	if(currNotes[currPos]){
		// remove newNote from the notes at this position since it's being moved
		currNotes[currPos] = currNotes[currPos].filter((note) => note !== newNote);
	}
	
	placeNoteAtPosition(newNote, pianoRollObject, evt);

}

// since this doesn't actually use a MouseEvent, can probably be moved into the function that takes the MouseEvent 
// on mouse up
function mouseupHelper(newNote, pianoRollObject, pianoRollInterface, eventsToRemove){
	
	// allow user to click on an already-placed note to hear it again
	// but not when resizing
	if(newNote.style.cursor !== "w-resize"){
		var waveType = pianoRollObject.currentInstrument.waveType; 
		clickNote(newNote.parentNode.id, waveType, pianoRollObject);
	}

	var currNotes = pianoRollObject.currentInstrument.activeNotes;
	addNoteToCurrInstrument(currNotes, newNote);
	
	pianoRollObject.lastNoteSize = parseInt(newNote.style.width);
	
	for(var event in eventsToRemove){
		pianoRollInterface.removeEventListener(event, eventsToRemove[event]);
	}
}

// pass in a hashmap for defined values?
// creates a new html element representing a note 
// @param pianoRollObject: an instance of PianoRoll
function createNewNoteElement(pianoRollObject){

	var newNote = document.createElement('div');
	newNote.setAttribute("volume", pianoRollObject.currentInstrument.volume);
	newNote.setAttribute("type", "default"); 
	newNote.style.background = "linear-gradient(90deg, rgba(0,158,52,1) 90%, rgba(52,208,0,1) 99%";
	newNote.style.height = "15px";
	newNote.style.position = "absolute";
	newNote.style.opacity = 1.0;
	newNote.classList.add("noteElement");
	newNote.classList.add("context-menu-one");
	newNote.id = "note" + pianoRollObject.noteIdNum++;
	
	if(pianoRollObject.addNoteSize === "last selected"){
		newNote.style.width = pianoRollObject.lastNoteSize + "px";
	}else{
		newNote.style.width = pianoRollObject.noteSizeMap[pianoRollObject.addNoteSize] + "px";
	}
	
	newNote.addEventListener("mousemove", function(e){
		e.preventDefault();
		
		// allow resize cursor to show when the mouse moves over the right edge of the note
		if(e.offsetX >= (parseInt(newNote.style.width) - 3)){
			newNote.style.cursor = "w-resize";
		}else{
			newNote.style.cursor = "";
		}
	});
	
	var pianoRollInterface = document.getElementById("piano");
	newNote.addEventListener("mousedown", function(e){
		
		if(newNote.style.opacity != 1){
			return;
		}
		
		e.preventDefault();
		e.stopPropagation();
		
		if(e.which == 2){
			// middle mouse button
			newNote.parentNode.removeChild(newNote);
			delete pianoRollObject.currentInstrument.activeNotes[newNote.id];
			return;
		}
		
		if(e.which === 3){
			// don't let right-click do anything
			return;
		}

		if(newNote.style.cursor === "w-resize"){
			
			function resizeNote(evt){
				resizeHelper(newNote, pianoRollObject, evt);
			}
			
			pianoRollInterface.addEventListener("mousemove", resizeNote);
			pianoRollInterface.addEventListener("mouseup", function mouseupResize(e){
				pianoRollObject.lastNoteSize = parseInt(newNote.style.width);
				pianoRollInterface.removeEventListener("mousemove", resizeNote);
				pianoRollInterface.removeEventListener("mouseup", mouseupResize);
			});
		}else{
			
			function moveNote(evt){
				moveHelper(newNote, pianoRollObject, evt);
			}
			
			var evtsToRemove = {
					"mousemove": moveNote,
					"mouseup": mouseupMove
			};
			
			function mouseupMove(evt){
				mouseupHelper(newNote, pianoRollObject, pianoRollInterface, evtsToRemove);
			}
			
			pianoRollInterface.addEventListener("mousemove", moveNote);
			pianoRollInterface.addEventListener("mouseup", mouseupMove);
		}
	});
	
	return newNote;
}

// used when clicking on a row cell/note container to add a new note 
// @param id: the html element id of a row cell to add a note to 
// @param pianoRollObject: instance of PianoRoll
// @param evt: a MouseEvent
function addNote(id, pianoRollObject, evt){
	
	var newNote = placeNoteAtPosition(null, pianoRollObject, evt);
	if(newNote){
		// play click sound if placing new note
		var waveType = pianoRollObject.currentInstrument.waveType; 
		clickNote(id, waveType, pianoRollObject);
	
		// add the note to the current instrument
		addNoteToCurrInstrument(pianoRollObject.currentInstrument.activeNotes, newNote);
	}
}

// used for highlighting the row of the grid the cursor is hovering over
// @param id: the html element id of a row cell / note container
// @param color: the color to highlight with 
function highlightRow(id, color){
	// get id of parent
	var parent = document.getElementById(id).parentNode.id;
	// highlight
	$('#' + parent).css('background-color', color);
}

// clear the notes of an instrument (which effectively clears the grid of their notes)
// @param instrument: an instance of Instrument to clear the notes for 
function clearGrid(instrument){
	var currNotes = instrument.activeNotes;
	for(var noteId in currNotes){
		var note = document.getElementById(noteId);
		note.parentNode.removeChild(note);
	}
	instrument.activeNotes = {};
	instrument.notes = [];
}

// @param pianoRollObject: instance of PianoRoll
function clearGridAll(pianoRollObject){
	for(var i = 0; i < pianoRollObject.instruments.length; i++){
		clearGrid(pianoRollObject.instruments[i]);
	}
}

// @param pianoRollObject: instance of PianoRoll
function addNewMeasure(pianoRollObject){
	
	// updating the measure count - notice specific id of element! 
	$('#measures').text( "number of measures: " + (parseInt($('#measures').text().match(/[0-9]{1,}/g)[0]) + 1) );
	
	// get the column header node to insert new column headers for the new measure
	var columnHeaderParent = document.getElementById('columnHeaderRow');
	
	// new column headers 
	for(var i = 0; i < pianoRollObject.subdivision; i++){
		var newHeader = document.createElement('div');
		newHeader.id = "col_" + (pianoRollObject.numberOfMeasures * pianoRollObject.subdivision + i);
		newHeader.style.margin = "0 auto";
		newHeader.style.display = 'inline-block';		
		
		if(i + 1 === pianoRollObject.subdivision){
			newHeader.className = "thickBorder";
		}else{
			if(i !== 0){
				// no border just for the first column header (when i == 0) in a measure
				newHeader.className = "thinBorder";
			}
		}
		
		newHeader.style.textAlign = "center";
		newHeader.style.width = '40px';
		newHeader.style.height = '12px';
		newHeader.style.fontSize = '10px';
		
		// deprecated: can probably remove
		// 0 == false; i.e. does not have a note in the column
		newHeader.setAttribute("hasNote", 0); 
		
		if(i !== 0){
			// don't label the first header column since that's the measure number 
			newHeader.textContent = i + 1;
		}
		
		// attach highlightHeader function to allow user to specify playing to start at this column 
		newHeader.addEventListener("click", function(){highlightHeader(this.id, pianoRollObject)} );
		
		columnHeaderParent.appendChild(newHeader);
		
		// mark the measure number 
		if(i === 0){
			var measureNumber = document.createElement("h2");
			measureNumber.innerHTML = (pianoRollObject.numberOfMeasures + 1);
			measureNumber.style.margin = '0 0 0 0';
			measureNumber.style.color = '#2980B9';
			newHeader.appendChild(measureNumber);
		}
	}
	
	// now add new columns for each note
	// note specific id of element 
	var noteRows = $('#piano').children().get();
	
	// start at 1 to skip column header row 
	for(var j = 1; j < noteRows.length; j++){
		for(var k = 0; k < pianoRollObject.subdivision; k++){
			
			// get the parent element for this row
			var rowParent = noteRows[j];
			var newColumn = document.createElement("div");
			
			newColumn.id = noteRows[j].id + "col_" + ((pianoRollObject.numberOfMeasures * pianoRollObject.subdivision) + k);
			newColumn.id = replaceSharp(newColumn.id);
			
			newColumn.style.display = 'inline-block';
			newColumn.style.width = '40px';
			newColumn.style.height = '15px';
			newColumn.style.verticalAlign = "middle";
			newColumn.style.backgroundColor = "transparent";
			newColumn.className = "noteContainer";
			newColumn.setAttribute("volume", pianoRollObject.currentInstrument.volume);
			newColumn.setAttribute("type", "default"); // note syle
			
			if((k + 1) % pianoRollObject.subdivision == 0){
				newColumn.classList.add("thickBorder");
			}else{
				newColumn.classList.add("thinBorder");
			}

			// hook up an event listener to allow for selecting notes on the grid!
			(function(newColumn){
				newColumn.addEventListener("click", function(evt){
					addNote(newColumn.id, pianoRollObject, evt, true);
				}); 
			})(newColumn);
			
			// allow for highlighting to make it clear which note a block is
			newColumn.addEventListener("mouseenter", function(){ highlightRow(this.id, pianoRollObject.highlightColor) });
			newColumn.addEventListener("mouseleave", function(){ highlightRow(this.id, 'transparent') });
			rowParent.appendChild(newColumn);
		}
		// adjust width of row 
		noteRows[j].style.width = parseInt(noteRows[j].style.width) + 20 + "%";
	}
	pianoRollObject.numberOfMeasures++;
}

/****

	TODO: delete a measure 
	
****/
function deleteMeasure(pianoRollObject){
	
	// check how many measures exist first. if none, don't do anything. 
	if(pianoRollObject.numberOfMeasures === 0){
		return;
	}
	
	// TODO: finish me
}


// @param thisElement: the id of an html element representing an instrument
// @param pianoRollObject: an instance of PianoRoll 
function chooseInstrument(thisElement, pianoRollObject){
	
	// look at grid, collect the notes, save them to the current instrument, and
	// move on to the clicked-on instrument
	pianoRollObject.currentInstrument.notes = readInNotes(pianoRollObject.currentInstrument, pianoRollObject);
	
	// reset the playMarker because the previously-set marker might be a column header 
	// that doesn't exist anymore (i.e. because of subdivision or rejoining)
	var prevMarker = document.getElementById(pianoRollObject.playMarker);
	if(prevMarker){
		prevMarker.style.backgroundColor = "#fff";
	}
	pianoRollObject.playMarker = null;
	
	// instrumentTable is specific to my implementation
	var instrumentsView = document.getElementById('instrumentTable').children;

	// change other instruments' label background color to transparent
	for(var i = 0; i < instrumentsView.length; i++){
		if(instrumentsView[i]){
			instrumentsView[i].style.backgroundColor = "transparent";
			
			// detach context menu from old instrument 
			instrumentsView[i].classList.remove("context-menu-instrument");
		}
	}

	// get index of clicked-on instrument in instrumentTable and subtract 1 to
	// account for 0-index when we use it to look in pianoRoll object 'instruments' 
	// array for the corresponding instrument object
	var index = parseInt(thisElement) - 1;
	
	// then change current instrument to the one clicked on 
	pianoRollObject.currentInstrument = pianoRollObject.instruments[index];
	
	// attach new context menu only to current instrument via class name
	document.getElementById('instrumentTable').children[index].classList.add("context-menu-instrument");
	
	showOnionSkin(pianoRollObject);
	
	// then draw the previously-saved notes, if any, onto the grid of the clicked-on instrument
	drawNotes(pianoRollObject.currentInstrument); 
	
	$('#' + thisElement).css('background-color', pianoRollObject.instrumentTableColor);
	
}

// changes all the notes of the given instrument to opacity 1.0, making them fully visible
// @param instrumentObject: instance of Instrument
function drawNotes(instrumentObject){
	
	var notes = instrumentObject.activeNotes;
	
	for(var n in notes){
		notes[n].classList.add("context-menu-one");
		notes[n].style.opacity = 1.0;
		notes[n].style.zIndex = 100;
	}

	// deprecated: can probably remove 
	resetHeaders();
}

// deprecated. can probably remove.
function resetHeaders(){
	var columnHeaders = document.getElementById("columnHeaderRow").children;
	
	for(var k = 0; k < columnHeaders.length; k++){
		columnHeaders[k].setAttribute('hasnote', 0);
	}
}


// this function relies on an INPUT box's ID to get the user-inputted tempo
// @param pianoRollObject: instance of PianoRoll
function changeTempo(pianoRollObject){
	var tempoInput = document.getElementById("changeTempo");
	var selectedTempo = parseInt(tempoInput.value);
	var tempoText = document.getElementById("tempo");
	tempoText.innerHTML = selectedTempo + " bpm";
	
	// getting milliseconds PER EIGHTH NOTE (1 block on grid)
	pianoRollObject.currentTempo = ((Math.round((60000 / selectedTempo) * 1000)) / 2000 );
	
	// go through all instruments and adjust duration of each note in their note arrays
	// according to new current tempo
	for(var i = 0; i < pianoRollObject.instruments.length; i++){
		if(pianoRollObject.instruments[i] !== pianoRollObject.currentInstrument){
			var noteArray = pianoRollObject.instruments[i].notes;
			for(var j = 0; j < noteArray.length; j++){
				if(noteArray[j].duration > 1){
					noteArray[j].duration = getCorrectLength(noteArray[j].block.length, pianoRollObject);
				}
			}
		}
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
	// highlight where the current note playing is. obviously, since it's
	// onended it's a bit laggy... but it gives a good idea of where the piece is 
	// and it works just the same on low and high tempi 
***/
var lastNote = null;
var onendFunc = function(x, pianoRoll){ 
	return function(){

		// take away highlight of previous note 
		if(lastNote && pianoRoll.playMarker !== lastNote.id){
			lastNote.style.backgroundColor = '#fff';
		}
		
		var column = x.substring(x.indexOf('col'));
		if(document.getElementById(column) === null){
			column = x.substring(x.indexOf('col'), x.indexOf('-'));
		}
		
		var currNote = document.getElementById(column);
		if(pianoRoll.isPlaying && pianoRoll.playMarker !== currNote.id){
			document.getElementById(column).style.backgroundColor = pianoRoll.currNotePlayingColor;
		}

		lastNote = currNote;
	}
};


// see where the other instruments' notes are
// if an instrument has onionSkinOn unchecked, then they will not have 
// their notes shown as onion skin 
// onion skin opacity is currently set to 0.3.
// @param: pianoRollObject: instance of PianoRoll
function showOnionSkin(pianoRollObject){
	for(var i = 0; i < pianoRollObject.instruments.length; i++){
		var currInstrument = pianoRollObject.instruments[i];
		if(currInstrument !== pianoRollObject.currentInstrument){
			var activeNotes = currInstrument.activeNotes;
			for(var activeNote in activeNotes){
				var note = activeNotes[activeNote];
				if(!currInstrument.onionSkinOn){
					note.style.opacity = 0.0;
				}else{
					note.style.opacity = 0.3;
				}
				note.style.zIndex = 0;
				note.classList.remove("context-menu-one");
			}
		}
	}
}

// @param name: name of the instrument 
// @param createBool: true to create a new Instrument instance, false to not 
// @param pianoRollObject: instance of PianoRoll
function addNewInstrument(name, createBool, pianoRollObject){
	var instrumentTable = document.getElementById("instrumentTable");
	var newInstrument = document.createElement('td');
	
	// we want to be able to access the instruments in sequential order
	newInstrument.id = "" + (pianoRollObject.instruments.length + 1); 
	newInstrument.setAttribute("selected", "0");
	newInstrument.style.backgroundColor = "transparent";
	
	if(name === undefined){
		newInstrument.innerHTML = "new_instrument";
	}else{
		newInstrument.innerHTML = name;
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
		highlightRow: highlightRow,
		clearGrid: clearGrid,
		clearGridAll: clearGridAll,
		showCurrentNote: showCurrentNote,
		addNewMeasure: addNewMeasure,
		deleteMeasure: deleteMeasure,
		chooseInstrument: chooseInstrument,
		drawNotes: drawNotes,
		resetHeaders: resetHeaders,
		showOnionSkin: showOnionSkin,
		onendFunc: onendFunc,
		changeTempo: changeTempo,
		addNewInstrument: addNewInstrument,
	};
}catch(e){
	// ignore 
}