// global variables

var numberOfMeasures = 4; 	// 4 measures by default
var subdivision = 8; 		// each measure subdivided by eighth notes
var timeSignature = "4/4";
var currentTempo = 500; 	// hold the current tempo - in milliseconds!! default is 120 bpm
var jsonData = []; 			// for saving and exporting json data 

var instruments = [];		// list of instruments will be an array
var timers = [];			// keep track of setTimeouts so all can be ended at once 
var currentInstrument; 		// need to keep track of what current instrument is!

// NOTE FREQUENCIES @ 440Hz
var noteFrequencies = {
/*
	"C0": 16.35,
	"C#0": 17.32,
	"Db0": 17.32,
	"D0": 18.35,
	"D#0": 19.45,
	"Eb0": 19.45,
	"E0": 20.60,
	"F0": 21.83,
	"F#0": 23.12,
	"Gb0": 23.12,
	"G0": 24.50,
	"G#0": 25.96,
	"Ab0": 25.96,
	"A0": 27.50,
	"A#0": 29.14,
	"Bb0": 29.14,
	"B0": 30.87,
	
	"C1": 32.70,
	"C#1": 34.65,
	"Db1": 34.65,
	"D1": 36.71,
	"D#1": 38.89,
	"Eb1": 38.89,
	"E1": 41.20,
	"F1": 43.65,
	"F#1": 46.25,
	"Gb1": 46.25,
	"G1": 49.00,
	"G#1": 51.91,
	"Ab1": 51.91,
	"A1": 55.00,
	"A#1": 58.27,
	"Bb1": 58.27,
	"B1": 61.74,
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
var noteLengths = {
	"quarter": 1, //4 means quarter note 
	"eighth": 2, //this means divide by a factor of 2 to get milliseconds per eighth note
	"sixteenth": 4
}

