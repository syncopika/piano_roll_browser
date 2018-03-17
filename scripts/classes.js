// object classes

/****** 
	
	PIANO ROLL CLASS 
	this will hold all the data relevant to the piano roll, such as number of measures, subdivisions, time signature, etc.

*******/
function PianoRoll(){
	
	this.numberOfMeasures = 4; 	// 4 measures by default
	this.subdivision = 8; 		// each measure subdivided by eighth notes
	this.timeSignature = "4/4";
	this.currentTempo = 500; 	// hold the current tempo - in milliseconds!! default is 120 bpm
	this.instruments = [];		// list of instruments will be an array
	this.timers = [];			// keep track of setTimeouts so all can be ended at once 
	this.currentInstrument; 	// need to keep track of what current instrument is!
	this.audioContext;			// associate an AudioContext with this PianoRoll
	this.isPlaying;				// a boolean flag to easily quit playing
	this.lastTime; 				// the time the last note was supposed to be played

	// NOTE FREQUENCIES @ 440Hz
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
		"quarter": 1, //4 means quarter note 
		"eighth": 2, //this means divide by a factor of 2 to get milliseconds per eighth note
		"sixteenth": 4
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
	this.volume = .3; 				// set default volume to .3 (I think that's probably loud enough)
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
