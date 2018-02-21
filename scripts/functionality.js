/************

these functions control functionality such as:

- note reading / playback
- tempo change
- play/stop 
- adding / creating new instruments

relies on PianoRoll object in classes.js 

************/


// create a new gain object
// needs a context variable!
function initGain(){
	var newGain = context.createGain();
	// set gain to 0 initially so no sound will be heard 
	newGain.gain.setValueAtTime(0, 0);
	return newGain;
}

// create a new oscillator
// needs a context variable!
function initOscillator(gain){
	var o = context.createOscillator();
	o.type = "sine"; // sine wave by default 
	o.connect(gain); 
	o.start(0);
	return o;
}

/****

	this will read all the notes, put them in an array and returns the array 

****/
function readInNotes(pianoRollObject){
	
	var notes = []; // creating a new list of notes based on what's on the grid currently  
	var tempo = pianoRollObject.currentTempo;
	
	// first find what the last column with a note (hasnote === 1) is 
	// this will aid performance and prevent unnecessary column look-throughs 
	var columnHeaders = document.getElementById("columnHeaderRow").children;
	var lastColumn = -1;
	var columnsWithNotes = [];
	
	for(var k = 0; k < columnHeaders.length; k++){
		if(columnHeaders[k].getAttribute('hasnote') === '1'){
			lastColumn = k;
			columnsWithNotes.push(1);
		}else{
			columnsWithNotes.push(0);
		}
	}
	
	// start at 1 to skip 0th index, which is not a valid note column
	for(var i = 1; i <= lastColumn; i++){
		if(columnsWithNotes[i] === 1){
			var column = $("div[id$='" + columnHeaders[i].id + "']").get(); //get all the blocks in each column
			// go down each column and look for green. if found, stop and add to array. then move on.
			for(var j = 0; j < column.length; j++){
				// look for green background! 
				if(column[j].style.backgroundColor === "rgb(0, 178, 0)"){
					// make any corrections to id string before matching with freq key
					var freq = pianoRollObject.noteFrequencies[ (column[j].parentNode.id).replace('s', '#') ];
					// add note to array
					notes.push(new Note(freq, getCorrectLength(column[j].getAttribute("length"), pianoRollObject), column[j]));
					
					/* there's a weird bug(?) that I haven't figured out yet - for instrument 2 of the intrada demo, if you switch from instrument 2 to 3, some of the notes
						from instrument 2 show up with instrument 3's notes (should be just instrument 3's notes). then if you check instrument 2's activeNotes, you'll see that 
						the 2nd note (G5_col5) is somehow removed (along with some other notes presumably). really weird. for now I'll just ensure that activeNotes reflects 
						the current notes by adding them here if they're not in activeNotes (although I'm pretty sure I shouldn't have to do this).
					*/
					if(pianoRollObject.currentInstrument.activeNotes[column[j].id] === undefined){
						pianoRollObject.currentInstrument.activeNotes[column[j].id] = 1;
					}
					
					// note found, stop 
					break;
				}
			}		
		}else{
			if(columnHeaders[i].id.indexOf("-1") > 0 || columnHeaders[i].id.indexOf("-2") > 0){
				// doesn't really matter which block element (i.e. C1, C7, F3, ...) we look at since the whole
				// column has no note. just use the 2nd element in the column array. (the first one is the header)
				notes.push(new Note(0.0,  Math.round(tempo / pianoRollObject.noteLengths["sixteenth"]), document.getElementById('C3' + columnHeaders[i].id)));
			}else{
				notes.push(new Note(0.0,  Math.round(tempo / pianoRollObject.noteLengths["eighth"]), document.getElementById('C3' + columnHeaders[i].id)));
			}
		}
	}
	
	// update active notes
	return notes;
}


