/************** 

DOM MODIFICATION 


***************/


/****

plays the corresponding pitch of a block when clicked 

****/
function clickNote(id, waveType){

	var parent = document.getElementById(id).parentNode.id;
	parent = parent.replace('s', '#'); // replace any 's' with '#' so we can match a key in noteFrequencies
	
	setTimeout(function(){
		oscillator.type = waveType;
		oscillator.frequency.setValueAtTime(noteFrequencies[parent], 0);
		g.gain.value = .3;
		// this setTimeout makes sure the oscillator gets silent again
		setTimeout(function(){
			oscillator.frequency.value = 0.0;
			g.gain.value = 0;
		}, 100);
	}, 10); // use a small value like 10 so it starts "immediately"
}


/****

make notes clickable / toggle active note (green) 

****/
function addNote(id){
	if($('#' + id).css("background-color") === "rgb(0, 178, 0)"){
		$('#' + id).css("background-color", "transparent");
		
		// change hasNote attribute to false (0) in column header
		var headerId = id.substring(id.indexOf("col"));
		var currValue = parseInt(document.getElementById(headerId).getAttribute("hasNote"));
		document.getElementById(headerId).setAttribute("hasNote", --currValue);
		
		// if you choose a same note for the current instrument as another instrument, that will wipe out the 
		// 'onion-skin' of the other instrument's note. but if you delete that note for
		// the current instrument later, calling showOnionSkin() here will put back the 'onion-skin' for
		// the other instrument. there is no static 'onion-skin' layer. 
		// it's just changing the background-color of note blocks
		showOnionSkin(); 
		
	}else{
		$('#' + id).css("background-color", "rgb(0, 178, 0)");
		
		//change hasNote attribute to true (1) in column header
		var headerId = id.substring(id.indexOf("col"));
		var currValue = parseInt(document.getElementById(headerId).getAttribute("hasNote"));
		document.getElementById(headerId).setAttribute("hasNote", ++currValue);
	}
	var waveType = currentInstrument.waveType; //$('#' + type);
	clickNote(id, waveType);
}


/****

highlight row
-used when mouseover 

****/
function highlightRow(id, color){
	// get id of parent
	var parent = document.getElementById(id).parentNode.id;
	// highlight
	$('#' + parent).css('background-color', color);
}

/****

delete all notes - clear the grid
- does not alter subdivisions
- does not clear onion skin!
- only clears current instrument's notes 

****/
function clearGrid(){
	var columns = document.getElementById("columnHeaderRow").children;

	// start at 1 to ignore the column before 1 (the blank one)
	for(var i = 1; i < columns.length; i++){
		if(columns[i].getAttribute("hasnote") !== "0"){
			// change hasnote attribute back to 0!
			columns[i].setAttribute("hasnote", "0");
			var columnToCheck = $("div[id$='" + columns[i].id + "']").get();
			for(var j = 0; j < columnToCheck.length; j++){
				if(columnToCheck[j].style.backgroundColor === "rgb(0, 178, 0)"){
					columnToCheck[j].style.backgroundColor = "transparent";
				}
				if(columnToCheck[j].style.background !== ""){
					columnToCheck[j].style.background = "";
				}
			}
		}
	}
}

/****

like clearGrid, but clears EVERYTHING and rejoins any subdivisions 

****/
function clearGridAll(){
	var columns = document.getElementById("columnHeaderRow").children;

	// start at 1 to ignore the column before 1 (the blank one)
	for(var i = 1; i < columns.length; i++){
		if(columns[i].getAttribute("hasnote") !== "0"){
			// change hasnote attribute back to 0!
			columns[i].setAttribute("hasnote", "0");
			var columnToCheck = $("div[id$='" + columns[i].id + "']").get();
			for(var j = 0; j < columnToCheck.length; j++){
				if(columnToCheck[j].style.backgroundColor !== "transparent"){
					columnToCheck[j].style.backgroundColor = "transparent";
				}
				if(columnToCheck[j].style.background !== ""){
					columnToCheck[j].style.background = "";
				}
			}
		}
		
		if(columns[i].id.indexOf("-1") > 0){
			rejoin(columns[i].id, false);
		}
	}
}

