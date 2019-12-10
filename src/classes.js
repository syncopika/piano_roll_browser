// object classes

/****** 
	
	PIANO ROLL CLASS 
	this will hold all the data relevant to the piano roll, such as number of measures, subdivisions, time signature, etc.

*******/
function PianoRoll(){
	this.numberOfMeasures = 4; 	// 4 measures by default
	this.subdivision = 8; 		// number of eighth notes per measure (8 for 4 quarter notes per measure, 6 for 3/4)
	this.timeSignature = "4/4"; 
	this.currentTempo = 500; 	// hold the current tempo - in milliseconds!! ((1000 ms/sec. * 60 sec./min.) / 120 beats/min. = 500 ms/beat) default is 120 bpm
	this.instruments = [];		// list of instruments will be an array
	this.timers = [];			// keep track of setTimeouts so all can be ended at once 
	this.currentInstrument; 	// need to keep track of what current instrument is!
	this.audioContext;			// associate an AudioContext with this PianoRoll
	this.audioContextDestOriginal; // the original audio context destination 
	this.audioContextDestMediaStream; // a media stream destination for the audio context (to be used when recording is desired)
	this.audioDataChunks = [];
	this.isPlaying;				// a boolean flag to easily quit playing
	this.lastTime; 				// the time the last note was supposed to be played
	this.currentInstrumentNoteQueue = []; // keep track of the current instrument' scheduled notes. use this for showing what note is currently playing
	this.loopFlag = false;		// if playback should be looped or not 
	this.recording = false;		// if recording. note that if looping, recording should not be possible.
	this.recorder;
	this.playMarker;		    // the id of a column header indicating where to start playing
	this.playMarkerColor = "rgb(50, 205, 50)";
	this.highlightColor = "#FFFF99";
	this.measureNumberColor = "#2980B9";
	this.noteColor = "rgb(0, 178, 0)";
	this.onionSkinNote = "rgba(0, 178, 0, 0.2)";
	this.instrumentTableColor = 'rgb(188, 223, 70)';
	this.currNotePlayingColor = 'rgb(112, 155, 224)';

	// instrument-related stuff 
	this.noiseBuffer; // for percussion 


	// NOTE FREQUENCIES WITH A @ 440Hz
	this.noteFrequencies = {
	/*
		"C8": 4186.01,
		"B7": 3951.07,
		"Bb7": 3729.31,
		"A#7": 3729.31,
		"A7": 3520.00,
		"Ab7": 3322.44,
		"G#7": 3322.44,
		"G7": 3135.96,
		"Gb7": 2959.96,
		"F#7": 2959.96,
		"F7": 2793.83,
		"E7": 2637.02,
		"Eb7": 2489.02,
		"D#7": 2489.02,
		"D7": 2349.32,
		"Db7": 2217.46,
		"C#7": 2217.46,
	*/
		"C7": 2093.00,
		"B6": 1975.53,
		"Bb6": 1864.66,
		"A#6": 1864.66,
		"A6": 1760.00,
		"Ab6": 1661.22,
		"G#6": 1661.22,
		"G6": 1567.98,
		"Gb6": 1479.98,
		"F#6": 1479.98,
		"F6": 1396.91,
		"E6": 1318.51,
		"Eb6": 1244.51,
		"D#6": 1244.51,
		"D6": 1174.66,
		"Db6": 1108.73,
		"C#6": 1108.73,
		"C6": 1046.50,

		"B5": 987.77,
		"Bb5": 932.33,
		"A#5": 932.33,
		"A5": 880.00,
		"Ab5": 830.61,
		"G#5": 830.61,
		"G5": 783.99,
		"Gb5": 739.99,
		"F#5": 739.99,
		"F5": 698.46,
		"E5": 659.25,
		"Eb5": 622.25,
		"D#5": 622.25,
		"D5": 587.33,
		"Db5": 554.37,
		"C#5": 554.37,
		"C5": 523.25,

		"B4": 493.88,
		"Bb4": 466.16,
		"A#4": 466.16,
		"A4": 440.00,
		"Ab4": 415.30,
		"G#4": 415.30,
		"G4": 392.00,
		"Gb4": 369.99,
		"F#4": 369.99,
		"F4": 349.23,
		"E4": 329.63,
		"Eb4": 311.13,
		"D#4": 311.13,
		"D4": 293.66,
		"Db4": 277.18,
		"C#4": 277.18,
		"C4": 261.63,
		
		"B3": 246.94,
		"Bb3": 233.08,
		"A#3": 233.08,
		"A3": 220.00,
		"Ab3": 207.63,
		"G#3": 207.63,
		"G3": 196.00,
		"Gb3": 185.00,
		"F#3": 185.00,
		"F3": 174.61,
		"E3": 164.81,
		"Eb3": 155.56,
		"D#3": 155.56,
		"D3": 146.83,
		"Db3": 138.59,
		"C#3": 138.59,
		"C3": 130.81,
		
		"B2": 123.47,
		"Bb2": 116.54,
		"A#2": 116.54,
		"A2": 110.00,
		"Ab2": 103.83,
		"G#2": 103.83,
		"G2": 98.00,
		"Gb2": 92.50,
		"F#2": 92.50,
		"F2": 87.31,
		"E2": 82.41,
		"Eb2": 77.78,
		"D#2": 77.78,
		"D2": 73.42,
		"Db2": 69.30,
		"C#2": 69.30,
		"C2": 65.41
	};

	// figure out note lengths using these. 
	// each note length corresponds to a factor which to divide the currentTempo (milliseconds per quarter note) by
	this.noteLengths = {
		"quarter": 1, 
		"eighth": 2,    // this means divide by a factor of 2 to get milliseconds per eighth note
		"sixteenth": 4
	}
	
	// initialize the audio context and setup some stuff 
	this.init = function(){
		
		var context = new AudioContext();
		this.audioContext = context;
		
		// suspend the context (M70 update (Chrome))
		context.suspend();
		
		// save a reference to the original audio destination
		this.audioContextDestOriginal = context.destination;
		
		// make a recorder
		var audioStream = context.createMediaStreamDestination();
		this.audioContextDestMediaStream = audioStream;
		this.recorder = new MediaRecorder(audioStream.stream);
		
		this.recorder.ondataavailable = (function(pianoRoll){
			return function(evt){
				pianoRoll.audioDataChunks.push(evt.data);
			}
		})(this);
		
		this.recorder.onstop = (function(pianoRoll){
			return function(evt){
				
				var blob = new Blob(pianoRoll.audioDataChunks, {'type': 'audio/ogg; codecs=opus'});
				console.log(blob);
				var url = URL.createObjectURL(blob);
				var link = document.createElement('a');
				link.href = url;
				
				// duration for output file will be set to infinity on Chrome
				// I don't think I can edit the file's duration unless you do some crazy annoying stuff. it's a chrome bug :/

				// note this is specific to my page html
				link.download = document.getElementById('pieceTitle').textContent + "_pianorollfun";
				link.click();
				
				// reset audio data array
				while(pianoRoll.audioDataChunks.length){
					pianoRoll.audioDataChunks.pop();
				}
			}
		})(this);
		
		this.PercussionManager = new PercussionManager(context);
	}

}


