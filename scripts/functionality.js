/************

these functions control functionality such as:

- note reading / playback
- tempo change
- play/stop 
- adding / creating new instruments

relies on PianoRoll object in classes.js 

// super helpful hints on how to synchronize web audio properly 
https://www.html5rocks.com/en/tutorials/audio/scheduling/#disqus_thread
https://github.com/cwilso/metronome/blob/master/js/metronome.js

http://catarak.github.io/blog/2014/12/02/web-audio-timing-tutorial/
https://github.com/catarak/web-audio-sequencer/blob/master/javascripts/app.js

http://sriku.org/blog/2013/01/30/taming-the-scriptprocessornode/#replacing-oscillator-with-scriptprocessornode

************/


// create a new gain object
// needs a context variable!
function initGain(context){
	var newGain = context.createGain();
	// set gain to 0 initially so no sound will be heard 
	newGain.gain.setValueAtTime(0.0, 0.0);
	return newGain;
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
				// just pass in the C7 note of the column id for rests 
				notes.push(new Note(0.0,  Math.round(tempo / pianoRollObject.noteLengths["sixteenth"]), document.getElementById( 'C7' + columnHeaders[i].id )));
			}else{
				notes.push(new Note(0.0,  Math.round(tempo / pianoRollObject.noteLengths["eighth"]), document.getElementById( 'C7' + columnHeaders[i].id )));
			}
		}
	}
	
	// update active notes
	return notes;
}


/****

	need a scheduler to schedule when a note should be played given a time based on the AudioContext's timer 
	pass the schedule function a pianoRollObject, which holds the context, and an instrument, which has a notes array 
	startTime will be set when play is clicked on in the play function 
	
	take the stuff from readAndPlayNote 
	- figure out the realDuration and spacer 
	- create a new oscillator for every note?? (lots of garbage?)
	
	the second argument is a boolean value 
	- true for all instruments 
	- false for just the current instrument 
	
****/
function scheduler(pianoRoll, allInstruments){
	
	var ctx = pianoRoll.audioContext;
	
	// each instrument may have a different number of notes.
	// keep an array of numbers, where each array index corresponds to an instrument 
	// each number will be the current note index of each instrument 
	var instrumentNotePointers = [];
	
	// in the case where the user specified a measure to start playing at - NOT YET IMPLEMENTED
	for(var k = 0; k < pianoRoll.instruments.length; k++){
		//instrumentNotePointers[k] = 5;
	}
	
	// keep another array holding the next time the next note should play for each instrument
	var nextTime = [];
	
	// keep a queue to hold notes to play only for the current instrument!!
	// this way we can highlight measures where the current note is being played.
	// how to deal with the case when the user switches instruments though while the piece is being played?
	var currentInstrumentNoteQueue = [];
	
	// keep a counter that counts the number of instruments that have finished playing all their notes  
	var stillNotesToPlay = 0;
	
	// make a copy of pianoRoll.instruments so that we can edit the array 
	// i.e. when an instrument is done, I can set the index of that instrument in the array to null or something 
	
	// get the index of the current instrument in case allInstruments is false (just playing one instrument in this case) 
	var currentInstrumentIndex; 
	for(var j = 0; j < pianoRoll.instruments.length; j++){
		if(pianoRoll.instruments[j] === pianoRoll.currentInstrument){
			currentInstrumentIndex = j;
		}
	}

	var instruments;
	if(!allInstruments){
		// if only playing the current instrument 
		instruments = [pianoRoll.instruments[currentInstrumentIndex]];
		instrumentNotePointers.push(0);
		nextTime.push(0);
	}else{
		instruments = pianoRoll.instruments.slice(0);
		for(var i = 0; i < pianoRoll.instruments.length; i++){
			instrumentNotePointers.push(0);
			nextTime.push(0);
		}
	}
	
	while(stillNotesToPlay < instruments.length){

		// for each instrument in the piano roll, get their next note and schedule it 
		// to play given the next note's duration 
		// mind any attributes like staccato and legato!
		for(var i = 0; i < instruments.length; i++){
			
			if(instruments[i] === null){
				continue;
			}
			
			// check if current note pointer for this instrument has reached the end of this
			// instrument's notes array. if so, increment stillNotesToPlay 
			if(instrumentNotePointers[i] >= instruments[i].notes.length){
				stillNotesToPlay++;
				instruments[i] = null;
				continue;
			}
			
			if(nextTime[i] === 0){
				nextTime[i] = ctx.currentTime;
			}
			
			// make a new oscillator for this note 
			var osc = pianoRoll.audioContext.createOscillator();
			
			// don't forget gain! (use the already initialized gain nodes from each instrument )
			var oscGainNode = instruments[i].gain;
			osc.connect(oscGainNode); // connect the new oscillator to the instrument's gain node!
			
			// don't forget any specified attributes for this particular instrument 
			// check wave type
			osc.type = instruments[i].waveType;
			
			// and note attributes 
			var currIndex = instrumentNotePointers[i];
			var notesArr = instruments[i].notes;
			var thisNote = notesArr[currIndex];
			
			if(thisNote.freq < 440){
				// need to set initial freq to 0 for low notes (C3 and below)
				// otherwise gliding will be messed up for notes on one end of the spectrum
				osc.frequency.setValueAtTime(0, 0);
			}
			
			if(notesArr[currIndex].block.style === "glide"){
				osc.frequency.setTargetAtTime(thisNote.freq, nextTime[i], 0.025);
			}else{
				//osc.frequency.setTargetAtTime(thisNote.freq, nextTime[i], 0);
				osc.frequency.setValueAtTime(thisNote.freq, nextTime[i]);
			}
			
			// check volume 
			// setting gain value here depending on condition allows for the 'articulation' of notes without 
			// the 'helicopter' sound when a certain note frequency is 0 but gain is not 0.
			// this is fixed by always setting gain to 0 if a note's frequency is 0.
			var val = thisNote.freq > 0 ? parseFloat(thisNote.block.volume) : 0.0;
			oscGainNode.gain.setTargetAtTime(val, nextTime[i] + .25, 0.0045); 
			
			// by default, ~70% of the note duration should be played 
			// the rest of the time can be devoted to the spacer 
			var realDuration;
			
			if(thisNote.block.style === "staccato"){
				realDuration = (0.50 * thisNote.duration);
			}else if(thisNote.block.style === "legato"){
				realDuration = (0.95 * thisNote.duration);
			}else{
				realDuration = (0.70 * thisNote.duration);
			}
			
			pianoRoll.timers.push(osc);
			osc.start( nextTime[i] + .25 ); // + .25 is added lookahead time (see link to scheduling below). it helps showCurrentNote catch up 
			pianoRoll.lastTime = nextTime[i] + .25;
			
			// change gain to 0 after a really small amount of time to give the impression of articulation
			oscGainNode.gain.setTargetAtTime(0, (nextTime[i] + .25) + (realDuration / 1000) - .002, 0.0010);
			osc.stop( nextTime[i] + (realDuration / 1000) + .25 );
			
			// update nextTime 
			nextTime[i] += (thisNote.duration / 1000);
			
			// increment the note pointer for this instrument 
			instrumentNotePointers[i]++;
			
			// add note to play into currentInstrumentNoteQueue
			if(i === currentInstrumentIndex){
				pianoRoll.currentInstrumentNoteQueue.push({"note": thisNote.block.id, "time": nextTime[i]});
			}
		}
	}
	
}

