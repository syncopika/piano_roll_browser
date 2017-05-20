/************

these functions control functionality such as:

- note reading / playback
- tempo change
- play/stop 
- adding / creating new instruments

************/


// create a new gain object
// needs a context variable!
function initGain(){
	var newGain = context.createGain();
	// set gain to 0 initially so no sound will be heard 
	newGain.gain.value = 0.0;
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
function readInNotes(){
	var notes = []; // don't worry about what was in notes previously. 
	
	// first find what the last column with a note (hasnote === 1) is 
	// this will aid performance and prevent unnecessary column look-throughs 
	var columnHeaders = document.getElementById("columnHeaderRow").children;
	var lastColumn = -1;
	for(var k = 0; k < columnHeaders.length; k++){
		if(columnHeaders[k].getAttribute('hasnote') === '1'){
			lastColumn = k;
		}
	}

	// start at 1 to skip 0th index, which is not a valid note column
	for(var i = 1; i <= lastColumn; i++){

		var column = $("div[id$='" + columnHeaders[i].id + "']").get(); //get all the blocks in each column
		var found = 0;
		
		// go down each column and look for green. if found, stop and add to array. then move on.
		for(var j = 0; j < column.length; j++){
			// look for green background! 
			if(column[j].style.backgroundColor === "rgb(0, 178, 0)"){
				found = 1;
				// make any corrections to id string before matching with freq key
				var freq = noteFrequencies[ (column[j].parentNode.id).replace('s', '#') ];
				// add note to array
				notes.push(new Note(freq, getCorrectLength(column[j].getAttribute("length"), currentTempo), column[j]));
				// note found, stop 
				break;
			}
		}		
		// if found === 0, then add a rest. need to know what kind of note this current column represents first.
		if(found === 0){
			if(columnHeaders[i].id.indexOf("-1") > 0 || columnHeaders[i].id.indexOf("-2") > 0){
				// doesn't really matter which block element (i.e. C1, C7, F3, ...) we look at since the whole
				// column has no note. just use the 2nd element in the column array. (the first one is the header)
				notes.push(new Note(0.0,  Math.round(currentTempo / noteLengths["sixteenth"]), column[1]));
			}else{
				notes.push(new Note(0.0,  Math.round(currentTempo / noteLengths["eighth"]), column[1]));
			}
		}
	}
	return notes;
}


/****

this function takes an array of notes, an index, and an oscillator and plays the note at that index 
with a specific duration with the passed-in oscillator.

****/
function readAndPlayNote(array, index, currentInstrument){  
	// when to stop playing 
	if(index === array.length){
		 currentInstrument.gain.gain.value = 0;
	}else{
		 currentInstrument.oscillator.type = currentInstrument.waveType;
		
		// tip! by setting value at a certain time, this prevents the 'gliding' from one freq. to the next 
		// pick either one of the two below based on a certain condition 
		// by default, use this one 
		if(array[index].block.style !== "glide"){
			currentInstrument.oscillator.frequency.setValueAtTime(array[index].freq, 0);
		}else if(array[index].block.style === "glide"){
			currentInstrument.oscillator.frequency.value = array[index].freq;
		}
		 
		// by setting gain value here according to the two conditions, this allows for the 'articulation' of notes without 
		// the 'helicopter' sound when a certain note frequency is 0. 
		// previously, the gain would have been .3 even for notes with 0 frequency,
		// which causes some increase in volume in background sound.
		// it was only detectable when I added the setTimeout below where I set gain to 0.
		// this is fixed by always setting gain to 0 if a note's frequency is 0.
		 currentInstrument.gain.gain.value = array[index].freq > 0 ? parseFloat(array[index].block.volume) : 0.0;
		 
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
			if(currentTempo >= 500){
				spacer = 95;
			}else if(currentTempo >= 324 && currentTempo < 500){
				// bpm: 150 - 185
				spacer = 70;
			}else{
				spacer = 50;
			}
			
			// but, if a certain note's style is staccato or legato, spacer will
			// have to change accordingly as well
			if(array[index].block.style === "legato"){
				if(currentTempo >= 500){
					spacer = 200;
				}else if(currentTempo >= 324 && currentTempo < 500){
					spacer = 180;
				}else{
					spacer = 160;
				}
			}else if(array[index].block.style === "staccato"){
				if(currentTempo >= 500){
					spacer = 70;
				}else if(currentTempo >= 324 && currentTempo < 500){
					spacer = 50;
				}else{
					spacer = 30;
				}
			}
			
			setTimeout(function(){  currentInstrument.gain.gain.value = 0.0; }, spacer); 
			
			// create a new timer and push to timers array 
			timers.push( setTimeout(function(){readAndPlayNote(array, ++index, currentInstrument)}, array[currIndex].duration) ); 
		}
	}
}

