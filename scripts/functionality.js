/************

these functions control functionality such as:

- note reading / playback
- tempo change
- play/stop 
- adding / creating new instruments

************/

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
				notes.push(new Note(0.0,  Math.round(currentTempo / noteLengths["sixteenth"]), column[i]));
			}else{
				notes.push(new Note(0.0,  Math.round(currentTempo / noteLengths["eighth"]), column[i]));
			}
		}
	}
	return notes;
}


/****

this function takes an array of notes, an index, and an oscillator and plays the note at that index 
with a specific duration with the passed-in oscillator.

****/
function readAndPlayNote(array, index, oscillatorNode, gainNode){  
	// when to stop playing 
	if(index === array.length){
		gainNode.gain.value = 0;
	}else{
		oscillatorNode.type = $('#selectWave').val();
		/* tip! by setting value at a certain time, this prevents the 'gliding' from one freq. to the next */
		oscillatorNode.frequency.setValueAtTime(array[index].freq, 0);
		// by setting gain value here according to the two conditions, this allows for the 'articulation' of notes without 
		// the 'helicopter' sound when a certain note frequency is 0. 
		// previously, the gain would have been .3 even for notes with 0 frequency,
		// which causes some increase in volume in background sound.
		// it was only detectable when I added the setTimeout below where I set gain to 0.
		// this is fixed by always setting gain to 0 if a note's frequency is 0.
		gainNode.gain.value = array[index].freq > 0 ? .3 : 0.0;
		if(index < array.length){
			// hold the current note for whatever duration was specified
			// in other words, hold this current note for array[index].duration, then move on to the next note.
			// note that index is pre-incremented for the next note, but we also need the duration for this current index!
			// therefore, currIndex will hold the current note's index.
			var currIndex = index;
			
			// change gain to 0 after a really small amount of time to give the impression of articulation
			// 100 might have to be a better value later to coordinate with when the next note will play
			setTimeout(function(){ gainNode.gain.value = 0.0; }, 100); 
			
			// create a new timer and push to timers array 
			timer = setTimeout(function(){readAndPlayNote(array, ++index, oscillatorNode, gainNode)}, array[currIndex].duration); 
		}
	}
}

/****

stop playback

****/
function stopPlay(){
	clearTimeout(timer);
	for(var i = 0; i < instruments.length; i++){
		instruments[i].gain.gain.value = 0.0;
	}
}

/****

play notes for current instrument

****/
function play(){
	readAndPlayNote(readInNotes(), 0, currentInstrument.oscillator, currentInstrument.gain);
}

/****

play all instruments

****/
function playAll(){
	currentInstrument.notes = readInNotes();
	for(var i = 0; i < instruments.length; i++){
		readAndPlayNote(instruments[i].notes, 0, instruments[i].oscillator, instruments[i].gain);
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
function addNewInstrument(){
	var instrumentTable = document.getElementById("instrumentTable");
	var newInstrument = document.createElement('td');
	
	// we want to be able to access the instruments in sequential order
	newInstrument.id = "" + (instruments.length + 1); 
	newInstrument.setAttribute("selected", "0");
	newInstrument.style.backgroundColor = "transparent";
	
	newInstrument.innerHTML = "new_instrument";
	newInstrument.addEventListener('click', function(event){
		// pass the event target's id to chooseInstrument()
		chooseInstrument(event.target.id);
	});
	
	instrumentTable.appendChild(newInstrument);
	
	createNewInstrument("blah");
}

/****

create a new instrument 

****/
function createNewInstrument(name){
	// make new oscillator and gain nodes
	var newGain = initGain();
	var newOscillator = initOscillator(newGain);
	newGain.connect(context.destination);
	
	// create new instrument with oscillator
	var newInstrument = new Instrument("blah", newOscillator, newGain, []);
	instruments.push(newInstrument);
}

function deleteInstrument(){
}

