/************** 

DOM MODIFICATION 

many functions here rely on an instance of
the PianoRoll class in classes.js 

these functions affect what's being displayed on the DOM 

***************/


/****

	plays the corresponding pitch of a block when clicked 

****/
function clickNote(id, waveType, pianoRollObject){

	// resume the context per the Web Audio autoplay policy 
	pianoRollObject.audioContext.resume().then(() => {

		if(waveType === "percussion"){
			clickPercussionNote(id, pianoRollObject);
		}else{
			
			var parent = document.getElementById(id).parentNode.id;
			parent = parent.replace('s', '#'); // replace any 's' with '#' so we can match a key in noteFrequencies
			
			// create a new oscillator just for this note 
			var osc = pianoRollObject.audioContext.createOscillator();
			osc.type = waveType;
			osc.frequency.setValueAtTime(pianoRollObject.noteFrequencies[parent], 0);
			
			// borrow the currentInstrument's gain node 
			var gain = pianoRollObject.currentInstrument.gain;
			osc.connect(gain);
			
			// set the volume of a clicked note to whatever the current isntrument's volume is 
			gain.gain.setTargetAtTime(pianoRollObject.currentInstrument.volume, pianoRollObject.audioContext.currentTime, 0.002);
			osc.start(0);
			
			// silence the oscillator 
			gain.gain.setTargetAtTime(0, pianoRollObject.audioContext.currentTime + 0.080, 0.002);
			osc.stop(pianoRollObject.audioContext.currentTime + .100);
			
		}

	});
}

function clickPercussionNote(id, pianoRollObject){
	
	var parent = document.getElementById(id).parentNode.id;
	parent = parent.replace('s', '#')
	
	var context = pianoRollObject.audioContext;
	var gain = pianoRollObject.currentInstrument.gain;
	var time = pianoRollObject.audioContext.currentTime;
	var octave = parseInt(parent.match(/[0-9]/g)[0]);
	var volume = pianoRollObject.currentInstrument.volume;
	
	if(octave >= 2 && octave <= 4){
		// kick drum 
		pianoRollObject.PercussionManager.kickDrumNote(pianoRollObject.noteFrequencies[parent], volume, time, false);
		
	}else if(octave === 5){
		// snare drum 
		pianoRollObject.PercussionManager.snareDrumNote(pianoRollObject.noteFrequencies[parent], volume, time, false);
		
	}else{
		// hi-hat 
		pianoRollObject.PercussionManager.hihatNote(volume, time, false);
	}
}



