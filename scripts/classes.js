// Instrument and Note object classes

/****** INSTRUMENT CLASS ********/
// this class will hold an instrument's oscillator and current notes for that instrument
function Instrument(name, oscillator, gain, notesArray){
	// make these private??
	this.name = name;
	this.oscillator = oscillator;
	this.gain = gain;
	this.notes = notesArray;
}

/*****  NOTE CLASS ******/
// this class will hold a note's frequency and duration
// duration is in miliseconds (i.e. 600, 300, 1000) - because using setTimeout to play notes for specified duration
function Note(freq, duration, block){

	// make these private??
	this.freq = freq ? freq : 0.0; // if a value for freq is passed, use it. otherwise 0.
	this.duration = duration ? duration : 0.0;
	this.block = block;
	
	this.setFreq = function(value){
		this.freq = value;
	}
	
	this.setDuration = function(value){
		this.duration = value;
	}
	
	this.getFrequency = function(){
		return this.freq;
	}
	
	this.getDuration = function(){
		return this.duration;
	}
}

/* testing 
var n1 = new Note();
n1.setFreq(200);
n1.setDuration(1);
console.log(n1);
var n2 = new Note(250, 2);
console.log(n2);
*/
