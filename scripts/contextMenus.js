/******* 
	
	CONTEXT MENU FOR INSTRUMENTS 
	@param pianoRollObject = a PianoRoll object 
	relies on dom elements with the class 'context-menu-instrument'
	
*******/
function makeInstrumentContextMenu(pianoRollObject){
    $(function(){
		$.contextMenu({
			selector: '.context-menu-instrument', 
			callback: function(key, options) {
			},
			items: {
				name: {
					name: "Name - press enter to change name", 
					type: 'text',
					value: "",
					events: {
						keyup: function(e){
							var node = document.getElementById( e.data.$trigger.attr("id") );
							// if pressing enter key 
							if(e.which === 13){
								node.textContent = this.value;
								
								// update the corresponding instrument object's name field
								var instrumentId = parseInt( e.data.$trigger.attr("id") ) - 1; 
								pianoRollObject.instruments[instrumentId].name = this.value;
							}
						}
					}
				},
				sep1: "-------------",
				select: {
					name: "Select wave type",
					type: 'select',
					options: {1: 'square', 2: 'sine', 3: 'sawtooth', 4: 'triangle'},
					selected: function() { 
						if(pianoRollObject.currentInstrument.waveType === "square" ){ 
							// this string I'm returning is actually the "key" for the options object above.
							// returning "1" will cause "square" to be shown as selected
							return "1";
						}else if(pianoRollObject.currentInstrument.waveType === "sine"){
							return "2";
						}else if(pianoRollObject.currentInstrument.waveType === "sawtooth"){
							return "3";
						}else{
							return "4";
						}		
					},
					events: {
						change: function(e){
							var instrumentId = parseInt( e.data.$trigger.attr("id") ) - 1; 
							pianoRollObject.instruments[instrumentId].waveType = (this.options[e.target.options[e.target.selectedIndex].value - 1].textContent);
						}
					}
				},
				sep2: "-------------",
				"Change volume": {
					name: "change volume",
					type: 'select',
					options: {1: .01, 2: .05, 3: 0.10, 4: 0.15, 5: 0.20, 6: 0.25, 7: 0.30, 8: 0.35, 9: 0.40, 10: 0.45, 11: 0.50},
					selected: function(){
						for(key in this.options){	
							if( parseFloat( this.options[key].textContent ) === pianoRollObject.currentInstrument.volume){
								return parseInt(key) + 1; // the keys' index is offset by 1 somehow? ...
							}
						}
					},
					events: {
						change: function(e){
							var instrumentId = parseInt( e.data.$trigger.attr("id") ) - 1; 
							// update current isntruments' volume 
							pianoRollObject.instruments[instrumentId].volume = parseFloat( this.options[e.target.options[e.target.selectedIndex].value - 1].textContent );
						}
					}
				},
				sep3: "-------------",
				"Delete": {
					name: "Delete", 
					icon: "delete",
					callback: function(key, options){
						//console.log(options);
						//alert(options.$trigger.attr("id") );
					}
				}
			}
		});
	});
}



