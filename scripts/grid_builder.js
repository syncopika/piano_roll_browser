/***********

build the grid 

***********/

/****

set up grid headers first (the headers for each column)

****/
function buildGridHeader( columnHeaderRowId ){

	var columnHeaderRow = $( '#' + columnHeaderRowId );

	// this will provide the headers for each column in the grid (i.e. number for each beat/subbeat) 
	for(var i = 0; i < numberOfMeasures * subdivision + 1; i++){
		var columnHeader = document.createElement('div');
		columnHeader.id = "col_" + (i - 1); // the - 1 here is important! 
		columnHeader.style.display = "inline-block";
		columnHeader.style.margin = "0 auto";
		if(i > 0){
			columnHeader.style.borderRight = "1px solid #000";
			columnHeader.style.textAlign = "center";
			
			if(i < subdivision + 1){
				if(i === subdivision){
					columnHeader.style.borderRight = '3px solid #000';
				}
				columnHeader.textContent = i;
			}else if(i !== numberOfMeasures * subdivision + 1){
				// subdiv goes from 1 to 16. if more than 16, start at 1 again. 
				var subdiv = (i % subdivision) === 0 ? subdivision : (i % subdivision);
				if(subdivision === subdiv){
					columnHeader.style.borderRight = '3px solid #000';
				}
				columnHeader.textContent = subdiv; 
			}
		}
		
		if(i === 0){
			columnHeader.style.width = '50px';
			columnHeader.style.height = '12px';
			columnHeader.style.border = '1px solid #000';
		}else{
			columnHeader.style.width = '40px';
			columnHeader.style.height = '12px';
			columnHeader.style.fontSize = '10px';
		}
		
		// 0 == false; i.e. does not have a note in the column
		columnHeader.setAttribute("hasNote", 0); 
		
		columnHeaderRow.append(columnHeader);
	}
	// can't pass in a jquery selected element
	appendDummyElement(document.getElementById('columnHeaderRow'));
}


/****

set up rest of grid 

****/
function buildGrid( gridDivId ){

	var thePiano = $('#' + gridDivId);
	
	// this special div is the bar that shows the available notes 
	var pianoNotes = $('#pianoNotes');
	
	var note;
	
	for(note in noteFrequencies){
		
		note = note;
		
		// ignore enharmonics 
		if(note.substring(0, 2) === "Gb" || note.substring(0, 2) === "Db" ||
		   note.substring(0, 2) === "D#" || note.substring(0, 2) === "G#" ||
		   note.substring(0, 2) === "A#"){
			continue;
		}
		
		//first create new element for new pitch
		var newRow = document.createElement('div');
		newRow.id = replaceSharp(note);
		
		var newRowText = document.createElement('div');
		newRowText.innerHTML = note.substring(0, note.length - 1) + "<sub>" + note[note.length-1] + "</sub>";
		newRowText.style.fontSize = '11px';
		newRowText.style.border = "1px solid #000";
		newRowText.style.display = 'inline-block';
		newRowText.style.width = "50px";
		newRowText.style.verticalAlign = "middle";
		
		newRow.appendChild(newRowText);
		thePiano.append(newRow);
		
		// add new row to pianoNotes div - this will just be a block holding all the notes 
		var newRowClone = newRow.cloneNode();
		var textClone = newRowText.cloneNode();
		textClone.innerHTML = note.substring(0, note.length - 1) + "<sub>" + note[note.length-1] + "</sub>";
		newRowClone.appendChild(textClone);
		pianoNotes.append(newRowClone);
		
		// append columns to each row 
		for(var j = 0; j < numberOfMeasures * subdivision; j++){
			var column = document.createElement("div");
			column.id = replaceSharp(note) + "col_" + j;
			column.style.display = 'inline-block';
			//column.style.cssFloat = "left";
			column.style.width = "40px";
			column.style.height = "15px";
			column.style.verticalAlign = "middle";
		
			// IMPORTANT! new attributes for each note
			column.setAttribute("volume", "");
			column.setAttribute("length", "eighth"); // length of note (quarter, eighth?)
			column.setAttribute("type", ""); // type of note - staccato, legato? 
			column.className = "context-menu-one";
			
			if((j + 1) % subdivision == 0){
				column.style.borderRight = "3px solid #000";
			}else{
				column.style.borderRight = "1px solid #000";
			}

			// hook up an event listener to allow for picking notes on the grid!
			column.addEventListener("click", function(){ addNote(this.id, "selectWave") });
			// allow for highlighting to make it clear which note a block is
			column.addEventListener("mouseenter", function(){ highlightRow(this.id, '#FFFF99') });
			column.addEventListener("mouseleave", function(){ highlightRow(this.id, 'transparent') });
			newRow.appendChild(column);
		}
		
		//not necessary anymore, but no negative effects?
		appendDummyElement(newRow);
	}
}

// helper function to replace '#' in string 
function replaceSharp(string){
	// this adjustment is only necessary for labeling the DOM elements so that they're clickable
	// previously, without this adjustment, sometimes you'd get a string id with two '#' chars for the sharp notes,
	// because of how I decided to label my ids. since you also need a # for jQuery selection, adjustment is necessary. 
	if(string.indexOf('#') != -1){
		return string.replace('#', 's'); // s for sharp
	}
	// otherwise do nothing
	return string;
}

function appendDummyElement(elementToAppendTo){
	var dummyElement = document.createElement('div');
	dummyElement.id = elementToAppendTo.id + "_dummy";
	elementToAppendTo.appendChild(dummyElement);
}
