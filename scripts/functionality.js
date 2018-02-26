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
					
					/* 
					    there's a weird bug(?) that I haven't figured out yet - for instrument 2 of the intrada demo, if you switch from instrument 2 to 3, some of the notes
						from instrument 2 show up with instrument 3's notes (should be just instrument 3's notes). then if you check instrument 2's activeNotes, you'll see that 
						the 2nd note (G5_col5) is somehow removed (along with some other notes presumably). really weird. for now I'll just ensure that activeNotes reflects 
						the current notes by adding them here if they're not in activeNotes (although I'm pretty sure I shouldn't have to do this).
					*/
					if(pianoRollObject.currentInstrument.activeNotes[column[j].id] === undefined){
						pianoRollObject.currentInstrument.activeNotes[column[j].id] = 1;
					}
					
					// important! since an arbitrary number of notes can be rejoined, remember that notes that get joined have their column header's hasnote attribute set to -1.
					// but, we need to ignore those columns and not count them as rests (as we would do normally)
					// for this current note, we need to know how many notes have been concatenated. then take that number and add to i, the counter. that way those concatenated notes 
					// won't be treated as rests and added to the notes array. 
					if(column[j].getAttribute("length").indexOf("-") > 0){
						// the presence of the hyphen indicates a concatenation of multiple notes 
						var numNotes = (column[j].getAttribute("length")).split('-').length;
						i += numNotes - 1; // increment i 
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
	}else{
		
		currentInstrument.oscillator.type = currentInstrument.waveType;

		// tip! by setting value at a certain time, this prevents the 'gliding' from one freq. to the next 
		// pick either one of the two below based on a certain condition 
		if(array[index].block.style === "glide"){
			currentInstrument.oscillator.frequency.setTargetAtTime(array[index].freq, 0.1, 0.04);
		}else{
			currentInstrument.oscillator.frequency.setValueAtTime(array[index].freq, 0);
		}
		
		// by setting gain value here according to the two conditions, this allows for the 'articulation' of notes without 
		// the 'helicopter' sound when a certain note frequency is 0. 
		// previously, the gain would have been .3 even for notes with 0 frequency,
		// which causes some increase in volume in background sound.
		// it was only detectable when I added the setTimeout below where I set gain to 0.
		// this is fixed by always setting gain to 0 if a note's frequency is 0.
		var val = array[index].freq > 0 ? parseFloat(array[index].block.volume) : 0.0;
		currentInstrument.gain.gain.setTargetAtTime(val, 0, 0.010); // start the note
		 
		if(index < array.length){
			// hold this current note for array[index].duration, then move on to the next note.
			// note that index is pre-incremented for the next note, but we also need the duration for this current index!
			// therefore, currIndex will hold the current note's index.
			var currIndex = index;
			
			// change gain to 0 after a really small amount of time to give the impression of articulation
			// this amount of time will vary with the bpm 
			// remember: currentTempo variable is in milliseconds
			var spacer;
			
			// by default, ~70% of the note duration should be played 
			// the rest of the time can be devoted to the spacer 
			var realDuration;
			
			if(array[currIndex].block.style === "staccato"){
				realDuration = Math.round(0.55 * array[currIndex].duration);
			}else if(array[currIndex].block.style === "legato"){
				realDuration = Math.round(0.85 * array[currIndex].duration);
			}else{
				realDuration = Math.round(0.70 * array[currIndex].duration);
			}
			spacer = array[currIndex].duration - realDuration;

			pianoRollObject.timers.push(setTimeout(function(){  
			
			    // silence the note
				currentInstrument.gain.gain.setTargetAtTime(0, 0, 0.010);
			
			    // move on to next note
				// create a new timer and push to timers array 
				pianoRollObject.timers.push( setTimeout(function(){readAndPlayNote(array, ++index, currentInstrument, pianoRollObject)}, spacer) ); 
			
			}, realDuration)
			);
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
		pianoRollObject.instruments[i].gain.gain.setTargetAtTime(0, 0, 0.010);
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
	}else if(length.indexOf('-') > 0){
		
		// in this case if there's a hyphen, the length is a concatenation of multiple lengths,
		// i.e. 'eighth-eighth' or 'eighth-sixteenth' 
		var splitLength = length.split('-');
	    
		// keep a count of how many eighth and sixteenth notes are part of this note
		var lengths = {'eighth': 0, 'sixteenth': 0};
		
		splitLength.forEach(function(aLength){
			if(aLength === 'eighth'){
				lengths['eighth'] = ++lengths['eighth']; 
			}else if(aLength === 'sixteenth'){
				lengths['sixteenth'] = ++lengths['sixteenth']; 
			}
		});
		
		// calculate the length of this note depending on how many eighths and sixteenths
		// add the number of eighth notes divided by 2, the number of sixteenth notes divided by 4
		var total = (lengths['eighth'] / pianoRollObject.noteLengths["eighth"]) + (lengths['sixteenth'] / pianoRollObject.noteLengths["sixteenth"]);
		
		return Math.round(currentTempo * total);
		
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