/*****  
	
	CONTEXT MENU FOR GRID NOTES 
	
*****/
function makeNoteContextMenu(pianoRollObject){
	$(function(){
		$.contextMenu({
			selector: '.context-menu-one', 
			zIndex: 10,
			// this build option is especially useful for when you need to 
			// reference the element this context menu is called on (via e.data.$trigger)
			// i.e. when I need to show what option is currently selected for an element 
			build: function($triggerElement, e) {
				return {
						items: {
							"Change volume": {
								name: "change volume",		
								type: 'select',
								options: {1: .01, 2: .05, 3: 0.10, 4: 0.15, 5: 0.20, 6: 0.25, 7: 0.30, 8: 0.35, 9: 0.40, 10: 0.45, 11: 0.50},
								selected: function(){
									var currentVolume = document.getElementById( e.data.$trigger.attr("id") ).getAttribute("volume");
									for(key in this.options){
										if(this.options[key].textContent === pianoRollObject.currentVolume){
											return (parseInt(key) + 1) + "";
										}
									}
								},
								events: {
									change: function(e){
										var selectedNote = document.getElementById( e.data.$trigger.attr("id") );
										var selectedVolume = this.options[e.target.options[e.target.selectedIndex].value - 1].textContent;
										
										// update volume attribute in selected dom element 
										selectedNote.setAttribute("volume", parseFloat( selectedVolume ) );
									}
								}
							},
							"sep1": "------------",
							"Change style": {
								name: "change style",
								type: 'select',
								// sadly, Chrome has decided to remove audio dezippering from their web audio implementation, thus rendering a neat 'glide' effect when changing notes to be gone. 
								// see: https://www.chromestatus.com/features/5287995770929152
								// however, the effect can still be achieved with setTargetAtTime - just requires a bit of experimentation to get the right values 
								options: {1: "default", 2: "legato", 3: "staccato", 4: "glide"},
								selected: function(){
									var currentStyle = document.getElementById( e.data.$trigger.attr("id") ).getAttribute("type");
									for(key in this.options){
										if(this.options[key].textContent === currentStyle){
											return (parseInt(key) + 1) + "";
										}
									}
								},
								events: {
									change: function(e){
										var selectedNote = document.getElementById( e.data.$trigger.attr("id") );
										// update the type attribute in selected dom element 
										selectedNote.setAttribute("type", this.options[e.target.options[e.target.selectedIndex].value - 1].textContent );
									}
								}
							},
							"sep2": "------------",
							"Subdivide": {
								name: "Subdivide", 
								icon: "cut",
								callback: function(key, options){
									// get the id of the clicked-on block
									var id = options.$trigger.attr("id");
									
									// need to check if column hasnote attribute is -1.
									// if so, don't do anything!
									var blockHeader = document.getElementById( id.substring(id.indexOf("col_")) );
									if(blockHeader.getAttribute("hasnote") == -1){
										return;
									}
									
									subdivide(id, false, pianoRollObject);		
								}
							},
							"Join": {
								name: "Join",
								icon: "paste",
								callback: function(key, options){
									// if user wants to join two notes, they must be adjacent and the same note!
									// also need to check if attempting to call rejoin on concatenated note block! if so, don't do anything! 
									var id = options.$trigger.attr("id");
									var blockHeader = document.getElementById( id.substring(id.indexOf("col_")) );
									if(blockHeader.getAttribute("hasnote") == -1){
										return;
									}

									rejoin(options.$trigger.attr("id"), false, pianoRollObject); // preserve any green notes when splitting
								}
							}
							/*
							"Delete": {
								name: "Delete", 
								icon: "delete",
								callback: function(key, options){
									//console.log(options);
									//alert(options.$trigger.attr("id") );
									
									// need to check if attempting to call delete on concatenated note block! if so, don't do anything! 
									var id = options.$trigger.attr("id");
									var blockHeader = document.getElementById( id.substring(id.indexOf("col_")) );
									if(blockHeader.getAttribute("hasnote") == -1){
										return;
									}
									
									var block = document.getElementById(options.$trigger.attr("id"));
									block.style.backgroundColor = "transparent";
								}
							}*/
						}
					}
				}
		});
	});
};


