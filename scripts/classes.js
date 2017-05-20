// Instrument and Note object classes

/****** INSTRUMENT CLASS ********/
function Instrument(name, oscillator, gain, notesArray){

	this.name = name;
	this.oscillator = oscillator; // assign an oscillator node object 
	this.gain = gain; // assign a gain node object
	this.notes = notesArray;
	this.waveType = "sine"; //sine wave by default 
	
	// volume property so all notes for a particular instrument can be set to a certain volume
	// float value!
	this.volume = .3; // set default volume to .3 (I think that's probably loud enough)
}

/*****  NOTE CLASS ******/
// this class will hold a note's frequency, duration, and div element
// duration is in miliseconds (i.e. 600, 300, 1000) - because using setTimeout to play notes for specified duration
function Note(freq, duration, block){

	this.freq = freq;
	this.duration = duration;
	this.block = new ElementNode(block);

	// if the note block passed in is supposed to be a rest
	if(freq === 0){
		this.block.id = null; // can use note.block.id null check 
	}
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
