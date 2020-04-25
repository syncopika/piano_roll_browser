/************

these functions control functionality such as:

- note reading / playback
- tempo change
- play/stop 

relies on PianoRoll object in classes.js 

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

	plays the corresponding pitch of a block when clicked 

****/
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
				let snap = addWaveNode(node, pianoRollObject);
				let snapOsc = snap[0];
				let snapEnv = snap[1];
				
				snapOsc.frequency.setValueAtTime(pianoRollObject.noteFrequencies[parent], time);
				snapEnv.gain.setValueAtTime(pianoRollObject.currentInstrument.volume, time);
				allNodes.push(snapOsc);
			});
			
			currPreset.noiseNodes.forEach((node) => {
				let noise = addNoise(node, pianoRollObject);
				let noiseOsc = noise[0];
				let noiseEnv = noise[1];
				
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


function sortNotesByPosition(instrument){
	
	// given a map of note ids to note elements,
	// sort them based on element.style.left 
	// and return a list of those elements 

	//var all_notes = [];

	/*
	for(var noteId in instrument.activeNotes){
		all_notes.push(instrument.activeNotes[noteId]);
	}
	
	all_notes.sort(function(note1, note2){
		var n1 = parseFloat(note1.style.left);
		var n2 = parseFloat(note2.style.left);
		return n1 - n2;
	});
	*/
	
	// organize notes by position
	var positionMapping = {};
	for(var noteId in instrument.activeNotes){
		
		var note = instrument.activeNotes[noteId];
		var position = parseInt(note.style.left);
		
		if(positionMapping[position] === undefined){
			positionMapping[position] = [note];
		}else{
			positionMapping[position].push(note);
		}
	}

	return positionMapping;
}





/****

	this will read all the notes, put them in an array and returns the array 

****/
function readInNotes(pianoRollObject){
	
	var notePosMap = sortNotesByPosition(pianoRollObject.currentInstrument);
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


/****

	need a scheduler to schedule when a note should be played given a time based on the AudioContext's timer 
	pass the schedule function a pianoRollObject, which holds the context, and an instrument, which has a notes array 
	startTime will be set when play is clicked on in the play function 
	
	take the stuff from readAndPlayNote 
	- figure out the realDuration and spacer 
	- create a new oscillator for every note?? (lots of garbage?)
	
	@param pianoRoll 
	- PianoRoll object
	
	@param allInstruments (boolean)
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
	
	// in the case where the user specified a measure to start playing at
	if(startMarker){
		startPos = document.getElementById(startMarker).getBoundingClientRect().left;
	
		for(var k = 0; k < pianoRoll.instruments.length; k++){
			// have each instrument start with the note at index given by startMarker
			for(var l = 0; l < pianoRoll.instruments[k].notes.length; l++){
				try{
					if(pianoRoll.instruments[k].notes[l].block.id.indexOf(startMarker) > -1){
						instrumentNotePointers[k] = l;
						break;
					}
				}catch(error){
					console.error(error);
					console.error(pianoRoll.instruments[k].notes[l]);
				}
			}
		}
	}
	
	while(pianoRoll.isPlaying && stillNotesToPlay < instruments.length){

		// for each instrument in the piano roll, get their next note and schedule it 
		// to play given the next note's duration 
		// mind any attributes like staccato and legato!
		for(var i = 0; i < instruments.length; i++){
			
			if(instruments[i] === null){
				continue;
			}
			
			// check if current note pointer for this instrument has reached the end of this
			// instrument's notes array. if so, increment stillNotesToPlay 
			var numNotesLeft = instruments[i].notes.length - instrumentNotePointers[i];
			if(numNotesLeft === 0){
				stillNotesToPlay++;
				instruments[i] = null;
				continue;
			}
			
			if(nextTime[i] === 0){
				// for the very first note
				nextTime[i] = ctx.currentTime;
			}
			
			var oscList = []; // list of nodes because some sounds have 2 parts (i.e. snare drum sound consists of 2 nodes to be played simultaneously)
			var notesArr = instruments[i].notes;
			var currIndex = instrumentNotePointers[i];
			var currNotes = notesArr[currIndex];
			var osc = null;
			var oscGainNode = initGain(ctx);

			currNotes.forEach(function(thisNote, index){
				
				/* 
					TODO: remove instrument's gain node (since we create new gain nodes on the fly for each note)
				*/
			
				var volume = thisNote.freq > 0 ? parseFloat(thisNote.block.volume) : 0.0;
				
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
				
				// don't forget any specified attributes for this particular instrument 
				// check wave type
				if(instruments[i].waveType === "percussion"){	
					// articulation DOES apply to percussion IF STACCATO OR LEGATO? ignore for now 
			
					// find out what octave the note is in 
					// note that the note might be a rest! so it has no block id!
					if(thisNote.block.id){
						var octave = parseInt(thisNote.block.id.match(/[0-9]/g)[0]);
						if(octave >= 2 && octave <= 4){
							osc = pianoRoll.PercussionManager.kickDrumNote(thisNote.freq, volume, nextTime[i], true);
						}else if(octave === 5){
							osc = pianoRoll.PercussionManager.snareDrumNote(thisNote.freq, volume, nextTime[i], true);
						}else{
							osc = pianoRoll.PercussionManager.hihatNote(volume, nextTime[i], true);
						}
					}else{
						// this is a rest
						osc = pianoRoll.PercussionManager.kickDrumNote(thisNote.freq, volume, nextTime[i], true);
					}
					
					oscList = oscList.concat(osc);	
					
				}else if(pianoRoll.instrumentPresets[instruments[i].waveType]){
					
					// custom intrument preset!
					var currPreset = pianoRoll.instrumentPresets[instruments[i].waveType];
					var instrumentPresetNodes = processNote(thisNote.freq, volume, nextTime[i], pianoRoll, currPreset); 
					oscList = oscList.concat(instrumentPresetNodes);
					
				}else{	

					osc = ctx.createOscillator();
					osc.connect(oscGainNode);
					osc.type = instruments[i].waveType;
					
					if(thisNote.freq < 440){
						// need to set initial freq to 0 for low notes (C3 and below)
						// otherwise gliding will be messed up for notes on one end of the spectrum
						osc.frequency.setValueAtTime(0, 0);
					}
					
					if(thisNote.block.style === "glide"){
						osc.frequency.setTargetAtTime(thisNote.freq, nextTime[i], 0.025);
					}else{
						//osc.frequency.setTargetAtTime(thisNote.freq, nextTime[i], 0);
						osc.frequency.setValueAtTime(thisNote.freq, nextTime[i]);
					}
					
					// check volume 
					// setting gain value here depending on condition allows for the 'articulation' of notes without 
					// the 'helicopter' sound when a certain note frequency is 0 but gain is not 0.
					// this is fixed by always setting gain to 0 if a note's frequency is 0.
					oscGainNode.gain.setTargetAtTime(volume, nextTime[i], 0.0045); 
					
					// change gain to 0 after a really small amount of time to give the impression of articulation
					oscGainNode.gain.setTargetAtTime(0, (nextTime[i]) + (realDuration / 1000) - .0025, 0.0010);		
					
					oscList.push(osc);
					
					// use right context destination for recording
					if(pianoRoll.recording){
						oscGainNode.connect(pianoRoll.audioContextDestMediaStream);
					}
					oscGainNode.connect(pianoRoll.audioContextDestOriginal);
					
				}
			
				// we generally expect oscList to have 1 osc node. sometimes there may be at least 2 (i.e. snare drum or a chord)
				pianoRoll.timers = pianoRoll.timers.concat(oscList);

				if(index === currNotes.length - 1){
					
					// we're at the last note of this chord (if multiple notes)
					oscList.forEach(function(osc){
						osc.start(nextTime[i]);
						osc.stop(nextTime[i] + (realDuration / 1000)); // why are we dividing by 1000?
					});
					
					// update lastTime and nextTime
					pianoRoll.lastTime = nextTime[i];
					
					// this is incorrect. the nextTime depends on the position of the next note.
					// if the next note starts before this current note ends, nextTime for that note will be wrong.
					// this basically forces all notes at different positions to be played in order and only
					// after a note finishes.
					// so one way to solve this problem may be to get the difference in this note's position with the next note
					// then get the duration from that difference
					if((currIndex + 1) < notesArr.length){
						// if there's another note after this note (or chord), figure out when that next note should be played
						console.log(notesArr[currIndex]);
						console.log(notesArr[currIndex+1]);
						var nextNote = notesArr[currIndex+1][0];
						var nextNotePos = document.getElementById(nextNote.block.id).getBoundingClientRect().left;
						var thisNotePos = document.getElementById(thisNote.block.id).getBoundingClientRect().left;
						var durationUntilNextNote = getCorrectLength(nextNotePos - thisNotePos, pianoRoll);
						nextTime[i] += (durationUntilNextNote / 1000);
						//console.log("next time start for next note: " + nextTime[i]);
					}else{
						nextTime[i] += (thisNote.duration / 1000);
					}

					// increment the note pointer for this instrument 
					instrumentNotePointers[i]++;
					
					// add note to play into currentInstrumentNoteQueue
					if(instruments[i] === pianoRoll.currentInstrument){
						// when oscillator ends, highlight the note (if oscList contains more than 1 node, just pick the first one)
						osc = oscList[0];
						osc.onended = onendFunc(thisNote.block.id, pianoRoll);
						
						pianoRoll.currentInstrumentNoteQueue.push({"note": thisNote.block.id, "time": nextTime[i]});
					}
					
				}
			
			}); // end forEach currNotes 
			
		} // end for	
	} // end while 
	
	if(pianoRoll.loopFlag && pianoRoll.isPlaying){
		// get the last oscillator and make it send a signal when it's done playing to start over again 
		pianoRoll.timers[pianoRoll.timers.length-1].onended = function(){loopSignal(pianoRoll, allInstruments)};
	}else if(pianoRoll.recording){
		// stop the recorder when the last oscillator is done playing
		pianoRoll.timers[pianoRoll.timers.length-1].onended = function(){	
			// stop recorder
			pianoRoll.recorder.stop();
			pianoRoll.recording = false;
			
			// html-specific: not the best thing to do here...
			document.getElementById('record').style.border = "";
		}
	}
	
}