// pass in id of an element, as well as true or false - true to clear the column of green, false to preserve notes
function subdivide(elementId, clearColumn, pianoRollObject){

	// get the id of the clicked-on block
	var id = elementId; //options.$trigger.attr("id");

	// check if already subdivided once! prevent 32nd notes for now 
	if(id.indexOf('-2') > 0){
		return;
	}

	if(id.indexOf('-1') > 0){
		// this is subdividing a 16th note block! (after 1 subdivision)
	
	}else{
		// this is subdividing an EIGHTH note block (the default one)	
		var colNum = id.substring(id.indexOf("col"));
		var column =  $("div[id$='" + colNum + "']").get();

		// revise column header first 
		var colHead = column[0];
		colHead.id = colHead.id + "-1";

		// split the header as well, but keep the 2nd half invisible
		// by making width 0
		var columnHalf = colHead.cloneNode(false);
		columnHalf.style.width = 0;
		columnHalf.style.borderRight = "";
		columnHalf.id = colNum + "-2";
		colHead.parentNode.insertBefore(columnHalf, colHead.nextSibling);
		
		/*
			important! check to see if the element clicked on is green. if it is, that means it was a green eight note before this subdivision,
			which means that its first and second half needs to be added to activeNotes of the current instrument 
		*/
		var thisElementIsGreen = document.getElementById(elementId).style.backgroundColor === 'rgb(0, 178, 0)';
		if(thisElementIsGreen){
			pianoRollObject.currentInstrument.activeNotes[elementId + '-1'] = 1;
			pianoRollObject.currentInstrument.activeNotes[elementId + '-2'] = 1;
			delete pianoRollObject.currentInstrument.activeNotes[elementId];
		}
		
		for(var i = 1; i < column.length; i++){

			// then split the block into 2 
			var block = column[i];
			
			// this is the new, 2nd block
			var block2 = block.cloneNode(false);
			
			// check if onion skin on any column blocks
			if(block.style.background === "linear-gradient(90deg, rgba(0, 178, 0, 0.2) 50%, transparent 50%)"){
				// make sure original block keeps background, but not block 2
				block.style.background = "";
				block2.style.background = "";
				block.style.backgroundColor = "rgba(0, 178, 0, .2)";
			}else if(block.style.background === "linear-gradient(90deg, transparent 50%, rgba(0, 178, 0, 0.2) 50%)"){
				block.style.background = "";
				block2.style.background = "";
				block2.style.backgroundColor = "rgba(0, 178, 0, .2)";
			}
			
			// if clearColumn is true, make sure all blocks are transparent
			if(clearColumn){
				block.style.backgroundColor = "transparent";
				block.style.background = ""; // this is in case linear-gradient is applied 
				block2.style.backgroundColor = "transparent";
				block2.style.background = "";
			}
			
			// now make some changes to the style for block and block2 
			block.style.width = '19px';
			block.setAttribute("length", "sixteenth");
			block.style.borderRight = "1px solid #000";
			block.id = block.id + "-1";
			
			block2.setAttribute("volume", block.getAttribute("volume"));	// set volume to whatever block's volume is
			block2.setAttribute("type", block.getAttribute("type")); 		// same for type of note
			block2.style.width = '20px';
			block2.id = block2.id + "-2"; // give new id to block2
			block2.className = "context-menu-one";
			
			// check if block 2 is green
			if(block2.style.backgroundColor !== 'rgb(0, 178, 0)'){
				block2.style.backgroundColor = 'transparent';
			}
			
			// notice how this.id must be used. this is because using block2.id doesn't actually pass the current block2.id 
			// string as an argument. I think it has something to do with block2 changing every iteration of this for-loop,
			// and because we're attaching an event listener that all block2 elements will use. at the very end of the loop,
			// the last element looked at in the for-loop gets to be the argument for highlightRow. it's not a separate thing for
			// each block2 element. they're sharing an eventListener, so you can't hardcode an argument if you want it to work for all
			// the elements. this.id makes sure that the eventListener looks at the id of whatever element is mouseover'd.
			block2.addEventListener("click", function(){ addNote(this.id, pianoRollObject) }); 
			block2.addEventListener("mouseenter", function(){ highlightRow(this.id, '#FFFF99') });
			block2.addEventListener("mouseleave", function(){ highlightRow(this.id, 'transparent') });
			
			// then put block2 after block1 in DOM
			block.parentNode.insertBefore(block2, block.nextSibling);	

			// special case here.
			// what if the note being subdivided is a concatenated note block (i.e. length = 'eighth-eighth')
			// then block2 will need to adopt the original note's neighbor's length, but with 'sixteenth' prepended
			// since block2 will be the new head for that concatenated block 
			// check for the hyphen, which is indicative of a concatenated block
			if(block2.getAttribute("length").indexOf("-") > 0){
				var neighborLength = block2.nextSibling.getAttribute("length");
				block2.setAttribute("length", "sixteenth-" + neighborLength);
			}else{
				block2.setAttribute("length", "sixteenth");
			}
		}
	}
}