/****

	this function takes an array of notes, an index, and an oscillator and plays the note at that index 
	with a specific duration with the passed-in oscillator.

****/
function readAndPlayNote(array, index, currentInstrument, pianoRollObject){  
	// when to stop playing 
	if(index === array.length){
		currentInstrument.gain.gain.setTargetAtTime(0, 0, 0.010);
		//currentInstrument.gain.gain.value = 0;
	}else{
		 currentInstrument.oscillator.type = currentInstrument.waveType;
		
		// tip! by setting value at a certain time, this prevents the 'gliding' from one freq. to the next 
		// pick either one of the two below based on a certain condition 
		// by default, use this one - NO MORE GLIDING because the 'de-zippering' was removed from the web audio spec for Chrome.
		// that was a unique feature in Chrome I really liked. too bad :< 
		currentInstrument.oscillator.frequency.setValueAtTime(array[index].freq, 0)

		// by setting gain value here according to the two conditions, this allows for the 'articulation' of notes without 
		// the 'helicopter' sound when a certain note frequency is 0. 
		// previously, the gain would have been .3 even for notes with 0 frequency,
		// which causes some increase in volume in background sound.
		// it was only detectable when I added the setTimeout below where I set gain to 0.
		// this is fixed by always setting gain to 0 if a note's frequency is 0.
		var val = array[index].freq > 0 ? parseFloat(array[index].block.volume) : 0.0;
		currentInstrument.gain.gain.setTargetAtTime(val, 0, 0.010);
		 
		if(index < array.length){
			// hold the current note for whatever duration was specified
			// in other words, hold this current note for array[index].duration, then move on to the next note.
			// note that index is pre-incremented for the next note, but we also need the duration for this current index!
			// therefore, currIndex will hold the current note's index.
			var currIndex = index;
			
			// change gain to 0 after a really small amount of time to give the impression of articulation
			// this amount of time will vary with the bpm 
			// so far it seems that for bpm 120 (500 ms) and below, 95 ms is a good amount of space (not staccato)
			// for bpm 150 - 185, 70 ms is good, and past that, 50 ms
			// remember: currentTempo variable is in milliseconds
			var spacer;
			if(pianoRollObject.currentTempo >= 500){
				spacer = 95;
			}else if(pianoRollObject.currentTempo >= 324 && pianoRollObject.currentTempo < 500){
				// bpm: 150 - 185
				spacer = 70;
			}else{
				spacer = 50;
			}
			
			// but, if a certain note's style is staccato or legato, spacer will
			// have to change accordingly as well
			if(array[index].block.style === "legato"){
				if(pianoRollObject.currentTempo >= 500){
					spacer = 200;
				}else if(pianoRollObject.currentTempo >= 324 && pianoRollObject.currentTempo < 500){
					spacer = 180;
				}else{
					spacer = 160;
				}
			}else if(array[index].block.style === "staccato"){
				if(pianoRollObject.currentTempo >= 500){
					spacer = 70;
				}else if(pianoRollObject.currentTempo >= 324 && pianoRollObject.currentTempo < 500){
					spacer = 50;
				}else{
					spacer = 30;
				}
			}
			
			setTimeout(function(){  currentInstrument.gain.gain.setTargetAtTime(0, 0, 0.010); }, spacer); 
			
			// create a new timer and push to timers array 
			pianoRollObject.timers.push( setTimeout(function(){readAndPlayNote(array, ++index, currentInstrument, pianoRollObject)}, array[currIndex].duration) ); 
		}
	}
}

/****

	stop playback

****/
function stopPlay(pianoRollObject){
	for(var i = 0; i < pianoRollObject.timers.length; i++){
		clearTimeout( pianoRollObject.timers[i] );
	}
	pianoRollObject.timers = [];
	for(var i = 0; i < pianoRollObject.instruments.length; i++){
		pianoRollObject.instruments[i].gain.gain.setValueAtTime(0, 0);
	}
}

/****

	play notes for current instrument

****/
function play(pianoRollObject){
	readAndPlayNote(readInNotes(pianoRollObject), 0, pianoRollObject.currentInstrument, pianoRollObject);
}

/****

	play all instruments

****/
function playAll(pianoRollObject){
	
	pianoRollObject.currentInstrument.notes = readInNotes(pianoRollObject);
	
	for(var i = 0; i < pianoRollObject.instruments.length; i++){
		var instrument = pianoRollObject.instruments[i];
		var notesArray = pianoRollObject.instruments[i].notes;
		readAndPlayNote(notesArray, 0, instrument, pianoRollObject);
	}
}

/***

	change tempo 

	this function relies on an INPUT box's ID to get the user-inputted tempo

***/
function changeTempo(pianoRollObject){
	var tempoInput = document.getElementById("changeTempo");
	var selectedTempo = parseInt(tempoInput.value);
	var tempoText = document.getElementById("tempo")
	tempoText.innerHTML = selectedTempo + " bpm";
	
	// initially getting milliseconds FOR QUARTER NOTES (that's 2 blocks on the grid)
	// note that currentTempo needs to be rounded before use
	pianoRollObject.currentTempo = ((Math.round((60000 / selectedTempo) * 1000)) / 1000 );
	
	// go through all instruments and adjust duration of each note in their note arrays
	// according to new current tempo
	for(var i = 0; i < pianoRollObject.instruments.length; i++){
		if(pianoRollObject.instruments[i] != pianoRollObject.currentInstrument){
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

	calculate length of note in milliseconds

***/
function getCorrectLength(length, pianoRollObject){
	var currentTempo = pianoRollObject.currentTempo;
	if(length === "quarter"){
		return Math.round(currentTempo);
	}else if(length === "eighth"){
		return Math.round(currentTempo / pianoRollObject.noteLengths["eighth"]);
	}else if(length === "sixteenth"){
		return Math.round(currentTempo / pianoRollObject.noteLengths["sixteenth"]);
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

/****

	create a new instrument 

****/
function createNewInstrument(name, pianoRollObject){
	// make new oscillator and gain nodes
	var newGain = new initGain();
	var newOscillator = new initOscillator(newGain);
	newGain.connect(context.destination);
	
	// create new instrument with oscillator
	var newInstrument = new Instrument("new_instrument", newOscillator, newGain, []);
	pianoRollObject.instruments.push(newInstrument);
}

function deleteInstrument(){
}