/****

add a new measure

****/
function addNewMeasure(){

	// updating the measure count - notice specific id of element! 
	$('#measures').text( "number of measures: " + (parseInt($('#measures').text().match(/[0-9]{1,}/g)[0]) + 1) );
	
	// find the dummy node for the header columns and insert before that node
	// the new subdivisions of the new measure
	var dummy = $("div[id='columnHeaderRow_dummy']").get()[0];
	var dummyParent = dummy.parentNode;
	
	// new column headers 
	for(var i = 0; i < subdivision; i++){
		var newHeader = document.createElement('div');
		newHeader.id = "col_" + (numberOfMeasures * subdivision + i);
		newHeader.style.margin = "0 auto";
		newHeader.style.display = 'inline-block';		
		
		
		if(i + 1 === subdivision){
			newHeader.style.borderRight = "3px solid #000";
		}else{
			newHeader.style.borderRight = "1px solid #000";
		}
		
		newHeader.style.textAlign = "center";
		newHeader.style.width = '40px';
		newHeader.style.height = '12px';
		newHeader.style.fontSize = '10px';
		
		// 0 == false; i.e. does not have a note in the column
		// this attribute should help optimize performance a bit
		newHeader.setAttribute("hasNote", 0); 
		
		newHeader.textContent =  i + 1;
		
		dummyParent.insertBefore(newHeader, dummy);
	}
	
	// now add new columns for each note
	// note specific id of element 
	var noteRows = $('#piano').children().get();
	
	// start at 1 to skip column header row 
	for(var j = 1; j < noteRows.length; j++){
		for(var k = 0; k < subdivision; k++){
			// get the dummy element for this row
			dummy = $("div[id='" + noteRows[j].id + '_dummy' + "']").get()[0];
			var newColumn = document.createElement("div");
			newColumn.id = noteRows[j].id + "col_" + ((numberOfMeasures * subdivision) + k);
			// adjust id if needed
			newColumn.id = replaceSharp(newColumn.id);
			newColumn.style.display = 'inline-block';
			newColumn.style.width = '40px';
			newColumn.style.height = '15px';
			newColumn.style.verticalAlign = "middle";
			
			// IMPORTANT! new attributes for each note
			newColumn.setAttribute("volume", "");
			newColumn.setAttribute("length", "eighth"); // length of note (quarter, eighth?)
			newColumn.setAttribute("type", ""); // type of note - staccato, legato? 
			newColumn.className = "context-menu-one";
			
			if((k + 1) % subdivision == 0){
				newColumn.style.borderRight = "3px solid #000";
			}else{
				newColumn.style.borderRight = "1px solid #000";
			}

			// hook up an event listener to allow for selecting notes on the grid!
			//notice passing in id of option/select element for picking wave type. 
			newColumn.addEventListener("click", function(){ addNote(this.id) }); 
			// allow for highlighting to make it clear which note a block is
			newColumn.addEventListener("mouseenter", function(){ highlightRow(this.id, '#FFFF99') });
			newColumn.addEventListener("mouseleave", function(){ highlightRow(this.id, 'transparent') });
			noteRows[j].insertBefore(newColumn, dummy);
		}
		// adjust width of row 
		noteRows[j].style.width = parseInt(noteRows[j].style.width) + 20 + "%";
	}
	numberOfMeasures++; // increment measure variable
}

/****

choose instrument

****/
function chooseInstrument(thisElement){
	// console.log(thisElement);
	// look at grid, collect the notes, save them to the current instrument, and
	// move on to the clicked-on instrument
	currentInstrument.notes = readInNotes();
	
	// instrumentTable is specific to my implementation
	var instrumentsView = document.getElementById('instrumentTable').children;

	// change other instruments' label background color to transparent
	for(var i = 0; i < instrumentsView.length; i++){
		if(instrumentsView[i]){
			instrumentsView[i].style.backgroundColor = "transparent";
			
			// detach context menu from old instrument 
			instrumentsView[i].classList.remove("context-menu-instrument");
		}
	}
	
	// get index of clicked-on instrument in instrumentTable and subtract 1 to
	// account for 0-index when we use it to look in the global variable 'instruments' 
	// array for the corresponding instrument object
	var index = parseInt(thisElement) - 1;
	clearGrid();
	
	currentInstrument = instruments[index]; // this is the new instrument
	
	// attach new context menu only to current instrument via class name
	document.getElementById('instrumentTable').children[index].classList.add("context-menu-instrument");
	
	// then draw the previously-saved notes, if any, onto the grid of the clicked-on instrument
	drawNotes(currentInstrument); 
	
	showOnionSkin();
	
	$('#' + thisElement).css('background-color', 'rgb(188,223,70)');
	
}