/****** INSTRUMENT CLASS ********/
function Instrument(name, gain, notesArray){
	this.name = name;
	this.gain = gain; 				// assign a gain node object
	this.notes = notesArray;		// array of Note objects
	this.activeNotes = {};			// this hash will keep track of the current green notes, by grid element ID only!
	this.waveType = "sine"; 		//sine wave by default 
	
	// volume property so all notes for a particular instrument can be set to a certain volume
	// float value!
	this.volume = .2; 				// set default volume to .2 (I think that's probably loud enough)
}

/*****  NOTE CLASS ******/
// this class will hold a note's frequency, duration, and div element
// duration is in milliseconds (i.e. 600, 300, 1000)
function Note(freq, duration, block){
	this.freq = freq;
	this.duration = duration;
	this.block = new ElementNode(block);
}

/****** CUSTOM DOM ELEMENT NODE CLASS *********/
// This class will take a DOM element node and just extract some important info from it,
// such as the id and custom attributes I've assigned, such as "length", "volume", etc.

// the id is very important in keeping track of which columns to subdivide or rejoin when
// switching instruments. 

// pass in a dom element node and the object will extract the information 
function ElementNode(domElement){
	this.id = domElement.id;
	this.length = domElement.getAttribute("length");
	this.volume = domElement.getAttribute("volume");
	
	// indicates whether note is regular, legato, staccato, or glide 
	this.style = domElement.getAttribute("type");
}

