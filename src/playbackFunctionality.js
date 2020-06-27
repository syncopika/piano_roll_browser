/************

these functions control functionality such as:

- note reading / playback
- tempo change
- play/stop 

relies on PianoRoll object in classes.js 

************/


// create a new gain object
// @param context: an AudioContext instance
function initGain(context){
	var newGain = context.createGain();
	// set gain to 0 initially so no sound will be heard 
	newGain.gain.setValueAtTime(0.0, 0.0);
	return newGain;
}

// plays the corresponding pitch of a block when clicked 
// @param id: an HTML element id 
// @param waveType: a string representing the sound type (i.e. sine, triangle, etc.)
// @param pianoRollObject: an instance of PianoRoll
function clickNote(id, waveType, pianoRollObject){

	// resume the context per the Web Audio autoplay policy 
	pianoRollObject.audioContext.resume().then(() => {

		if(waveType === "percussion"){
			clickPercussionNote(id, pianoRollObject);
		}else if(pianoRoll.instrumentPresets[waveType]){
			
			// custom intrument preset!
			// TODO: refactor this section pls
			var parent = document.getElementById(id).parentNode.id;
			parent = parent.replace('s', '#'); // replace any 's' with '#' so we can match a key in noteFrequencies
			var audioContext = pianoRollObject.audioContext;
			var currPreset = pianoRollObject.instrumentPresets[waveType];
			//console.log(currPreset);
			var time = audioContext.currentTime;
			var allNodes = [];
			
			currPreset.waveNodes.forEach((node) => {
				var snap = addWaveNode(node, pianoRollObject);
				var snapOsc = snap[0];
				var snapEnv = snap[1];
				
				snapOsc.frequency.setValueAtTime(pianoRollObject.noteFrequencies[parent], time);
				snapEnv.gain.setValueAtTime(pianoRollObject.currentInstrument.volume, time);
				allNodes.push(snapOsc);
			});
			
			currPreset.noiseNodes.forEach((node) => {
				var noise = addNoise(node, pianoRollObject);
				var noiseOsc = noise[0];
				var noiseEnv = noise[1];
				
				noiseEnv.gain.setValueAtTime(pianoRollObject.currentInstrument.volume, time);
				allNodes.push(noiseOsc);
			});
			
			allNodes.forEach((osc) => {
				osc.start(0);
				osc.stop(audioContext.currentTime + .100);
			});
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

// like clickNote but for percussion notes
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

// sort an instrument's notes by position 
// an instrument's activeNotes map is evaluated and a new map where the key 
// represents an x-position and each value is a list of notes at that position is generated 
// @param instrument: an instance of Instrument 
// @return: an object that maps positions to the notes at those positions
function sortNotesByPosition(instrument){
	// organize notes by position
	var positionMapping = {};
	for(var noteId in instrument.activeNotes){
		var note = instrument.activeNotes[noteId];
		
		if(note.style.left === ""){
			note.style.left = (getNotePosition(note) + "px");
		}
		
		var position = parseInt(note.style.left);
		
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
// @param instrument: an instance of Instrument 
// @param pianoRollObject: an instance of PianoRoll
// @return: an array of arrays containing Note objects
function readInNotes(instrument, pianoRollObject){
	
	var notePosMap = sortNotesByPosition(instrument);
	var tempo = pianoRollObject.currentTempo;
	var allNotes = [];

	var notePositions = Object.keys(notePosMap).sort(function(a, b){ return a - b });
	notePositions.forEach(function(position){
		var notes = notePosMap[position]; // a list of at least 1 note
			
		// single note or not, just put them all in lists so it'll be easier to process in the scheduler
		var group = []; // these notes should be played at the same time 
		
		notes.forEach(function(note){
			var row = note.parentNode.parentNode.id;
			var freq = pianoRollObject.noteFrequencies[row.replace('s', '#')];
			var noteWidth = parseInt(note.style.width);
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
	var currentTempo = pianoRollObject.currentTempo;
	return Math.round((currentTempo / 40) * length); // 40 px == 1 eighth note.
}

// get the position of a note element
// @param noteElement: an HTML element of a note 
// @return: a float value representing the position of the note element
function getNotePosition(noteElement){
	return noteElement.getBoundingClientRect().left + window.pageXOffset;
}


/****

	need a scheduler to schedule when a note should be played given a time based on the AudioContext's timer 
	pass the schedule function a pianoRollObject, which holds the context, and an instrument, which has a notes array 
	startTime will be set when play is clicked on in the play function 
	
	take the stuff from readAndPlayNote 
	- figure out the realDuration and spacer 
	- create a new oscillator for every note?? (lots of garbage?)
	
	@param pianoRoll: an instance of PianoRoll
	
	@param allInstruments: boolean
	- true for all instruments 
	- false for just the current instrument 
	
****/
function scheduler(pianoRoll, allInstruments){
	
	var ctx = pianoRoll.audioContext;
	var startMarker = pianoRoll.playMarker; // if user specified a certain column to start playing at 
	var startPos = 0;
	
	// each instrument may have a different number of notes.
	// keep an array of numbers, where each array index corresponds to an instrument 
	// each number will be the current note index of each instrument 
	var instrumentNotePointers = [];
	
	// keep another array holding the next time the next note should play for each instrument
	var nextTime = [];
	
	// keep a counter that counts the number of instruments that have finished playing all their notes  
	var stillNotesToPlay = 0;
	
	// get the index of the current instrument in case allInstruments is false (just playing one instrument in this case) 
	var currentInstrumentIndex; 
	for(var j = 0; j < pianoRoll.instruments.length; j++){
		if(pianoRoll.instruments[j] === pianoRoll.currentInstrument){
			currentInstrumentIndex = j;
		}
	}
	
	// make a copy of pianoRoll.instruments so that we can edit the array
	// i.e. when an instrument is done, I can set the index of that instrument in the array to null as a flag
	// also, for each instrument set their index in instrumentNotePointers to 0, which means that playing should 
	// start at the beginning (0 being the index of the first note of that instrument)
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
	
	// gather the column headers so we can process them to indicate the approx. current location for playback
	// filter columnHeadersToHighlight a bit more - we only want to include up to the last column that has notes.
	// any column past that we don't want 
	var columnHeadersToHighlight = Array.from(document.getElementById("columnHeaderRow").children).splice(1); // remove first col header since it's for cosmetic purposes
	var lastColWithNotes;
	columnHeadersToHighlight.forEach((col, index) => {
		if(col.getAttribute("numNotes") > 0){
			lastColWithNotes = index;
		}
	});
	if(lastColWithNotes){
		columnHeadersToHighlight = columnHeadersToHighlight.slice(0, lastColWithNotes+1);
	}
	
	var highlightNextTime = ctx.currentTime; // keep track of when to start and stop oscillators responsible for highlighting the current approx. playback location
	
	// in the case where the user specified a measure to start playing at
	if(startMarker){

		startPos = getNotePosition(document.getElementById(startMarker));
	
		for(var i = 0; i < instruments.length; i++){
			// have each instrument start with the note at index given by startMarker
			for(var j = 0; j < instruments[i].notes.length; j++){
				try{
					// the elements of the notes array are arrays of Note objects, hence the [0]
					var columnCell = document.getElementById(instruments[i].notes[j][0].block.id).parentNode;
					var cellId = columnCell.id;
					var cellPos = getNotePosition(columnCell);

					if(cellId.indexOf(startMarker) > -1){
						instrumentNotePointers[i] = j;
						break;
					}else if(cellPos > startPos){
						// this is the first note that appears after the selected column to start playing from 
						instrumentNotePointers[i] = j;
						break;
					}
				}catch(error){
					console.error(error);
					console.error(instruments[i].notes[j].block.id);
				}
			}
		}
		columnHeadersToHighlight = columnHeadersToHighlight.splice(parseInt(startMarker.match(/[0-9]+/g)[0]));
	}
	
	// set up oscillator just for highlighting approx. the current column header
	// note each column header is 40 px in length (that's 1 eighth note)
	// so they should all be the same length in duration
	columnHeadersToHighlight.forEach((header) => {
		var highlightOsc = ctx.createOscillator();
		highlightOsc.start(highlightNextTime);
		highlightNextTime += (getCorrectLength(40, pianoRoll) / 1000);
		highlightOsc.stop(highlightNextTime);
		highlightOsc.onended = onendFunc(
			header.id, 
			columnHeadersToHighlight[columnHeadersToHighlight.length-1].id, 
			pianoRoll
		);
		pianoRoll.timers.push(highlightOsc); // maybe should use a separate timers array?
	});

	
	// figure out for each instrument the minumum number of gain nodes and oscillator nodes we need 
	// in order to minimize the number of nodes we need to create since that adds performance overhead
	var numGainNodePerInst = {};
	instruments.forEach((instrument, instIndex) => {
		//console.log(instrument.notes);
		var prevNote = null;
		var currNote = null;
		var start = instrumentNotePointers[instIndex];

		for(var index = start; index < instrument.notes.length; index++){
			
			var group = instrument.notes[index];			

			if(index > start){
				// find the longest note in the prev group
				if(!prevNote){
					prevNote = document.getElementById(instrument.notes[index-1][0].block.id);
					instrument.notes[index-1].forEach((note) => {
						var n = document.getElementById(note.block.id);
						if(parseInt(n.style.width) > parseInt(prevNote.style.width)){
							prevNote = n;
						}
					});
				}
				
				// get the longest note in curr group 
				var longestCurrNote = document.getElementById(group[0].block.id);
				group.forEach((note) => {
					var n = document.getElementById(note.block.id);
					if(parseInt(n.style.width) > parseInt(longestCurrNote.style.width)){
						longestCurrNote = n;
					}
				});

				currNote = longestCurrNote;
				
				var prevNotePos = getNotePosition(prevNote);
				var prevNoteLen = parseInt(prevNote.style.width);
				var currNotePos = getNotePosition(currNote);
				
				if(currNotePos < (prevNotePos + prevNoteLen)){
					if(!numGainNodePerInst[instIndex]){
						numGainNodePerInst[instIndex] = 2;
					}else{
						numGainNodePerInst[instIndex]++;
					}
				}
				prevNote = currNote;
			}
			
			if(!numGainNodePerInst[instIndex]){
				numGainNodePerInst[instIndex] = group.length;
			}else{
				numGainNodePerInst[instIndex] = Math.max(
					numGainNodePerInst[instIndex],
					group.length
				);
			}
		}
	});
	
	// add the appropriate number of gain nodes and oscillator nodes for each instrument.
	// we can then reuse these nodes instead of making new ones for every single note, which is unnecessary 
	// especially if we have a lot of notes that aren't part of chords and can be used with just one gain node and oscillator
	var instrumentGainNodes = {};
	var instrumentOscNodes = {};
	var gainCount = 0;
	var oscCount = 0;
	for(var instrument in numGainNodePerInst){ 
		instrumentGainNodes[instrument] = [];
		instrumentOscNodes[instrument] = [];
		for(var i = 0; i < numGainNodePerInst[instrument]; i++){
			var newGainNode = initGain(ctx);
			newGainNode.id = ("gain" + (gainCount++));
			instrumentGainNodes[instrument].push(newGainNode);
			
			var newOscNode = ctx.createOscillator();
			newOscNode.id = ("osc" + (oscCount++));
			instrumentOscNodes[instrument].push(newOscNode);
			
			newOscNode.connect(newGainNode);
			
			pianoRoll.timers.push(newOscNode);
		}
	}
	
	// 'route' the notes i.e. assign them to the gain/osc nodes such that they all get played properly
	var routes = {}; // map instrument to another map of gain nodes to the notes that should be played by those nodes
	var posTracker = {};
	
	instruments.forEach((instrument, instrumentIndex) => {
		
		routes[instrumentIndex] = {};
		posTracker[instrumentIndex] = {}; // stores the end position (i.e. start + note width) of the last note assigned to a gain node for an instrument
		
		for(var i = 0; i < instrumentGainNodes[instrumentIndex].length; i++){
			routes[instrumentIndex][i] = [];
			posTracker[instrumentIndex][i] = 0;
		}
		
		// use instrumentNotePointers to take into account the startMarker 
		var start = instrumentNotePointers[instrumentIndex];
		for(var index = start; index < instrument.notes.length; index++){
			
			var group = instrument.notes[index];
			
			group.forEach((note, noteIndex) => {
				var lastEndPositions = posTracker[instrumentIndex]; // this is a map!
				var n = document.getElementById(note.block.id);
				var endPosCurrNote = getNotePosition(n) + parseInt(n.style.width);
				var startPosCurrNote = getNotePosition(n);
				var gainNodeRoutes = instrumentGainNodes[instrumentIndex];
				
				// try each gain node in the map to see if they can handle this note. i.e. if another note should be playing for this gain 
				// while this current note is supposed to start, then this gain node cannot support this current note.
				// there should always be a possible gain node route option available
				for(var i = 0; i < gainNodeRoutes.length; i++){
					if(lastEndPositions[i] <= startPosCurrNote){
						// we can use this gain node!
						routes[instrumentIndex][i].push(note); // assign this note to the gain node
						lastEndPositions[i] = endPosCurrNote;  // log its ending position 
						break;
					}
				}
			});
		}
	});
		
	// preprocess the nodes further by figuring out how long each note should be and its start/stop times
	// note that we should NOT actually stop any oscillators; they should just be set to 0 freq and 0 gain when they
	// should not be playing
	// combine all notes of each instrument into an array
	// each element in the array will be a map of note properties and the osc node that should play that note.
	var allNotesPerInstrument = {};
	var index = 0;
	for(var instrument in routes){
		
		allNotesPerInstrument[instrument] = [];
		
		var instrumentRoutes = routes[instrument];
		var currInstGainNodes = instrumentGainNodes[index];
		var currInstOscNodes = instrumentOscNodes[index];
		
		// for each gain node, hook to right dest 
		var gainIndex = 0;
		for(var route in instrumentRoutes){
			var notes = instrumentRoutes[route];
			var gainToUse = currInstGainNodes[gainIndex];
			var oscToUse = currInstOscNodes[gainIndex];
			
			// hook up gain to the correct destination
			if(pianoRoll.recording){
				gainToUse.connect(pianoRoll.audioContextDestMediaStream);
			}
			gainToUse.connect(pianoRoll.audioContextDestOriginal);

			var timeOffsetAcc = 0; // time offset accumulator so we know when notes need to start relative to the beginning of the start of playing
			for(var i = 0; i < notes.length; i++){
				var thisNote = notes[i]; 
				var volume = thisNote.freq > 0.0 ? parseFloat(thisNote.block.volume) : 0.0;
				
				// by default, ~70% of the note duration should be played 
				// the rest of the time can be devoted to the spacer 
				var realDuration;
				if(thisNote.block.style === "staccato"){
					realDuration = (0.50 * thisNote.duration)/1000;
				}else if(thisNote.block.style === "legato"){
					realDuration = (0.95 * thisNote.duration)/1000;
				}else{
					realDuration = (0.70 * thisNote.duration)/1000;
				}
				
				var startTimeOffset = 0;
				if(i === 0){
					// the first note on the piano roll might not start at the beginning (i.e. there might be an initial rest)
					// so let's account for that here 
					// if startMarker is specified, we can use its position to figure out the initial rest
					var startPos = 60; // 60 is the x-position of the very first note of the piano roll
					if(startMarker){
						startPos = getNotePosition(document.getElementById(startMarker));
					}
					var firstNoteStart = getNotePosition(document.getElementById(notes[i].block.id));
					if(firstNoteStart !== startPos){
						startTimeOffset = getCorrectLength(firstNoteStart - startPos, pianoRoll) / 1000;
					}
				}else{
					// find out how much space there is between curr note and prev note to figure out when curr note should start
					var prevNotePos = getNotePosition(document.getElementById(notes[i-1].block.id));
					var thisNotePos = getNotePosition(document.getElementById(thisNote.block.id));
					var timeDiff = getCorrectLength(thisNotePos - prevNotePos, pianoRoll) / 1000;
					startTimeOffset = timeOffsetAcc + timeDiff;
				}

				timeOffsetAcc = startTimeOffset;
				
				var noteSetup = {
					"note": thisNote,
					"osc": oscToUse,
					"gain": gainToUse,
					"duration": realDuration,
					"volume": volume,
					"startTimeOffset": startTimeOffset
				}
				allNotesPerInstrument[instrument].push(noteSetup);
			}
			gainIndex++;
		}
		index++;
	}
	
	var thisTime = ctx.currentTime;
	//console.log(routes);
	//console.log(instrumentOscNodes);
	// start up the oscillators vrrroooooommmmmmmm
	for(var inst in instrumentOscNodes){
		instrumentOscNodes[inst].forEach((osc) => {
			osc.start(thisTime);
		});
	}
	
	for(var i = 0; i < instruments.length; i++){
		
		var currInstNotes = allNotesPerInstrument[i];
		
		currInstNotes.forEach((note) => {
			
			// schedule the notes!
			var osc = note.osc;
			var gain = note.gain;
			var duration = note.duration;
			var volume = note.volume;
			var startTimeOffset = note.startTimeOffset;
			var startTime = thisTime + startTimeOffset;
			var endTime = startTime + duration;
			var otherParams = note.note;
			
			// log the time the last note will play
			pianoRoll.lastTime = Math.max(pianoRoll.lastTime, (thisTime + startTimeOffset));
			
			if(instruments[i].waveType === "percussion"){
				// hmm gotta make a new osc for every percussion note? need to explore this some more.
				var noteContainer = document.getElementById(otherParams.block.id).parentNode;
				var octave = parseInt(noteContainer.id.match(/[0-9]/g)[0]);
				var oscList;
				
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
				
			}else if(pianoRoll.instrumentPresets[instruments[i].waveType]){
				// TODO
				//var currPreset = pianoRoll.instrumentPresets[instruments[i].waveType];
				//var instrumentPresetNodes = processNote(thisNote.freq, volume, nextTime[i], pianoRoll, currPreset); 
			}else{
				osc.type = instruments[i].waveType;
			
				if(otherParams.freq < 440){
					// need to set initial freq to 0 for low notes (C3 and below)
					// otherwise gliding will be messed up for notes on one end of the spectrum
					osc.frequency.setValueAtTime(0.0, 0.0);
				}

				if(otherParams.block.style === "glide"){
					osc.frequency.setTargetAtTime(otherParams.freq, startTime, 0.025);
				}else{
					osc.frequency.setValueAtTime(otherParams.freq, startTime);
				}
				
				// setting gain value here depending on condition allows for the 'articulation' of notes without 
				// the 'helicopter' sound when a certain note frequency is 0 but gain is not 0.
				// this is fixed by always setting gain to 0 if a note's frequency is 0.
				gain.gain.setTargetAtTime(volume, startTime, 0.0045); 
				
				// cut the duration by just a little bit to give the impression of articulation
				gain.gain.setTargetAtTime(0.0, (endTime - .0025), 0.0010);
				osc.frequency.setValueAtTime(0.0, endTime);
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

// implements looping play functionality
// @param pianoRollObject: an instance of PianoRoll
// @param allInstruments: true if playing all instruments, false if not.
function loopSignal(pianoRollObject, allInstruments){
	setTimeout(function(){
		scheduler(pianoRollObject, allInstruments);
	}, 80); // 80 ms before re-executing scheduler
}


// play notes for current instrument
function play(pianoRollObject){
	var ctx = pianoRollObject.audioContext;
	if(!pianoRollObject.isPlaying || (pianoRollObject.isPlaying && pianoRollObject.lastTime < ctx.currentTime)){
		pianoRoll.isPlaying = true;
		pianoRollObject.currentInstrument.notes = readInNotes(pianoRollObject.currentInstrument, pianoRollObject);
		scheduler(pianoRollObject, false);
	}
}

// play all instruments
function playAll(pianoRollObject){
	var ctx = pianoRollObject.audioContext;
	if(!pianoRollObject.isPlaying || (pianoRollObject.isPlaying && pianoRollObject.lastTime < ctx.currentTime)){
		pianoRollObject.isPlaying = true;
		pianoRollObject.currentInstrument.notes = readInNotes(pianoRollObject.currentInstrument, pianoRollObject);
		scheduler(pianoRollObject, true);
	}
}

// record playback (for all instruments)
function recordPlay(pianoRollObject){
	if(pianoRollObject.recording){
		return;
	}else{
		pianoRollObject.recording = true;
		pianoRollObject.recorder.start();
		playAll(pianoRollObject);
	}
}

//stop playback
function stopPlay(pianoRollObject){

	pianoRollObject.isPlaying = false;

	for(var i = 0; i < pianoRollObject.timers.length; i++){
		pianoRollObject.timers[i].stop(0);
		pianoRollObject.timers[i].ended = null; // unhook onendFunc 
	}
	
	for(var j = 0; j < pianoRollObject.instruments.length; j++){
		pianoRollObject.instruments[j].gain.disconnect();
		
		// create a new gain for each instrument! 
		var newGain = initGain(pianoRollObject.audioContext);
		newGain.connect(pianoRollObject.audioContext.destination);
		pianoRollObject.instruments[j].gain = newGain;
	}

	// clear out timers array (which holds the oscillator nodes)
	pianoRollObject.timers = [];
	
	// this is a cheap hack for now (for dealing with showCurrentNote)
	// notice it uses the global variables lastNote and currNote 
	if(lastNote && lastNote.id !== pianoRollObject.playMarker){
		lastNote.style.backgroundColor = '#fff';
	}
	
	// if recording
	if(pianoRollObject.recording){
		pianoRollObject.recorder.stop();
		pianoRollObject.recording = false;
		// html-specific: not the best thing to do here...
		document.getElementById('record').style.border = "";
	}
	
	lastNote = null;
	currNote = null;
}


//create a new instrument 
function createNewInstrument(name, pianoRollObject){
	// make new gain node for the instrument 
	var newGain = initGain(pianoRollObject.audioContext);
	newGain.connect(pianoRollObject.audioContext.destination);
	
	// create new instrument with oscillator
	var newInstrument = new Instrument("new_instrument", newGain, []);
	pianoRollObject.instruments.push(newInstrument);
}


function deleteInstrument(){
	//TODO: implement me
}


try {
	module.exports = {
		initGain: initGain,
		readInNotes: readInNotes,
		scheduler: scheduler,
		play: play,
		playAll: playAll,
		stopPlay: stopPlay,
		getCorrectLength: getCorrectLength,
		createNewInstrument: createNewInstrument
	}
}catch(e){
	// ignore errors (i.e. if adding the script to an html page)
	// we need this export for unit testing though 
}