// take an element node id as parameter, and true or false if you want to clear a whole column (no green in any block of the column)
function rejoin(elementId, clearColumn, pianoRollObject){

	block = document.getElementById(elementId);
	
	// if block is null, it doesn't exist. it might be a 16th note that should be an 8th note 
	// or vice versa	
	if(block === null){
		// is elementId referring to a 16th note?
		if(document.getElementById(elementId + '-1') !== null){
			block = document.getElementById(elementId + '-1');
		}else{
			block = document.getElementById(elementId.substring(0, elementId.indexOf('-')));
		}
	}
	
	var adjacentBlock = block.nextSibling; 
	var blockHeader = block.id.substring(block.id.indexOf("col_"));
	
	// some block columns have a BOLD right-border to indicate the end/start of a new measure 
	// since subdivision is 8, every 8th column should have a BOLD right border 
	// this variable will hold the column number. add 1 to account for 0-index offset, then check if
	// divisible by 8. 
	var boldBorder = parseInt(blockHeader.substring(blockHeader.indexOf("_") + 1).match(/[0-9]{1,}/g)[0]) + 1;
	
	var column =  $("div[id$='" + blockHeader + "']").get(); //only get the left-side 16th notes of subdivision
	blockHeader = column[0];
	
	// join two 16th note columns - must join from left!!!
	if(block.id.indexOf("-1") > 0 && blockHeader.id.indexOf("-2") < 0){
		
		// take care of column header first 
		// this renames the 1st half of the block (i.e. col_1-1) back to the original (i.e. col_1)
		blockHeader.id = blockHeader.id.substring(0, blockHeader.id.indexOf("-"));
		
		// delete adjacent 16th block header
		blockHeader.parentNode.removeChild(blockHeader.nextSibling);
		
		// then take care rest of column
		for(var i = 1; i < column.length; i++){
			blockHeader = column[i];
			blockHeader.style.width = "40px";
			blockHeader.setAttribute("length", "eighth");
			
			if(boldBorder % 8 === 0){
				blockHeader.style.borderRight = "3px solid #000";
			}
			
			if(clearColumn){
				blockHeader.style.backgroundColor = "transparent";
			}
			
			// this renames the 1st half of the block (i.e. C3col_1-1) back to the original (i.e. C3col_1)
			blockHeader.id = blockHeader.id.substring(0, blockHeader.id.indexOf("-"));
			
			blockHeader.parentNode.removeChild(blockHeader.nextSibling);
		}
		
		// if a PianoRoll object is passed in, do some changes for the current instrument here
		if(pianoRollObject && $('#' + elementId).css("background-color") === "rgb(0, 178, 0)"){
			
			// what if the right 16th note is actually a concatenated note block!?
			// need to keep track of its current length to add to this new eighth note being reformed 
			var rightLength = adjacentBlock.getAttribute("length");
			rightLength = rightLength.substring(rightLength.indexOf('-') + 1);
			var newLength = "eighth-" + rightLength;
			
			// update new eighth note block after rejoinment 
			var oBlock = document.getElementById(elementId);
			oBlock.setAttribute("length", newLength);
			
			// remove right border 
			var boldBorder = parseInt(elementId.match(/[0-9]{1,}/g)[0]) + 1;
			if(boldBorder % 8 === 0){
				$('#' + elementId).css("border-right", "3px solid transparent");
			}else{
				$('#' + elementId).css("border-right", "1px solid transparent");
			}
			
			// add renamed note to activeNotes, delete old ones only if notes being rejoined are green (i.e. belong to this instrument; not onion-skin)
			// because sometimes you might want to rejoin empty columns, in which you don't need to do any of this stuff here 
			pianoRollObject.currentInstrument.activeNotes[elementId] = oBlock.getAttribute("length").split('-').length;
			
			// also remove from active notes 
			for(note in pianoRollObject.currentInstrument.activeNotes){
				if(!document.getElementById(note)){
					delete pianoRollObject.currentInstrument.activeNotes[note];
				}
			}
		}
		
		// done here 
		return;
	}
	
	// joining an arbitrary number of notes 
	// btw, check out adjBlockHeader.getAttribute("hasnote") == 1 in the if statement. this is a good lesson in === vs ==.
	// even though I set the value of "hasnote" to a number, it gets stored as a string. using === will yield 
	// the wrong behavior because it won't implicitly convert types, and I'm comparing it with a number.
	var adjBlockHeader = document.getElementById( adjacentBlock.id.substring(adjacentBlock.id.indexOf("col_")) );

	if(block.style.backgroundColor === "rgb(0, 178, 0)" && 
	   adjacentBlock.style.backgroundColor === "rgb(0, 178, 0)" && 
	   adjBlockHeader.getAttribute("hasnote") == 1){
	
		// take the length of the adjacent block and add it to the current block
		// i.e. if current block is an eighth, and the adjacent is sixteenth, 
		// change the current block length attribute to "eighth-sixteenth"
		// (make sure to add 'eighth-sixteenth' as a length option in the length object in globals)
		var newLength = block.getAttribute('length') + '-' + adjacentBlock.getAttribute('length');
		block.setAttribute('length', newLength); 
		
		// for this note's entry in activeNotes, increment it based on the number of notes that are 
		// concatenated in it 
		var numNotes = newLength.split('-').length;
		pianoRollObject.currentInstrument.activeNotes[block.id] = numNotes;
		
		// then remove the right border from the current block so the note looks elongated appropriately
		block.style.borderRight = "1px solid transparent"; 
		
		// change adjacent block column header's hasnote attribute to -1 since it got concatenated with the current block
        // using -1 will be helpful in identifying concatenated blocks 		
		adjBlockHeader.setAttribute('hasnote', -1);
		
		// remove the adjacent note from activeNotes 
		delete pianoRollObject.currentInstrument.activeNotes[adjacentBlock.id];
		
		// ok, but how about deleting different length notes? 
		// how about this - keep a "head" reference attribute to an adjoined note. i.e. 
		// if eighth note with adjacent sixteenth, click join on eighth, the sixteenth note will have an attribute "head"
		// which is the id of the sixteenth. 
		// so if you had 4 eighth notes and joined them, but want to delete, you can click on any of the 4 and by using "head"
		// you will know which block to start and end to delete. make sure to give all of their borders back.
		// also, make sure to adjust headers' "hasNote" attribute back to 0.
		// and get rid of the 16th note nodes! i.e. delete "-1" and "-2"
		
		// subdivide on different length notes?
		// prevent subdividing on different length notes. allow subdividing on eighth notes only for now. 
		// i.e. make sure header has "hasNote === 0" before subdividing.
		
		// also, need to think about this 
		// when switching instruments, you need to also go through each note block's length attribute 
		// in the notes array to determine if any changes need to be made to any note block borders and
		// background color.
		
	}

}