function loopSignal(pianoRoll, allInstruments){
	setTimeout(function(){
		scheduler(pianoRoll, allInstruments);
	}, 80);
}


/****

	play notes for current instrument

****/
function play(pianoRollObject){
	var ctx = pianoRollObject.audioContext;
	if(!pianoRollObject.isPlaying || (pianoRollObject.isPlaying && pianoRollObject.lastTime < ctx.currentTime)){
		pianoRoll.isPlaying = true;
		
		// get the current notes 
		pianoRollObject.currentInstrument.notes = readInNotes(pianoRollObject);
		
		console.log(pianoRollObject.currentInstrument.notes);
		scheduler(pianoRollObject, false);
	}
}

/****

	play all instruments

****/
function playAll(pianoRollObject){
	var ctx = pianoRollObject.audioContext;
	if(!pianoRollObject.isPlaying || (pianoRollObject.isPlaying && pianoRollObject.lastTime < ctx.currentTime)){
		pianoRollObject.isPlaying = true;
		
		//pianoRollObject.currentInstrument.notes = readInNotes(pianoRollObject);
		
		// start the piano roll 
		scheduler(pianoRollObject, true);
	}
}

/****
	
	record playback 
	
****/
function recordPlay(pianoRollObject){
	if(pianoRollObject.recording){
		return;
	}else{
		pianoRollObject.recording = true;
		pianoRollObject.recorder.start();
		playAll(pianoRollObject);
	}
}

/****

	stop playback

****/
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
	pianoRollObject.currentInstrumentNoteQueue = [];
}


/***

	calculate length of note in milliseconds

***/
function getCorrectLength(length, pianoRollObject){
	var currentTempo = pianoRollObject.currentTempo;
	return Math.round((currentTempo / 40) * length); // 40 px == 1 eighth note.
}


/****

	create a new instrument 

****/
function createNewInstrument(name, pianoRollObject){
	// make new gain node for the instrument 
	var newGain = initGain(pianoRollObject.audioContext);
	newGain.connect(pianoRollObject.audioContext.destination);
	
	// create new instrument with oscillator
	var newInstrument = new Instrument("new_instrument", newGain, []);
	pianoRollObject.instruments.push(newInstrument);
}

function deleteInstrument(){
	//TODO
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