// show what note is currently playing (only the current instrument's)
// https://www.html5rocks.com/en/tutorials/audio/scheduling/
// go through the queue and for each note dequeued, highlight the column it's in to 
// show where the current note is being played 
var lastNote = null; 
var currNote = null;
function showCurrentNote(pianoRoll){
	
	//var currTime = pianoRoll.audioContext.currentTime;
	var queue = pianoRoll.currentInstrumentNoteQueue;
	
	while(queue.length > 0 && queue[0].time <= pianoRoll.audioContext.currentTime && pianoRoll.isPlaying){
		
		currNote = queue.splice(0,1)[0];

		// ok, reached the note 
		// highlight the column of the note
		if(lastNote !== null){
			lastNote.style.backgroundColor = '#fff';
		}
		
		// color current note's column header background color
		var column = currNote.note.substring(currNote.note.indexOf('col'));
		
		if(document.getElementById(column) === null){
			// i.e. if user switches instruments, the note that is supposed to be shown (from the previous instrument) might not exist on the grid 
			// so the note that's not existing might be subdivided or not 

			if(column.indexOf("-") < 0){
				// get first subdivision
				column = currNote.note.substring(currNote.note.indexOf('col')) + "-1";
			}else{
				column = currNote.note.substring(currNote.note.indexOf('col'), currNote.note.indexOf('-'));
			}

		}
		
		document.getElementById(column).style.backgroundColor = '#709be0'; // nice light blue color 
		
		lastNote = document.getElementById(column);
		
	}

	requestAnimationFrame(function(){ showCurrentNote(pianoRoll); });
}


/****

	play notes for current instrument

****/
function play(pianoRollObject){
	
	var ctx = pianoRollObject.audioContext;
	if(!pianoRoll.isPlaying || (pianoRoll.isPlaying && pianoRollObject.lastTime < ctx.currentTime)){
		pianoRoll.isPlaying = true;
		
		// get the current notes 
		pianoRollObject.currentInstrument.notes = readInNotes(pianoRollObject);
		
		scheduler(pianoRollObject, false);
	}
}

/****

	play all instruments

****/
function playAll(pianoRollObject){
	
	var ctx = pianoRollObject.audioContext;
	if(!pianoRoll.isPlaying || (pianoRoll.isPlaying && pianoRollObject.lastTime < ctx.currentTime)){
		pianoRollObject.isPlaying = true;
		
		pianoRollObject.currentInstrument.notes = readInNotes(pianoRollObject);
		
		// start the piano roll 
		scheduler(pianoRollObject, true);
	}
}

/****

	stop playback

****/
function stopPlay(pianoRollObject){

	pianoRollObject.isPlaying = false;

	for(var i = 0; i < pianoRollObject.timers.length; i++){
		pianoRollObject.timers[i].stop(0);
		pianoRollObject.timers[i] = null;
	}
	
	for(var j = 0; j < pianoRollObject.instruments.length; j++){
		pianoRollObject.instruments[j].gain.disconnect();
		
		// create a new gain for each instrument! 
		var newGain = initGain(pianoRollObject.audioContext);
		newGain.connect(pianoRollObject.audioContext.destination);
		pianoRollObject.instruments[j].gain = newGain;
	}

	// clear out timers array (which is actually filled with oscillator nodes)
	pianoRollObject.timers = [];
	
	// this is a cheap hack for now (for dealing with showCurrentNote)
	// notice it uses the global variables lastNote and currNote 
	if(lastNote){
		lastNote.style.backgroundColor = '#fff';
	}
	lastNote = null;
	currNote = null;
	pianoRoll.currentInstrumentNoteQueue = [];
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
	var newGain = initGain(pianoRollObject.audioContext);
	newGain.connect(pianoRollObject.audioContext.destination);
	
	// create new instrument with oscillator
	var newInstrument = new Instrument("new_instrument", newGain, []);
	pianoRollObject.instruments.push(newInstrument);
}

function deleteInstrument(){
}

