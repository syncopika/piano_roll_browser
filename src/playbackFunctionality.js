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
// @param volume: a float number representing the volume that the note should sound
// @param pianoRollObject: an instance of PianoRoll
function clickNote(id, waveType, volume, pianoRollObject){
	// resume the context per the Web Audio autoplay policy 
	pianoRollObject.audioContext.resume().then(() => {
		if(waveType === "percussion"){
			clickPercussionNote(id, volume, pianoRollObject);
		}else if(waveType === "piano"){
			clickPianoNote(id, volume, pianoRollObject);
		}else{
			var parent = document.getElementById(id).parentNode.id.replace('s', '#'); // replace any 's' with '#' so we can match a key in noteFrequencies
			var now = pianoRollObject.audioContext.currentTime;
			
			if(pianoRoll.instrumentPresets[waveType]){
				// custom intrument preset!
				onClickCustomPreset(pianoRollObject, waveType, volume, parent);
			}else{	
				// create a new oscillator just for this note
				var osc = pianoRollObject.audioContext.createOscillator();
				osc.type = waveType;
				osc.frequency.setValueAtTime(pianoRollObject.noteFrequencies[parent], 0);
				
				// borrow the currentInstrument's gain node 
				var gain = pianoRollObject.currentInstrument.gain;
				
				// setup the StereoPannerNode
				var panNode = pianoRollObject.audioContext.createStereoPanner();
				var panVal = pianoRollObject.currentInstrument.pan;
				osc.connect(panNode);
				panNode.connect(gain);
				panNode.pan.setValueAtTime(panVal, now);
				
				// set volume
				gain.gain.setTargetAtTime(volume, now, 0.002);
				osc.start(0);
				
				// silence the oscillator 
				gain.gain.setTargetAtTime(0.0, now + 0.080, 0.002);
				osc.stop(now + .100);
			}
		}
	});
}

function clickPercussionNote(id, volume, pianoRollObject){
	var parent = document.getElementById(id).parentNode.id.replace('s', '#');
	var context = pianoRollObject.audioContext;
	var gain = pianoRollObject.currentInstrument.gain;
	var now = pianoRollObject.audioContext.currentTime;
	var octave = parseInt(parent.match(/[0-9]/g)[0]);
	
	if(octave >= 2 && octave <= 4){
		// kick drum 
		pianoRollObject.PercussionManager.kickDrumNote(pianoRollObject.noteFrequencies[parent], volume, now, false);		
	}else if(octave === 5){
		// snare drum 
		pianoRollObject.PercussionManager.snareDrumNote(pianoRollObject.noteFrequencies[parent], volume, now, false);		
	}else{
		// hi-hat 
		pianoRollObject.PercussionManager.hihatNote(volume, now, false);
	}
}