/***** PERCUSSION CLASS ******/
// thanks to: https://dev.opera.com/articles/drum-sounds-webaudio/
function PercussionManager(context){
	// set up a noise buffer
	// used in hihat and snare drum 
	this.context = context;
	var bufSize = context.sampleRate;
	var buffer = context.createBuffer(1, bufSize, bufSize);
	var output = buffer.getChannelData(0);
	for(var i = 0; i < bufSize; i++){
		output[i] = Math.random() * 2 - 1;
	}
	
	this.noiseBuffer = buffer;
	
	// note that each oscillator needs its own gain node!
	this.kickDrumNote = function(frequency, volume, time, returnBool){
		var context = this.context;
		var osc = context.createOscillator();
		var gain = context.createGain();
		osc.connect(gain);
		
		osc.frequency.setValueAtTime(frequency, time);
		gain.gain.setValueAtTime(volume, time);
		
		osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.1);
		gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
		
		gain.connect(context.destination);
		
		if(!returnBool){
			// this is just for clicking on a note
			osc.start(0);
			//gain.gain.setTargetAtTime(0.0, time + 0.08, 0.0045);
			osc.stop(time + 0.1);
		}else{
			// this is for a note that needs to be played.
			// return the oscillator node in an array
			return [osc];
		}
	}
	
	this.snareDrumNote = function(frequency, volume, time, returnBool){
		var context = this.context;
		var noise = context.createBufferSource();
		noise.buffer = this.noiseBuffer;
		var noiseFilter = context.createBiquadFilter();
		noiseFilter.type = 'highpass';
		noiseFilter.frequency.value = 1800;
		noise.connect(noiseFilter);

		// add gain to the noise filter 
		var noiseEnvelope = context.createGain();
		noiseFilter.connect(noiseEnvelope);
		noiseEnvelope.connect(context.destination);
		
		// the pianoRollObject should have the noise buffer and envelope set up for the snare 
		// we just need to trigger it 
		// here we add the snappy part of the drum sound
		var snapOsc = context.createOscillator();
		snapOsc.type = 'triangle';
		
		var snapOscEnv = context.createGain(); //gainNode;
		snapOsc.connect(snapOscEnv);
		snapOscEnv.connect(context.destination);
		
		noiseEnvelope.gain.setValueAtTime(volume, time);
		noiseEnvelope.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
		
		snapOsc.frequency.setValueAtTime(100, time);
		snapOscEnv.gain.setValueAtTime(0.7, time);
		snapOscEnv.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
			
		if(!returnBool){
			// this is for clicking a note (not setting up a note for playback)
			// filter the noise buffer 
			noise.start(time);
			snapOsc.start(time);
			snapOsc.stop(time + 0.2);
			noise.stop(time + 0.2);
		}else{
			return [noise, snapOsc];
		}
	}
	
	
	this.hihatNote = function(volume, time, returnBool){
		var context = this.context;
		var noise = context.createBufferSource();
		noise.buffer = this.noiseBuffer;
		var noiseFilter = context.createBiquadFilter();
		noiseFilter.type = 'highpass';
		noiseFilter.frequency.value = 1200;
		noise.connect(noiseFilter);

		// add gain to the noise filter 
		var noiseEnvelope = context.createGain();
		noiseFilter.connect(noiseEnvelope);
		noiseEnvelope.connect(context.destination);
		
		noiseEnvelope.gain.setValueAtTime(volume, time);
		noiseEnvelope.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
			
		if(!returnBool){
			// this is for clicking a note (not setting up a note for playback)
			// filter the noise buffer 
			noise.start(time);
			noise.stop(time + 0.2);
		}else{
			return [noise];
		}
	}
	
}

try{
	module.exports = {
		PianoRoll: PianoRoll,
		Instrument: Instrument,
		Note: Note,
		ElementNode: ElementNode
	}
}catch(e){
	// ignore
}