/****

draw notes back on to grid

****/
// takes an instrument object and uses its notes array data to draw back the notes
function drawNotes(instrumentObject){
	var notes = instrumentObject.notes;
	for(var i = 0; i < notes.length; i++){
		
		if(notes[i].block.id === null){
			continue;
		}
		
		// only notes have a valid id (rests have null for id field)
		if(notes[i].block.id){		
			var elementExists = document.getElementById( notes[i].block.id );
	
			// if we need to paint in an eighth note, but the column is currently subdivided 
			if(!elementExists && notes[i].block.length === "eighth"){
				
				var blockId = notes[i].block.id;
				
				rejoin(blockId, true);
		
				// now that the correct column should be in place, assign elementExists the id of the note we need to draw in 
				elementExists = document.getElementById( notes[i].block.id );
			
			}else if(!elementExists && notes[i].block.length === "sixteenth"){
				// now if the note to draw in is a 16th note and there's no place to put it, create the subdivision
				var blockId = notes[i].block.id;
				var columnToFind = blockId.substring(0, blockId.indexOf("-"));
				subdivide(columnToFind, true);
				
				elementExists = document.getElementById( notes[i].block.id );
			}
			
			// make sure to set column header attr "hasNote" to 1!!!
			var columnHeader = elementExists.id.substring(elementExists.id.indexOf("col_"));
			columnHeader = document.getElementById(columnHeader);
			columnHeader.setAttribute("hasnote", "1");
			
			// color in note
			elementExists.style.backgroundColor = "rgb(0, 178, 0)";
		}
	}
}

/****

Onion skin feature

****/
// see where the other instruments' notes are 
function showOnionSkin(){
	for(var i = 0; i < instruments.length; i++){
		if(instruments[i] !== currentInstrument){
			// go through each instrument's notes
			for(var j = 0; j < instruments[i].notes.length; j++){
	
				if(instruments[i].notes[j].block.id === null){
					continue;
				}
				
				// get note id 
				var noteId = instruments[i].notes[j].block.id;
				// get location of each note
				var location = document.getElementById(noteId);
		
				if(!location){
					// if not present, it's either because there's no 16th measure or 8th measure
					if(noteId.indexOf("-1") < 0 && noteId.indexOf("-2") < 0){
						
						// ok so this note that we want to 'onion-skin' looks like an eighth note but
						// there's only the 16th note subdivisions available on the grid. 
						// so we'll find those subdivisions and just color them
						var subdiv = document.getElementById( noteId + "-1" );
						
						// color the subdiv AND its right sibling 
						if(subdiv.style.backgroundColor !== "rgb(0, 178, 0)"){
							subdiv.style.backgroundColor = "rgba(0, 178, 0, 0.2)";
							if(subdiv.nextSibling.style.backgroundColor !== "rgb(0, 178, 0)"){
								subdiv.nextSibling.style.backgroundColor = "rgba(0, 178, 0, 0.2)";
							}
						}
						
						/****
						warning! you also have to consider later quarter notes and longer notes.
						the function will have to be able to look at the attribute "length" to know 
						how many sibling elements to color!
						***/
					}else if(noteId.indexOf("-1") > 0){
						var findId = noteId.substring(0, noteId.indexOf("-"));
						var subdiv = document.getElementById(findId);
						if(subdiv.style.backgroundColor !== "rgb(0, 178, 0)"){
							subdiv.style.background = "linear-gradient(90deg, rgba(0, 178, 0, 0.2) 50%, transparent 50%)";
						}
					}else if(noteId.indexOf("-2") > 0){
						// make a temporary div that will be inserted into the corresponding eighth note column
						// make a special class for this div. remove it when switching instruments 
						// but then would I have to take care of it on playback? no because it doesn't even have "hasnote" attribute!
						var findId = noteId.substring(0, noteId.indexOf("-"));
						var subdiv = document.getElementById(findId);
						if(subdiv.style.backgroundColor !== "rgb(0, 178, 0)"){
							subdiv.style.background = "linear-gradient(90deg, transparent 50%, rgba(0, 178, 0, 0.2) 50%)";
						}
					}
				}
				
				if(location && instruments[i].notes[j].freq > 1){
					// set background color for that location a very light shade of green
					if(location.style.backgroundColor === "transparent"){
						location.style.backgroundColor = "rgba(0, 178, 0, 0.2)";
					}
				}
			}
		}
	}
}