function clickPianoNote(id, volume, pianoRollObject){
	var noteName = document.getElementById(id).parentNode.id.split("col")[0]; // get the note name, i.e. D7, Ds6
	var context = pianoRollObject.audioContext;
	var gain = pianoRollObject.currentInstrument.gain;
	var now = pianoRollObject.audioContext.currentTime;
	var noteDataBuf = pianoRollObject.PianoManager.noteMap[noteName].buffer;
	
	var newNoteBufferNode = context.createBufferSource();
	newNoteBufferNode.buffer = noteDataBuf;
	
	// setup the StereoPannerNode
	var panNode = pianoRollObject.audioContext.createStereoPanner();
	var panVal = pianoRollObject.currentInstrument.pan;
	newNoteBufferNode.connect(panNode);
	panNode.connect(gain);
	panNode.pan.setValueAtTime(panVal, now);
	
	// set volume (the piano notes are quiet so they need to be amplified a bit more)
	gain.gain.setTargetAtTime(volume*4, now, 0.002);
	newNoteBufferNode.start(0);
	
	// silence the oscillator 
	gain.gain.setTargetAtTime(0.0, now + 0.300, 0.002);
	newNoteBufferNode.stop(now + .300);
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

// scheduler helper functions

// @param routes: an object where each key is an instrument index mapped to a map of gain nodes mapped to the notes those gain nodes are responsible for playing. 
// @param pianoRollObject: instance of PianoRoll
// @param instrumentGainNodes: a map of instrument to gain nodes
// @param instrumentOscNodes: a map of instrument to osc nodes
// @return: an object with each key being an isntrument index and each value being a list of note configurations (which is an object)
function configureInstrumentNotes(routes, pianoRollObject, instrumentGainNodes, instrumentOscNodes){
	// preprocess the nodes further by figuring out how long each note should be and its start/stop times
	// note that we should NOT actually stop any oscillators; they should just be set to 0 freq and 0 gain when they should not be playing
	// combine all notes of each instrument into an array. each element will be a map of note properties and the osc node for that note.
	var allNotesPerInstrument = {};
	var index = 0; // index corresponds to the index of an instrument in pianoRollObject.instruments
	
	for(var instrument in routes){
		allNotesPerInstrument[instrument] = [];
		
		var instrumentRoutes = routes[instrument];
		var currInstGainNodes = instrumentGainNodes[index]; // this is a list of lists!
		var currInstOscNodes = instrumentOscNodes[index];   // this is a list of lists!
		var gainIndex = 0;
		
		for(var route in instrumentRoutes){
			var notes = instrumentRoutes[route];
			var gainsToUse = currInstGainNodes[gainIndex];
			var oscsToUse = currInstOscNodes[gainIndex];
			
			// hook up gain to the correct destination
			gainsToUse.forEach((gain) => {
				// take into account the current instrument's panning
				var panNode = pianoRollObject.audioContext.createStereoPanner();
				var panVal = pianoRollObject.instruments[instrument].pan;
				gain.connect(panNode);
				
				if(pianoRollObject.recording){
					panNode.connect(pianoRollObject.audioContextDestMediaStream);
				}else{
					panNode.connect(pianoRollObject.audioContextDestOriginal);
				}
				
				// set pan node value
				panNode.pan.setValueAtTime(panVal, 0.0);
				
				// silence gains initially
				// yes, this part is necessary (don't know the exact details but it makes sure the audio can start normally, otherwise
				// you get an awful blast of sound without it). but - for custom presets, we wipe out their gain values (i.e. a preset may
				// have multiple gain nodes, each mapping to a specific wave sound and so they need to keep those values). we need to keep
				// these values somewhere to refer to when scaling the volume.
				gain.gain.setValueAtTime(0.0, 0.0);
			});
			
			var timeOffsetAcc = 0; // time offset accumulator so we know when notes need to start relative to the beginning of the start of playing
			for(var i = 0; i < notes.length; i++){
				var thisNote = notes[i]; 
				var volume = thisNote.freq > 0.0 ? parseFloat(thisNote.block.volume) : 0.0;
				
				// by default, 70% of the note duration should be played 
				// the rest of the time can be devoted to the spacer 
				var realDuration;
				if(thisNote.block.style === "staccato"){
					realDuration = (0.50 * thisNote.duration) / 1000;
				}else if(thisNote.block.style === "legato"){
					realDuration = (0.95 * thisNote.duration) / 1000;
				}else{
					realDuration = (0.70 * thisNote.duration) / 1000;
				}
				
				var startTimeOffset = 0;
				var thisNotePos;
				if(i === 0){
					// the first note on the piano roll might not start at the beginning (i.e. there might be an initial rest)
					// so let's account for that here 
					// if startMarker is specified, we can use its position to figure out the initial rest
					var startPos = 60; // 60 is the x-position of the very first note of the piano roll
					if(pianoRollObject.playMarker){
						startPos = getNotePosition(document.getElementById(pianoRollObject.playMarker));
					}
					var firstNoteStart = getNotePosition(document.getElementById(notes[i].block.id));
					thisNotePos = firstNoteStart;
					if(firstNoteStart !== startPos){
						startTimeOffset = getCorrectLength(firstNoteStart - startPos, pianoRoll) / 1000;
					}
				}else{
					// find out how much space there is between curr note and prev note to figure out when curr note should start
					var prevNotePos = getNotePosition(document.getElementById(notes[i-1].block.id));
					var thisNotePos = getNotePosition(document.getElementById(thisNote.block.id));
					var timeDiff = getCorrectLength(thisNotePos - prevNotePos, pianoRollObject) / 1000;
					startTimeOffset = timeOffsetAcc + timeDiff;
					thisNotePos = thisNotePos;
				}

				timeOffsetAcc = startTimeOffset;
				
				var noteSetup = {
					"note": thisNote,
					"osc": oscsToUse,
					"gain": gainsToUse,
					"duration": realDuration,
					"volume": volume,
					"startTimeOffset": startTimeOffset,
					"position": thisNotePos
				};
				
				allNotesPerInstrument[instrument].push(noteSetup);
			}
			gainIndex++;
		}
		
		// so calculating startTimeOffset seems to be a bit tricky and yields different values 
		// for notes that should be started at the same time (i.e. in a chord). 
		// to remedy this, go through all the notes again real quick and if we find notes that 
		// should start at the same time, decide on an offset and fix the values as needed.
		// use the positions of each note to figure out which start together
		// TODO: correct time scheduling precision errors? or look into gradual scheduling, if possible?
		var positionMap = {}; // group notes by positions
		var instrumentNotes = allNotesPerInstrument[instrument];
		instrumentNotes.forEach((note) => {
			if(positionMap[note.position]){
				// record the pitches present at this column number
				positionMap[note.position].push(note);
			}else{
				positionMap[note.position] = [note];
			}
		});
		
		// now only adjust the offset for notes in the same chord
		for(var position in positionMap){
			var chord = positionMap[position];
			if(chord.length > 1){
				// assign everyone the same startTimeOffset value
				chord.forEach((note) => {
					note.startTimeOffset = chord[0].startTimeOffset;
				});
			}
		}
		
		index++;
	}
	
	return allNotesPerInstrument;
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
	// keep an array of numbers, where each array index corresponds to an instrument.
	// each number will be the current note index of each instrument.
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
		// TODO: maybe use a separate timers array just for these highlight oscillators? don't mix with the notes
		pianoRoll.timers.push(highlightOsc);
	});
	
	// figure out for each instrument the minumum number of gain nodes and oscillator nodes we need 
	// in order to minimize the number of nodes we need to create since that adds performance overhead
	var numGainNodePerInst = {}; // key: instrument index, value: total number of nodes needed for that instrument
	instruments.forEach((instrument, instIndex) => {
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
					var htmlNote = document.getElementById(note.block.id);
					if(parseInt(htmlNote.style.width) > parseInt(longestCurrNote.style.width)){
						longestCurrNote = htmlNote;
					}
				});

				currNote = longestCurrNote;
				
				var prevNotePos = getNotePosition(prevNote);
				var prevNoteLen = parseInt(prevNote.style.width);
				var currNotePos = getNotePosition(currNote);
				
				if(currNotePos < (prevNotePos + prevNoteLen)){
					// if the curr note starts before the curr note ends,
					// we know that we need an additional gain node to be able 
					// to play both notes simultaneously
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
				// ??? do we really need this?
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
	
	// need to be careful here! if we import a custom preset, we may be importing a network of nodes (that can be reused).
	// we can still maintain a 1:1 gain to route relationship but instead of the usual case where we have 1 gain for a route, we 
	// have one network of nodes (so maybe 2 gain nodes) for a route.
	var instrumentGainNodes = {};
	var instrumentOscNodes = {};
	var gainCount = 0;
	var oscCount = 0;

	for(var index in numGainNodePerInst){
		instrumentGainNodes[index] = [];
		instrumentOscNodes[index] = [];

		// this is the somewhat tricky part. if we have a custom instrument preset,
		// instead of just making 1 gain and 1 osc, we need to create an instance of that preset 
		// and take its gain nodes and osc nodes and add them as lists to the above lists. 
		// so in the end we should have a list of lists for gain and osc nodes 
		for(var i = 0; i < numGainNodePerInst[index]; i++){
			var newGainNodes;
			var newOscNodes;
			
			if(pianoRoll.instrumentPresets[instruments[index].waveType]){
				// handle custom instrument presets
				var presetData = pianoRoll.instrumentPresets[instruments[index].waveType];
				var currPreset = createPresetInstrument(presetData, pianoRoll.audioContext);
				var nodes = getNodesCustomPreset(currPreset);
				
				// note that these nodes are already connected
				newGainNodes = nodes.gainNodes;
				newOscNodes = nodes.oscNodes;

				newGainNodes.forEach((gain) => {
					gain.id = ("gain" + (gainCount++));
				});
				
				newOscNodes.forEach((osc) => {
					osc.id = ("osc" + (oscCount++));
				});
			}else{
				// only need 1 gain and 1 osc (with standard wave 'instruments')
				newGainNodes = [initGain(ctx)];
				newGainNodes[0].id = ("gain" + (gainCount++));
				
				newOscNodes = [ctx.createOscillator()];
				newOscNodes[0].id = ("osc" + (oscCount++));
				
				newOscNodes[0].connect(newGainNodes[0]);
			}
			
			instrumentGainNodes[index].push(newGainNodes); // push a list of lists (we want to maintain the node groups here) - a node group is responsible for playing a note as if it were one node 
			instrumentOscNodes[index].push(newOscNodes);
			pianoRoll.timers = pianoRoll.timers.concat(newOscNodes);
		}
	}
	
	// 'route' the notes i.e. assign them to the gain/osc nodes such that they all get played properly
	var routes = {}; // map instrument to another map of gain nodes mapped to the notes that should be played by those nodes
	var posTracker = {};
	
	for(var instrumentIndex = 0; instrumentIndex < instruments.length; instrumentIndex++){
		var instrument = instruments[instrumentIndex];
		
		if(instrumentGainNodes[instrumentIndex] === undefined){
			// this instrument doesn't have any notes. skip it.
			continue;
		}
		
		routes[instrumentIndex] = {};
		posTracker[instrumentIndex] = {}; // stores the end position (i.e. start + note width) of the last note assigned to a gain node for an instrument
		
		for(var j = 0; j < instrumentGainNodes[instrumentIndex].length; j++){
			routes[instrumentIndex][j] = [];
			posTracker[instrumentIndex][j] = 0;
		}
		
		// use instrumentNotePointers to take into account the startMarker 
		var start = instrumentNotePointers[instrumentIndex];
		for(var index = start; index < instrument.notes.length; index++){
			var group = instrument.notes[index];
			
			group.forEach((note, noteIndex) => {
				var lastEndPositions = posTracker[instrumentIndex]; // this is a map!
				var htmlNote = document.getElementById(note.block.id);
				var notePos = getNotePosition(htmlNote);
				var startPosCurrNote = notePos;
				var endPosCurrNote = notePos + parseInt(htmlNote.style.width);
				var gainNodeRoutes = instrumentGainNodes[instrumentIndex];
				
				// try each gain node in the map to see if they can handle this note. i.e. if another note should be playing for this gain 
				// while this current note is supposed to start, then this gain node cannot support this current note.
				// there should always be a possible gain node route option available
				for(var j = 0; j < gainNodeRoutes.length; j++){
					if(lastEndPositions[j] <= startPosCurrNote){
						// we can use this gain node!
						routes[instrumentIndex][j].push(note); // assign this note to the gain node
						lastEndPositions[j] = endPosCurrNote;  // log its ending position 
						break;
					}
				}
			});
		}
	}
	
	var allNotesPerInstrument = configureInstrumentNotes(routes, pianoRoll, instrumentGainNodes, instrumentOscNodes);

	var thisTime = ctx.currentTime;
	
	// start up the oscillators
	for(var inst in instrumentOscNodes){
		instrumentOscNodes[inst].forEach((oscGroup) => {
			oscGroup.forEach((osc) => {
				osc.start(thisTime);
			});
		});
	}
	
	for(var i = 0; i < instruments.length; i++){
		var currInstNotes = allNotesPerInstrument[i];
		if(currInstNotes === undefined){
			// no notes for this instrument
			continue;
		}
		
		currInstNotes.forEach((note) => {
			// schedule the notes!
			var oscs = note.osc; // this is a list
			var gains = note.gain; // this is a list	
			var duration = note.duration;
			var volume = note.volume;
			var startTimeOffset = note.startTimeOffset;
			var startTime = thisTime + startTimeOffset;
			var endTime = startTime + duration;
			var otherParams = note.note;
			
			// useful for debugging time drift of notes' start times. I found out that I was getting non-uniform start offset values for chords.
			//console.log(`instrument: ${instruments[i].name}; note: ${document.getElementById(otherParams.block.id).parentNode.id}; starting@ ${startTime} and ending@ ${endTime}; duration: ${duration}; start offset: ${startTimeOffset}`);
			// TODO: note start time drift is still a problem I need to solve and am currently using a cheap solution where 
			// I just make sure all notes in a chord start at the same time based on the first note in the chord.
			
			// log the time the last note will play
			pianoRoll.lastTime = Math.max(pianoRoll.lastTime, (thisTime + startTimeOffset));
			
			if(instruments[i].waveType === "percussion"){
				// handling percussion! in this case we're not caring about oscs and gains
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
				
			}else if(instruments[i].waveType === "piano"){
				// handling piano. in this case we're not caring about oscs (but we can use the gain nodes)
				// because for now we will create a new buffersource node for each note
				// in this case, we can be sure that there would be a 1:1 mapping of gain node to audio buffer node
				var noteName = document.getElementById(otherParams.block.id).parentNode.id.split('col')[0]; // i.e. get D7 from D7col_3
				
				var newAudioBufferNode = ctx.createBufferSource();
				newAudioBufferNode.buffer = pianoRoll.PianoManager.getAudioBufferForNote(noteName);
				
				oscs.forEach((osc) => {
					osc.disconnect();
				});
				
				gains.forEach((gain) => {
					newAudioBufferNode.connect(gain);
					pianoRoll.timers.push(newAudioBufferNode); // so we can stop playing whenever
					
					gain.gain.setTargetAtTime(volume*4, startTime, 0.0045); // the piano is kinda quiet so raise the volume a bit
					gain.gain.setTargetAtTime(0.0, (endTime - .0025), 0.0070);
					
					newAudioBufferNode.start(startTime);
					newAudioBufferNode.stop(endTime);
				});
			}else if(pianoRoll.instrumentPresets[instruments[i].waveType]){
				// for handling custom instrument preset!
				var gainValueSum = 0.0;
				gains.forEach((gain) => {
					if(gain.baseGainValue){
						// I'm not completely sure if it's safe to assume all gains here will
						// have the baseGainValue property, even though they should, I think,
						// since they're part of a custom preset
						gainValueSum += gain.baseGainValue;
					}
				});
				
				// schedule the gain nodes
				gains.forEach((gain) => {					
					var gainValue = gain.gain.value;
					
					// scale the volume appropriately based on the current note's volume 
					// if there's a baseGainValue property
					if(gain.baseGainValue){
						gainValue = (gain.baseGainValue / gainValueSum) * volume;
					}
					
					if(gain.envelope){
						// apply ADSR envelope as needed
						gain.envelope.applyADSR(gain.gain, startTime, duration, gainValue);
					}else{					
						gain.gain.setTargetAtTime(gainValue, startTime, 0.0045);
						gain.gain.setTargetAtTime(0.0, (endTime - .0025), 0.0010);
					}
				});
				
				// schedule the osc nodes 
				oscs.forEach((osc) => {
					if(osc.frequency){
						if(otherParams.freq < 440){
							osc.frequency.setValueAtTime(0.0, 0.0);
						}

						if(otherParams.block.style === "glide"){
							osc.frequency.setTargetAtTime(otherParams.freq, startTime, 0.025);
						}else{
							osc.frequency.setValueAtTime(otherParams.freq, startTime);
						}
						
						osc.frequency.setValueAtTime(0.0, endTime);
					}
				});
				
			}else{
				// handling regular instruments! (sine, square, triangle, sawtooth)
				gains.forEach((gain) => {
					// setting gain value here depending on condition allows for the 'articulation' of notes without 
					// the 'helicopter' sound when a certain note frequency is 0 but gain is not 0.
					// this is fixed by always setting gain to 0 if a note's frequency is 0.
					gain.gain.setTargetAtTime(volume, startTime, 0.0045);  // setting the time-constant to a really small value helps produce a softer attack for notes.
					
					// cut the duration by just a little bit to give the impression of articulation
					gain.gain.setTargetAtTime(0.0, (endTime - .0025), 0.0010);
				});
				
				oscs.forEach((osc) => {
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
					
					osc.frequency.setValueAtTime(0.0, endTime);
				});
				
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
// @param pianoRollObject: an instance of PianoRoll
function play(pianoRollObject){
	var ctx = pianoRollObject.audioContext;
	if(!pianoRollObject.isPlaying || (pianoRollObject.isPlaying && pianoRollObject.lastTime < ctx.currentTime)){
		pianoRollObject.isPlaying = true;
		pianoRollObject.currentInstrument.notes = readInNotes(pianoRollObject.currentInstrument, pianoRollObject);
		scheduler(pianoRollObject, false);
	}
}

// play all instruments
// @param pianoRollObject: an instance of PianoRoll
function playAll(pianoRollObject){
	var ctx = pianoRollObject.audioContext;
	if(!pianoRollObject.isPlaying || (pianoRollObject.isPlaying && pianoRollObject.lastTime < ctx.currentTime)){
		pianoRollObject.isPlaying = true;
		for(var instrument of pianoRollObject.instruments){
			instrument.notes = readInNotes(instrument, pianoRollObject);
		}
		scheduler(pianoRollObject, true);
	}
}

// record playback (for all instruments)
// @param pianoRollObject: an instance of PianoRoll
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
// @param pianoRollObject: an instance of PianoRoll
function stopPlay(pianoRollObject){

	pianoRollObject.isPlaying = false;

	for(var i = 0; i < pianoRollObject.timers.length; i++){
		var node = pianoRollObject.timers[i];
		node.stop(0);
		node.ended = null; // unhook onendFunc 
		node.disconnect();
	}
	
	for(var j = 0; j < pianoRollObject.instruments.length; j++){
		// I don't think this actually helps since we might have multiple gains per instrument :<
		pianoRollObject.instruments[j].gain.disconnect();
		
		// create a new gain for each instrument (this really is only needed when clicking notes, not playback)
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
// @param name: name of the instrument
// @param pianoRollObject: instance of PianoRoll
function createNewInstrument(name, pianoRollObject){
	// make new gain node for the instrument 
	var newGain = initGain(pianoRollObject.audioContext);
	newGain.connect(pianoRollObject.audioContext.destination);
	
	// create new instrument with oscillator
	var newInstrument = new Instrument("new_instrument", newGain, []);
	pianoRollObject.instruments.push(newInstrument);
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