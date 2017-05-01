// Instrument and Note object classes

/****** INSTRUMENT CLASS ********/
// this class will hold an instrument's oscillator and current notes for that instrument
function Instrument(name, oscillator, gain, notesArray){

	this.name = name;
	this.oscillator = oscillator;
	this.gain = gain;
	this.notes = notesArray;
}

/*****  NOTE CLASS ******/
// this class will hold a note's frequency, duration, and div element
// duration is in miliseconds (i.e. 600, 300, 1000) - because using setTimeout to play notes for specified duration
// block is the div element html so I can get attribute information, id, etc...
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
// This is necessary because if you have say, for one instrument a note at column 5 which is
// an eighth note, but then in another instrument for that column you want a 16th note, which means
// that column is subdivided for that instrument. When you change instruments, you want the grid to 
// properly reflect the notes for that instrument. 

// Therefore, some addition or deletion of columns is needed.
// Assigning a note a copy of the element node is no good because once you subdivide a column
// with another instrument, since my implementation simply changes the original column elements' id (append '-1')
// and adds the 2nd 16th note column, the changed element id is shared among all notes that had that original 
// element block, regardless of instrument. it's shared because it's a reference to the element node. 
// making an object that instead holds some of that data should allow permanence of the data.

/* visual representation of what I'm trying to acheive because the above might still be confusing for me

let's say I've assigned a note at column 5 (eighth note) for instrument 1
                               id = "col5"
----------------------------------------------------
|  1   |   2   |   3   |   4   ||| 5 |||   6   | .....
------------------------------------------------------

then I add a new instrument, and decide I want 16th notes at column 5. 
column 5 now has a 2nd column appended after it, with the original staying but having the id and some attributes changed

                                id="col5-1"
----------------------------------------------------
|  1   |   2   |   3   |   4   | 5 | 5 |   6   | .....
------------------------------------------------------
                                     id="col5-2"
									 
after this change, the element node data for the note in instrument 1 now looks like "col5-1", and not "col5", which is what I want

*/ 

// pass in a dom element node and the object will extract the information 
function ElementNode(domElement){
	
	this.id = domElement.id;
	this.length = domElement.getAttribute("length");
	this.volume = domElement.getAttribute("volume");
	
}


/* testing 
var n1 = new Note();
n1.setFreq(200);
n1.setDuration(1);
console.log(n1);
var n2 = new Note(250, 2);
console.log(n2);
*/