/****

	make notes clickable / toggle active note (green) 

****/
function addNote(id, pianoRollObject){
	
	// make sure concatenated note blocks are unclickable!
	var blockHeader = document.getElementById(id.substring(id.indexOf("col_")));
	if(blockHeader.getAttribute('hasnote') < 0){
		var waveType = pianoRollObject.currentInstrument.waveType; 
		clickNote(id, waveType, pianoRollObject);
		return;
	}
	
	// if note is already green 
	if($('#' + id).css("background-color") === "rgb(0, 178, 0)"){
	
		// take away green color 
		$('#' + id).css("background-color", "transparent");
		
		// update attributes
		$('#' + id).attr("volume", 0.0);
		
		// change hasNote attribute to false (0) in column header
		var headerId = id.substring(id.indexOf("col"));
		document.getElementById(headerId).setAttribute("hasNote", 0);
		
		// update right border (this is only really needed for concatenated note blocks i.e. length = eighth-eighth)
		// NOTE: the method changeRightBorder is defined in context_menus.js!!
		changeRightBorder(id, "add", pianoRollObject.subdivision);
		
		// if neighbor is green, make sure their column's hasnote is 1!
		// this is important only for concatenated note blocks 
		if(document.getElementById(id).nextSibling){
			var neighbor = document.getElementById(id).nextSibling.id;
			var neighborHeader = document.getElementById(neighbor.substring(neighbor.indexOf("col_")));
			if(neighborHeader.getAttribute("hasnote") < 0){
				// change hasnote attribute to 1
				neighborHeader.setAttribute("hasnote", 1);
				
				// truncate the current note's length attribute by 1 
				// i.e. if currently eighth-eighth, make it eighth (remove the first one)
				var currLength = document.getElementById(id).getAttribute("length");
				
				// use the removed substring and make it the current note's new length 
				// in other words it just takes on its old length before concatenation
				var oldLength = currLength.substring(0, currLength.indexOf('-'));
				$('#' + id).attr("length", oldLength);
				
				var newLength = currLength.substring(currLength.indexOf('-') + 1);
				document.getElementById(neighbor).setAttribute("length", newLength);
				
				// also add the neighbor's entry in activeNotes 
				pianoRollObject.currentInstrument.activeNotes[neighbor] = newLength.split('-').length;
			}
		}
		
		// remove this note from currentInstrument's activeNotes assoc. array 
		delete pianoRollObject.currentInstrument.activeNotes[id];
		
		// if you choose a same note for the current instrument as another instrument, that will wipe out the 
		// 'onion-skin' of the other instrument's note. but if you delete that note for
		// the current instrument later, calling showOnionSkin() here will put back the 'onion-skin' for
		// the other instrument. there is no static 'onion-skin' layer. 
		// it's just changing the background-color of note blocks
		showOnionSkin(pianoRollObject); 
		
	}else{
		// update attributes 
		$('#' + id).attr("volume", pianoRollObject.currentInstrument.volume);
		
		// what if the user wants to add more than 1 note in a column? we can allow that, but extra notes will be discarded (can't do polyphony with same oscillator?)
		var headerId = id.substring(id.indexOf("col"));
		var currValue = parseInt(document.getElementById(headerId).getAttribute("hasNote"));
		if(currValue !== 1){
			// if no note added to this column yet
			$('#' + id).css("background-color", "rgb(0, 178, 0)");
			
			// add the note to the currentInstrument's activeNotes attribute (an associative array)
			pianoRollObject.currentInstrument.activeNotes[id] = 1;
		
			//change hasNote attribute to true in column header
			document.getElementById(headerId).setAttribute("hasNote", 1); // set it to 1, no matter how many notes are added to the column 
		}
	}
	var waveType = pianoRollObject.currentInstrument.waveType; 
	clickNote(id, waveType, pianoRollObject);
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

	delete all notes - clear the grid
	- does not alter subdivisions
	- does not clear onion skin!
	- only clears current instrument's notes 
    - don't forget active notes of current instrument!
	
****/
function clearGrid(pianoRollObject){
	var columns = document.getElementById("columnHeaderRow").children;

	// start at 1 to ignore the column before 1 (the blank one)
	for(var i = 1; i < columns.length; i++){
		if(columns[i].getAttribute("hasnote") !== "0"){
			// change hasnote attribute back to 0!
			columns[i].setAttribute("hasnote", "0");
			var columnToCheck = $("div[id$='" + columns[i].id + "']").get();
			for(var j = 0; j < columnToCheck.length; j++){
				if(columnToCheck[j].style.backgroundColor === "rgb(0, 178, 0)"){
					columnToCheck[j].style.backgroundColor = "transparent";
				}
				if(columnToCheck[j].style.background !== ""){
					columnToCheck[j].style.background = "";
				}
			}
		}
	}
	
	// reset activeNotes for current instrument
	pianoRollObject.currentInstrument.activeNotes = {};
}

/****

	like clearGrid, but clears EVERYTHING and rejoins any subdivisions 

****/
function clearGridAll(pianoRollObject){
	var columns = document.getElementById("columnHeaderRow").children;

	// start at 1 to ignore the column before 1 (the blank one)
	for(var i = 1; i < columns.length; i++){

		// change hasnote attribute back to 0!
		columns[i].setAttribute("hasnote", "0");
		var columnToCheck = $("div[id$='" + columns[i].id + "']").get();
		for(var j = 0; j < columnToCheck.length; j++){
			if(columnToCheck[j].style.backgroundColor !== "transparent"){
				columnToCheck[j].style.backgroundColor = "transparent";
			}
			if(columnToCheck[j].style.background !== ""){
				columnToCheck[j].style.background = "";
			}
		}
		
		if(columns[i].id.indexOf("-1") > 0){
			// is the boolean value really doing anything? look into this. 
			rejoin(columns[i].id, true, pianoRollObject);
		}
	}
	
	// reset activeNotes for all instruments
	for(var j = 0; j < pianoRollObject.instruments.length; j++){
		pianoRollObject.instruments[j].activeNotes = {};
	}
}

/****

	add a new measure

****/
function addNewMeasure(pianoRollObject){
	
	//console.log("adding new measure");
	//console.log(pianoRollObject.numberOfMeasures)

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
			newHeader.style.borderRight = "3px solid #000";
		}else{
			newHeader.style.borderRight = "1px solid #000";
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
			newHeader.style.borderRight = "1px solid transparent";
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
			
			// IMPORTANT! new attributes for each note
			newColumn.setAttribute("volume", "0.3");
			newColumn.setAttribute("length", "eighth"); 
			newColumn.setAttribute("type", "default"); 
			newColumn.className = "context-menu-one";
			
			if((k + 1) % pianoRollObject.subdivision == 0){
				newColumn.style.borderRight = "3px solid #000";
			}else{
				newColumn.style.borderRight = "1px solid #000";
			}

			// hook up an event listener to allow for selecting notes on the grid!
			//notice passing in id of option/select element for picking wave type. 
			newColumn.addEventListener("click", function(){ addNote(this.id, pianoRollObject) }); 
			// allow for highlighting to make it clear which note a block is
			newColumn.addEventListener("mouseenter", function(){ highlightRow(this.id, '#FFFF99') });
			newColumn.addEventListener("mouseleave", function(){ highlightRow(this.id, 'transparent') });
			rowParent.appendChild(newColumn);
		}
		// adjust width of row 
		noteRows[j].style.width = parseInt(noteRows[j].style.width) + 20 + "%";
	}
	pianoRollObject.numberOfMeasures++; // increment measure variable of piano roll
}

