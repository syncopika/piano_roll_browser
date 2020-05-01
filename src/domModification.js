/************** 

DOM MODIFICATION 

many functions here rely on an instance of
the PianoRoll class in classes.js 

and playbackFunctionality.js

these functions affect what's being displayed on the DOM 

***************/

// TODO: add to pianoroll?
var noteSizeMap = {
	"8th": 40,
	"16th": 20,
	"32nd": 10,
}

function inRange(num, leftLim, rightLim){
	return num >= leftLim && num <= rightLim;
}


function resizeHelper(newNote, evt){
	
	if(newNote.style.opacity != 1){
		return;
	}
	
	evt.preventDefault();

	var pos = evt.x + window.pageXOffset;
	var diff = pos - (newNote.getBoundingClientRect().left + parseInt(newNote.style.width) + window.pageXOffset);

	var currLockType = document.getElementById("lockType").selectedOptions[0].value;
	var currNoteWidth = parseInt(newNote.style.width);
	var noteSize = noteSizeMap[currLockType];
	
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

function moveHelper(newNote, pianoRoll, evt){
	
	evt.preventDefault();
	
	if(newNote.style.opacity != 1){
		return;
	}
	
	var currPos = evt.target.getBoundingClientRect().left + window.pageXOffset;
	var currNotes = pianoRoll.currentInstrument.activeNotes;
	if(currNotes[currPos]){
		currNotes[currPos] = currNotes[currPos].filter((note) => note !== newNote);
	}
	
	var currLockType = document.getElementById("lockType").selectedOptions[0].value;
	var targetContainer = (evt.target === newNote) ? newNote.parentNode : evt.target;
	
	if(!targetContainer.classList.contains("noteContainer")){
		if(targetContainer.classList.contains("noteElement")){
			targetContainer = targetContainer.parentNode;
		}else{
			return;
		}
	}
	
	var targetContPos = targetContainer.getBoundingClientRect().left + window.pageXOffset;
	var subdivisionCount = Math.floor(parseInt(targetContainer.style.width) / (noteSizeMap[currLockType]));
	var possibleNotePos = [];
	
	// a little tricky but note that the last entry in possibleNotePos will be the start position 
	// of the neighboring note container to the right!
	for(var i = 0; i <= subdivisionCount; i++){
		possibleNotePos.push(targetContPos + (i * (noteSizeMap[currLockType])));
	}
	
	var currX = evt.x + window.pageXOffset;
	var lockNoteLength = noteSizeMap[currLockType];

	for(var i = 0; i < possibleNotePos.length; i++){
		if(Math.abs(possibleNotePos[i] - currX) <= 8){
			newNote.style.left = possibleNotePos[i] + "px";
			if(i === possibleNotePos.length - 1){
				// if the closest boundary is the last entry in possibleNotePos,
				// it's the next note container over to the right.
				targetContainer = targetContainer.nextSibling;
			}
			targetContainer.appendChild(newNote);
			break;
		}
	}

}

// newNote is an html element representing a note 
// currNotes is a dictionary (activeNotes of an instrument)
function addNoteToCurrInstrument(currNotes, newNote){
	currNotes[newNote.id] = newNote;
}


// can we move back to addEventListener as a named function?
function mouseupHelper(newNote, pianoRoll, pianoRollInterface, eventsToRemove){
	
	// allow user to click on an already-placed note to hear it again
	// but not when resizing
	if(newNote.style.cursor !== "w-resize"){
		var waveType = pianoRoll.currentInstrument.waveType; 
		clickNote(newNote.parentNode.id, waveType, pianoRoll);
	}

	var currNotes = pianoRoll.currentInstrument.activeNotes;
	
	addNoteToCurrInstrument(currNotes, newNote);
	
	for(var event in eventsToRemove){
		pianoRollInterface.removeEventListener(event, eventsToRemove[event]);
	}
}

/****

	make notes clickable / toggle active note (green) 

****/
function addNote(id, pianoRollObject, clickSound){
	
	var newNote = document.createElement('div');
	newNote.setAttribute("volume", pianoRollObject.currentInstrument.volume);
	newNote.setAttribute("length", "eighth"); 
	newNote.setAttribute("type", "default"); 
	newNote.style.background = "linear-gradient(90deg, rgba(83,181,52,1) 90%, rgba(149,218,141,1) 99%";
	
	//TODO: refactor this 
	if(pianoRollObject.addNoteSize === "8th"){ 
		newNote.style.width = "40px";
	}else if(pianoRollObject.addNoteSize === "16th"){
		newNote.style.width = "20px";
	}else if(pianoRollObject.addNoteSize === "32nd"){
		newNote.style.width = "10px";
	}else{
		newNote.style.width = "40px";
	}
	
	newNote.style.height = document.getElementById(id).style.height;
	newNote.style.position = "absolute";
	newNote.style.opacity = 1.0;
	newNote.classList.add("noteElement");
	newNote.classList.add("context-menu-one");
	newNote.id = "note" + pianoRollObject.noteIdNum++;
	
	var pianoRollInterface = document.getElementById("piano");

	document.getElementById(id).appendChild(newNote);
	newNote.style.left = newNote.getBoundingClientRect().left + window.pageXOffset + "px";
	
	if(clickSound){
		var waveType = pianoRoll.currentInstrument.waveType; 
		clickNote(newNote.parentNode.id, waveType, pianoRoll);
	}
	
	newNote.addEventListener("mousemove", function(e){
		// allow resize cursor to show when the mouse moves over the right edge
		// of the note
		e.preventDefault();
		
		if(e.offsetX >= (parseInt(newNote.style.width) - 3)){
			newNote.style.cursor = "w-resize";
		}else{
			newNote.style.cursor = "";
		}
	});
	
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

		if(newNote.style.cursor === "w-resize"){
			
			function resizeNote(evt){
				resizeHelper(newNote, evt);
			}
			
			pianoRollInterface.addEventListener("mousemove", resizeNote);
			pianoRollInterface.addEventListener("mouseup", function mouseup(e){
				pianoRollInterface.removeEventListener("mousemove", resizeNote);
				pianoRollInterface.removeEventListener("mouseup", mouseup);
			});
		}else{
			
			function moveNote(evt){
				moveHelper(newNote, pianoRollObject, evt);
			}
			
			var evtsToRemove = {
					"mousemove": moveNote,
					"mouseup": mouseUp
			};
			
			function mouseUp(evt){
				mouseupHelper(newNote, pianoRollObject, pianoRollInterface, evtsToRemove);
			}
			
			pianoRollInterface.addEventListener("mousemove", moveNote);
			pianoRollInterface.addEventListener("mouseup", mouseUp);
		}
	});
	
	// add the note to the current instrument
	addNoteToCurrInstrument(pianoRollObject.currentInstrument.activeNotes, newNote);
	
	return newNote;
}