/****

stop playback

****/
function stopPlay(){
	for(var i = 0; i < timers.length; i++){
		clearTimeout( timers[i] );
	}
	timers = [];
	for(var i = 0; i < instruments.length; i++){
		instruments[i].gain.gain.value = 0.0;
	}
}

/****

play notes for current instrument

****/
function play(){
	readAndPlayNote(readInNotes(), 0, currentInstrument);
}

/****

play all instruments

****/
function playAll(){
	currentInstrument.notes = readInNotes();
	for(var i = 0; i < instruments.length; i++){
		readAndPlayNote(instruments[i].notes, 0, instruments[i]);
	}
}

/***

change tempo 

this function relies on an INPUT box's ID to get the user-inputted tempo

***/
function changeTempo(){
	var tempoInput = document.getElementById("changeTempo");
	var selectedTempo = parseInt(tempoInput.value);
	var tempoText = document.getElementById("tempo")
	tempoText.innerHTML = selectedTempo + " bpm";
	
	// initially getting milliseconds FOR QUARTER NOTES (that's 2 blocks on the grid)
	// note that currentTempo needs to be rounded before use
	currentTempo = ((Math.round((60000/selectedTempo) * 1000)) / 1000 );
	
	// go through all instruments and adjust duration of each note in their note arrays
	// according to new current tempo
	for(var i = 0; i < instruments.length; i++){
		if(instruments[i] != currentInstrument){
			var noteArray = instruments[i].notes;
			for(var j = 0; j < noteArray.length; j++){
				if(noteArray[j].duration > 1){
					noteArray[j].duration = getCorrectLength(noteArray[j].block.length, currentTempo);
				}
			}
		}
	}
}

/***

calculate length of note in milliseconds

***/
function getCorrectLength(length, currentTempo){
	if(length === "quarter"){
		return Math.round(currentTempo);
	}else if(length === "eighth"){
		return Math.round(currentTempo / noteLengths["eighth"]);
	}else if(length === "sixteenth"){
		return Math.round(currentTempo / noteLengths["sixteenth"]);
	}
}


/****

add a new instrument 

****/
function addNewInstrument(name, bool){
	var instrumentTable = document.getElementById("instrumentTable");
	var newInstrument = document.createElement('td');
	
	// we want to be able to access the instruments in sequential order
	newInstrument.id = "" + (instruments.length + 1); 
	newInstrument.setAttribute("selected", "0");
	newInstrument.style.backgroundColor = "transparent";
	
	if(name === undefined){
		newInstrument.innerHTML = "new_instrument";
	}else{
		newInstrument.innerHTML = name;
	}
	newInstrument.addEventListener('click', function(event){
		// pass the event target's id to chooseInstrument()
		chooseInstrument(event.target.id);
	});
	
	instrumentTable.appendChild(newInstrument);
	
	// bool is not false - if a new instrument needs to be created
	// - when importing data, this createNewInstrument step is not needed
	if(bool !== false){
		createNewInstrument("new_instrument");
	}
}

/****

create a new instrument 

****/
function createNewInstrument(name){
	// make new oscillator and gain nodes
	var newGain = new initGain();
	var newOscillator = new initOscillator(newGain);
	newGain.connect(context.destination);
	
	// create new instrument with oscillator
	var newInstrument = new Instrument("new_instrument", newOscillator, newGain, []);
	instruments.push(newInstrument);
}

function deleteInstrument(){
}