/****

	delete a measure 

	WHAT IF THERE ARE NOTES IN IT??
	
****/
function deleteMeasure(pianoRollObject){
	
	// check how many measures exist first. if none, don't do anything. 
	if(pianoRollObject.numberOfMeasures === 0){
		return;
	}
	
	var confirmDelete = confirm('Are you sure? Please make sure all notes are deleted from the measure first.');
	
	if(confirmDelete){
	
		// take current number of measures and multiply
		// by 8 to know how many columns there are 
		var currColumns = pianoRollObject.numberOfMeasures * 8;
		
		// subtract 8 from currColumns - because 8 eighth notes per measure (4 quarter notes)
		currColumns -= 8;
		
		// so currColumns is now the number of the first 
		// column to remove 
		for(var i = currColumns; i < currColumns + 8; i++){
			// get all the columns that have the current number, i
			var columns = $("div[id*='" + "col_" + i + "']");
			//console.log(columns);
			for(var j = 0; j < columns.length; j++){
				columns[j].remove();
			}
		}

		pianoRollObject.numberOfMeasures--;
		// update text
		var mtext = document.getElementById('measures');
		mtext.textContent = "number of measures: " + pianoRollObject.numberOfMeasures;
	}
}


/****

	choose instrument
 
****/
function chooseInstrument(thisElement, pianoRollObject){
	
	// look at grid, collect the notes, save them to the current instrument, and
	// move on to the clicked-on instrument
	pianoRollObject.currentInstrument.notes = readInNotes(pianoRollObject);
	
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
		// ok problem here: when switching instruments, subdivided blocks may not exist for the instrument being switched to! 
		// console.log(activeNote);
		// for now (temporarily) as a quick fix, just skip null elements (WILL LEAVE EMPTY SPACES THOUGH)
		if(!document.getElementById(activeNote)){
			continue;
		}
		
		// important if a concatenated note block! 
		var activeNoteCount = pianoRollObject.currentInstrument.activeNotes[activeNote];
		var boldBorder;
		if(activeNoteCount > 1){
			var currNote = document.getElementById(activeNote);
			for(var j = 0; j < activeNoteCount; j++){
				currNote.style.backgroundColor = "rgba(0, 178, 0, 0.2)";
				
				// fix lengths so they won't cause trouble for the chosen instrument
				var currLength = currNote.getAttribute("length");
				if(currLength.indexOf('-') > 0){
					currNote.setAttribute("length", currLength.substring(0, currLength.indexOf('-')));
				}
				
				// fix border (note that changeRightBorder is defined in context_menus.js)
				changeRightBorder(currNote.id, "add", pianoRollObject.subdivision);	
				currNote = currNote.nextSibling;
			}		
		}else{
			// if not a concatenated note block 
			document.getElementById(activeNote).style.backgroundColor = "rgba(0, 178, 0, 0.2)";
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
	
	// then draw the previously-saved notes, if any, onto the grid of the clicked-on instrument
	drawNotes(pianoRollObject.currentInstrument, pianoRollObject); 
	
	showOnionSkin(pianoRollObject);
	
	$('#' + thisElement).css('background-color', 'rgb(188,223,70)');
	
}

/****

	draw notes back on to grid

****/
// takes an instrument object and uses its notes array data to draw back the notes
function drawNotes(instrumentObject, pianoRollObject){
	
	var notes = instrumentObject.notes;

	// reset headers first (i.e. clear columns with hasnote === 1)
	resetHeaders();
	
	for(var i = 0; i < notes.length; i++){
		
		// if the frequency of a note is 0, it's a rest and so nothing needs to be drawn
		if(notes[i].freq === 0){
			continue;
		}
		
		var elementExists = document.getElementById( notes[i].block.id );

		// if we need to paint in an eighth note, but the column is currently subdivided 
		var elementLength = notes[i].block.length.split('-');
		if(!elementExists && elementLength[0] === "eighth"){
			
			var blockId = notes[i].block.id;
			
			rejoin(blockId, true, pianoRollObject);
	
			// now that the correct column should be in place, assign elementExists the id of the note we need to draw in 
			elementExists = document.getElementById( notes[i].block.id );
		
		}else if(!elementExists && elementLength[0] === "sixteenth"){

			// now if the note to draw in is a 16th note and there's no place to put it, create the subdivision
			var blockId = notes[i].block.id;
			var columnToFind = blockId.substring(0, blockId.indexOf("-"));
			subdivide(columnToFind, true, pianoRollObject);
			
			elementExists = document.getElementById( notes[i].block.id );
			
		}
		
		// make sure to set column header attr "hasNote" to 1!!!
		var columnHeader = elementExists.id.substring(elementExists.id.indexOf("col_"));
		columnHeader = document.getElementById(columnHeader);
		columnHeader.setAttribute("hasnote", "1");
		
		// color in note
		elementExists.style.backgroundColor = "rgb(0, 178, 0)";
		// fill in attributes 
		if(notes[i].block.volume === ""){
			notes[i].block.volume = instrumentObject.volume;
		}
		if(notes[i].block.style === "undefined"){
			notes[i].block.style = "default";
		}
		elementExists.setAttribute("volume", notes[i].block.volume);
		elementExists.setAttribute("type", notes[i].block.style);
		elementExists.setAttribute("length", notes[i].block.length);
		
		// special case for concatenated note block.
		if(elementExists.getAttribute("length").indexOf('-') > 0){
			
			// remove right border
			// NOTE: changeRightBorder is defined in context_menus.js!
			changeRightBorder(elementExists.id, "remove", pianoRollObject.subdivision);
			
			// need to draw in rest of note block. 
			var noteHead = elementExists.getAttribute("length").split('-').shift(); // get the head (i.e. is the beginning a 16th or 8th note)
			
			// subtract the value of noteHead (can only be 8th or 16th) from the current duration 
			var currDuration = notes[i].duration - (pianoRollObject.currentTempo / pianoRollObject.noteLengths[noteHead]);
			
			// the rest of the concatenated note block. ignore first note since we just drew it in
			var restOfNote = elementExists.getAttribute("length").split('-').slice(1);
			
			// currNote is the next neighbor
			var currNote = elementExists.nextSibling;
			
			for(var j = 0; j < restOfNote.length; j++){
				
				var currLength = restOfNote[j];
				
				// get the column header 
				var colHeader = document.getElementById( currNote.id.substring(currNote.id.indexOf("col_")) );
				
				if(currLength === "eighth"){
					// check if currNote.length is an eighth note. if not, rejoin and color in 
					if(currNote.getAttribute("length") === "eighth"){
						currNote.style.backgroundColor = "rgb(0, 178, 0)";
					}else{
						rejoin(currNote.id, true, pianoRollObject);
	
						// now that the correct column should be in place, get the sibling again of elementExists 
						currNote = elementExists.nextSibling;
						currNote.style.backgroundColor = "rgb(0, 178, 0)";
						
						// make sure to update the column header's hasnote to -1 as well!
						colHeader = document.getElementById( currNote.id.substring(currNote.id.indexOf("col_")) );
					}
				}else{
					// check if neighbor is a 16th note. if not, subdivide and color 
					if(currNote.getAttribute("length") === "sixteenth"){
						currNote.style.backgroundColor = "rgb(0, 178, 0)";
					}else{
						subdivide(currNote.id, true, pianoRollObject);
	
						// now that the correct column should be in place, get the sibling again of elementExists 
						currNote = elementExists.nextSibling;
						currNote.style.backgroundColor = "rgb(0, 178, 0)";
						
						document.getElementById( currNote.id.substring(currNote.id.indexOf("col_")) );
					}
				}
				
				// change hasnote to -1 
				colHeader.setAttribute("hasnote", -1);
				
				if(j < restOfNote.length - 1){
					boldBorder = parseInt(colHeader.id.match(/[0-9]{1,}/g)[0]) + 1;
					if(boldBorder % 8 === 0){
						$('#' + currNote.id).css("border-right", "3px solid transparent");
					}else{
						$('#' + currNote.id).css("border-right", "1px solid transparent");
					}
				}
				
				currNote = currNote.nextSibling;
			}
			
			// after for loop, make sure to give border on last segment of concatenated note block
			currNote = currNote.previousSibling;
			changeRightBorder(currNote.id, "add", pianoRollObject.subdivision);
		}

	}
	
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
		if(lastNote){
			lastNote.style.backgroundColor = '#fff';
		}
		
		var column = x.substring(x.indexOf('col'));
		
		if(document.getElementById(column) === null){
			if(column.indexOf("-") < 0){
				// get first subdivision
				column = x.substring(x.indexOf('col')) + "-1";
			}else{
				column = x.substring(x.indexOf('col'), x.indexOf('-'));
			}
		}
		
		//console.log(column);
		document.getElementById(column).style.backgroundColor = '#709be0'; // nice light blue color 

		lastNote = document.getElementById(column);
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
			for(activeNote in pianoRollObject.instruments[i].activeNotes){
	
				// get note id 
				var noteId = activeNote;
				
				// get location of each note
				var location = document.getElementById(noteId);
				
				if(location !== null){
					// set background color for that location a very light shade of green
					if(location.style.backgroundColor === 'transparent'){
						location.style.backgroundColor = "rgba(0, 178, 0, 0.2)";
					}
				}else if(location === null){
					// if not present, it's either because there's no 16th measure or 8th measure
					if(noteId.indexOf("-1") < 0 && noteId.indexOf("-2") < 0){
						
						// ok so this note that we want to 'onion-skin' looks like an eighth note but
						// there's only the 16th note subdivisions available on the grid. 
						// so we'll find those subdivisions and just color them
						var subdiv = document.getElementById( noteId + "-1" );
						var subdiv2 = document.getElementById( noteId + "-2" );

						// color the subdiv AND its right sibling if there is no current note in that spot 
						if(subdiv.style.backgroundColor !== 'rgb(0, 178, 0)'){
							subdiv.style.backgroundColor = "rgba(0, 178, 0, 0.2)";
						}
						
						if(subdiv2.style.backgroundColor !== 'rgb(0, 178, 0)'){
							subdiv2.style.backgroundColor = "rgba(0, 178, 0, 0.2)";
						}
						
					/****
					
						warning! you also have to consider later quarter notes and longer notes.
						the function will have to be able to look at the attribute "length" to know 
						how many sibling elements to color!
						
						for now, only the first note of a concatenated note block will show 
					
					***/
					}else if(noteId.indexOf("-1") > 0){
						// if we see a 16th note but there's only an 8th note div available, just color in that 8th note 
						var findId = noteId.substring(0, noteId.indexOf("-"));
						var subdiv = document.getElementById(findId);
						if(subdiv.style.backgroundColor === "transparent"){
							subdiv.style.background = "linear-gradient(90deg, rgba(0, 178, 0, 0.2) 50%, transparent 50%)";
						}
					}else if(noteId.indexOf("-2") > 0){
						var findId = noteId.substring(0, noteId.indexOf("-"));
						var subdiv = document.getElementById(findId);
						if(subdiv.style.backgroundColor === "transparent"){
							subdiv.style.background = "linear-gradient(90deg, transparent 50%, rgba(0, 178, 0, 0.2) 50%)";
						}
					}
				}
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