/****

	highlight row
	- used when mouseover 

****/
function highlightRow(id, color){
	// get id of parent
	var parent = document.getElementById(id).parentNode.id;
	// highlight
	$('#' + parent).css('background-color', color);
}

/****

	just remove any child nodes, if any for current instrument
	
****/
function clearGrid(instrument){
	var currNotes = instrument.activeNotes;
	for(var noteId in currNotes){
		var note = document.getElementById(noteId);
		note.parentNode.removeChild(note);
	}
	instrument.activeNotes = {};
	instrument.notes = [];
}

/****

	clears all instruments' notes

****/
function clearGridAll(pianoRollObject){
	for(var i = 0; i < pianoRollObject.instruments.length; i++){
		clearGrid(pianoRollObject.instruments[i]);
	}
}

/****

	add a new measure

****/
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
		
		// 0 == false; i.e. does not have a note in the column
		// this attribute should help optimize performance a bit
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
			
			// adjust id if needed
			newColumn.id = replaceSharp(newColumn.id);
			newColumn.style.display = 'inline-block';
			newColumn.style.width = '40px';
			newColumn.style.height = '15px';
			newColumn.style.verticalAlign = "middle";
			newColumn.style.backgroundColor = "transparent";
			newColumn.className = "noteContainer";
			
			// IMPORTANT! new attributes for each note
			newColumn.setAttribute("volume", pianoRollObject.currentInstrument.volume);
			newColumn.setAttribute("length", "eighth");
			newColumn.setAttribute("type", "default"); // note syle
			
			if((k + 1) % pianoRollObject.subdivision == 0){
				newColumn.classList.add("thickBorder");
			}else{
				newColumn.classList.add("thinBorder");
			}

			// hook up an event listener to allow for selecting notes on the grid!
			(function(newColumn){
				newColumn.addEventListener("click", function(e){
					
					//console.log("evt.x: " + e.x);
					//console.log("evt.pageX: " + e.pageX);
					//console.log(e.target);
					
					//var waveType = pianoRollObject.currentInstrument.waveType; 
					//clickNote(newColumn.id, waveType, pianoRollObject);
	
					if(newColumn.childNodes.length === 0){
						addNote(newColumn.id, pianoRollObject, true);
					}else if(newColumn.childNodes.length > 0){
						var onlyHasOther = true;
						newColumn.childNodes.forEach(function(note){
							if(note.style.opacity == 1){
								onlyHasOther = false;
							}
						});
						if(onlyHasOther){
							addNote(newColumn.id, pianoRollObject, true);
						}
					}
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

	delete a measure 
	
****/
function deleteMeasure(pianoRollObject){
	
	// check how many measures exist first. if none, don't do anything. 
	if(pianoRollObject.numberOfMeasures === 0){
		return;
	}
	
	// delete all current instrument notes
	
}


/****

	choose instrument
 
****/
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

	// change current instrument's notes to onion skin 
	for(activeNote in pianoRollObject.currentInstrument.activeNotes){
		
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

/****

	sets the notes of the passed-in instrument to opacity of 1.0

****/
function drawNotes(instrumentObject){
	
	var notes = instrumentObject.activeNotes;
	
	for(var n in notes){
		notes[n].style.opacity = 1.0;
		notes[n].classList.add("context-menu-one");
		notes[n].style.zIndex = 100;
	}

	// reset headers first (i.e. clear columns with hasnote === 1)
	// TODO: remove? do we want this anymore?
	resetHeaders();
}

/****

	function to reset "hasnote" attribute for column headers 
	necessary for when changing instruments, because 'hasnote' should  
	reflect whether a note exists in a column for only the current instrument 
	
*****/
function resetHeaders(){
	var columnHeaders = document.getElementById("columnHeaderRow").children;
	
	for(var k = 0; k < columnHeaders.length; k++){
		columnHeaders[k].setAttribute('hasnote', 0);
	}
}

/***

	change tempo 

	this function relies on an INPUT box's ID to get the user-inputted tempo

***/
function changeTempo(pianoRollObject){
	var tempoInput = document.getElementById("changeTempo");
	var selectedTempo = parseInt(tempoInput.value);
	var tempoText = document.getElementById("tempo");
	tempoText.innerHTML = selectedTempo + " bpm";
	
	// initially getting milliseconds FOR QUARTER NOTES (that's 2 blocks on the grid)
	// note that currentTempo needs to be rounded before use
	pianoRollObject.currentTempo = ((Math.round((60000 / selectedTempo) * 1000)) / 1000 );
	
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

/***

	change time signature and subdivision (can only switch between 4/4 and 3/4)

***/
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


/****

	Onion skin feature

****/
// see where the other instruments' notes are 
function showOnionSkin(pianoRollObject){
	for(var i = 0; i < pianoRollObject.instruments.length; i++){
		if(pianoRollObject.instruments[i].name !== pianoRollObject.currentInstrument.name){
			// go through each instrument's activeNotes
			var activeNotes = pianoRollObject.instruments[i].activeNotes;
			for(var activeNote in activeNotes){
				var note = activeNotes[activeNote];
				note.style.opacity = 0.5;
				note.classList.remove("context-menu-one");
				note.style.zIndex = 0;
			}
		}
	}
}

/****

	add a new instrument 

****/
function addNewInstrument(name, bool, pianoRollObject){
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
	
	// bool is not false - if a new instrument needs to be created
	// - when importing data, this createNewInstrument step is not needed
	if(bool !== false){
		createNewInstrument("new_instrument", pianoRollObject);
	}
}


try{
	module.exports = { 
		clickNote: clickNote,
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