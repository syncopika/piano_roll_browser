/***********

build the grid 

***********/


/****

set up grid headers first (the headers for each column)
@param columnHeaderRowId = a dom element ID 
@param pianoRollObject = a PianoRoll object 

****/
function buildGridHeader( columnHeaderRowId, pianoRollObject ){
	
	var columnHeaderRow = document.getElementById(columnHeaderRowId);
	
	// wherever each new measure starts, mark it
	// start at 2 (1 is implicit)
	var measureCounter = 2; 

	// this will provide the headers for each column in the grid (i.e. number for each beat/subbeat) 
	for(var i = 0; i < pianoRollObject.numberOfMeasures * pianoRollObject.subdivision + 1; i++){
		var columnHeader = document.createElement('div');
		columnHeader.id = "col_" + (i - 1); // the - 1 here is so that the very first column header block is col_-1, which won't be looked at when reading in notes 
		columnHeader.style.display = "inline-block";
		columnHeader.style.margin = "0 auto";
		if(i > 0){
			columnHeader.style.borderRight = "1px solid #000";
			columnHeader.style.textAlign = "center";
			
			if(i < pianoRollObject.subdivision + 1){
				// for the first measure
				if(i === pianoRollObject.subdivision){
					columnHeader.style.borderRight = '3px solid #000';
				}
				columnHeader.textContent = i;
			}else if(i !== pianoRollObject.numberOfMeasures * pianoRollObject.subdivision + 1){
				
				var subdiv = (i % pianoRollObject.subdivision) === 0 ? pianoRollObject.subdivision : (i % pianoRollObject.subdivision);
				
				// mark the measure number 
				if(subdiv === 1){
					var measureNumber = document.createElement("h2");
					measureNumber.innerHTML = measureCounter;
					measureNumber.style.margin = '0 0 0 0';
					measureNumber.style.color = pianoRollObject.measureNumberColor;
					columnHeader.appendChild(measureNumber);
					columnHeader.style.borderRight = "1px solid transparent";
					measureCounter++;
				}else{
					if(pianoRollObject.subdivision === subdiv){
						columnHeader.style.borderRight = '3px solid #000';
					}
					columnHeader.textContent = subdiv; 
				}
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
		columnHeader.addEventListener("click", function(){ highlightHeader(this.id, pianoRollObject) });
		
		columnHeaderRow.append(columnHeader);
	}
}

function highlightHeader(headerId, pianoRollObject){
	var element = document.getElementById(headerId);
	var currColor = element.style.backgroundColor;
	if(currColor !== pianoRollObject.playMarkerColor){
		if(pianoRollObject.playMarker){
			var oldMarker = document.getElementById(pianoRollObject.playMarker);
			oldMarker.style.backgroundColor = "rgb(255, 255, 255)";
		}
		var columnIndex = parseInt(headerId.match(/\d+/)[0]);
		pianoRollObject.playMarker = headerId;
		element.style.backgroundColor = pianoRollObject.playMarkerColor;
	}else{
		pianoRollObject.playMarker = null;
		element.style.backgroundColor = "rgb(255, 255, 255)";
	}
}


/****

set up rest of grid 

****/
function buildGrid( gridDivId, pianoRollObject ){

	var thePiano = document.getElementById(gridDivId);
	
	// this special div is the bar that shows the available notes 
	var pianoNotes = document.getElementById('pianoNotes');
	
	for(var note in pianoRollObject.noteFrequencies){
		
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
		newRowClone.id = "pianoNotes_" + newRow.id;
		var textClone = newRowText.cloneNode();
		textClone.innerHTML = note.substring(0, note.length - 1) + "<sub>" + note[note.length-1] + "</sub>";
		newRowClone.appendChild(textClone);
		pianoNotes.append(newRowClone);
		
		// append columns to each row 
		for(var j = 0; j < pianoRollObject.numberOfMeasures * pianoRollObject.subdivision; j++){
			var column = createColumnCell(note, j, pianoRollObject);
			newRow.appendChild(column);
		}
	}
}

function createColumnCell(pitch, colNum, pianoRollObject){
	var column = document.createElement("div");
	column.id = replaceSharp(pitch) + "col_" + colNum;
	column.style.display = 'inline-block';
	column.style.width = "40px";
	column.style.height = "15px";
	column.style.verticalAlign = "middle";
	column.style.backgroundColor = "transparent";

	// IMPORTANT! new attributes for each note
	column.setAttribute("volume", 0.3);		 	// set volume to 0.3 initially
	column.setAttribute("length", "eighth"); 	// length of note (quarter, eighth?)
	column.setAttribute("type", "default"); 	// type of note - set to default initially 
	column.className = "context-menu-one";
	
	if((colNum + 1) % pianoRollObject.subdivision == 0){
		column.style.borderRight = "3px solid #000";
	}else{
		column.style.borderRight = "1px solid #000";
	}

	// hook up an event listener to allow for picking notes on the grid!
	column.addEventListener("click", function(){ addNote(this.id, pianoRollObject) });
	// allow for highlighting to make it clear which note a block is
	column.addEventListener("mouseenter", function(){ highlightRow(this.id, pianoRollObject.highlightColor) });
	column.addEventListener("mouseleave", function(){ highlightRow(this.id, 'transparent') });
	return column;
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


// redraw thick grid cell lines for the correct cells if subdivision changes (i.e. going from 4/4 to 3/4)
// headerId = the id of the element that holds all the column header elements
function redrawCellBorders(pianoRollObject, headerId){

	var subdivision = pianoRollObject.subdivision;
	
	// filter out any right halves (i.e. id contains '-2') of any subdivided columns 
	var headers = Array.from(document.getElementById(headerId).children).filter(function(element){
		return element.id.indexOf('-2') < 0;
	});
	
	var measureCounter = 2;
	
	for(var i = 1; i < headers.length; i++){
		var columnHeader = headers[i];
		var colNum = parseInt(headers[i].id.match(/\d+/g)[0]);
		columnHeader.innerHTML = "";
		columnHeader.style.borderRight = '1px solid #000';
		
		var subdiv = (i % subdivision) === 0 ? subdivision : (i % subdivision);
		
		// take into account any subdivided columns because the right border of the left half can be different from the right half
		// the left half holds the column number while the right half border change might be needed
		
		if(i < subdivision + 1){
			// for the first measure
			if(i === pianoRollObject.subdivision){
				columnHeader.style.borderRight = '3px solid #000';
			}
			if(i !== 0){
				// just in case columnHeader was set to next sibling, make sure to use the original column header
				headers[i].textContent = i; 
			}
		}else{
			// mark the measure number 
			if(subdiv === 1){
				var measureNumber = document.createElement("h2");
				measureNumber.innerHTML = measureCounter++;
				measureNumber.style.margin = '0 0 0 0';
				measureNumber.style.color = pianoRollObject.measureNumberColor;
				
				columnHeader.appendChild(measureNumber);
				
				columnHeader.style.borderRight = "1px solid transparent";
				
			}else{
				if(subdivision === subdiv){
					columnHeader.style.borderRight = '3px solid #000';
				}
				headers[i].textContent = subdiv; 
			}
		}
		
		// don't forget to correct each header's column as well!
		// and also update the piano roll's number of measures!!
		var columnCells = document.querySelectorAll('[id$=' + '\"' + columnHeader.id + '\"]');
		//console.log(columnCells)
		
		// skip the first element, which is the column header (not a note on the grid)
		for(var j = 1; j < columnCells.length; j++){
			
			var gridCell = columnCells[j];
			
			// apply the same border modifications as the column header
			// need to be careful here: if a column is subdivided, we only look at the left half.
			// but the left half border style should not inherit from the column header (instead, the right half should inherit from the column header)
			// however, if the column header has a transparent right border, make it solid black 1px 
			if(columnHeader.id.indexOf('-1') > 0){
				gridCell.style.borderRight = '1px solid #000';
				gridCell.nextSibling.style.borderRight = (columnHeader.style.borderRight === '1px solid transparent') ? '1px solid #000' : columnHeader.style.borderRight;
			}else{
				gridCell.style.borderRight = (columnHeader.style.borderRight === '1px solid transparent') ? '1px solid #000' : columnHeader.style.borderRight;
			}
		};
		
		// update piano roll num measures 
		pianoRollObject.numberOfMeasures = measureCounter - 1;
		
	}
		
	// now we have to check if changing the meter altered the last measure in such a way that 
	// we have to add more columns (i.e. going from 4/4 to 3/4 may leave the last measure consisting of only 2 columns!)
	/* 
	    edge case: 
		what if user keeps switching between 4/4 and 3/4? the total number of measures will keep increasing
	*/
	
	var lastColNum = parseInt(headers[headers.length-1].id.match(/\d+/g)[0]);
	var headerColumnRow = document.getElementById(headerId);
	var currColHeadNum = ((lastColNum + 1) % subdivision) + 1;
	
	while((lastColNum + 1) % subdivision !== 0){
		var newColumnHead = document.createElement('div');
		newColumnHead.id = "col_" + (lastColNum + 1); 
		newColumnHead.style.display = "inline-block";
		newColumnHead.style.margin = "0 auto";
		newColumnHead.style.borderRight = ((lastColNum + 2) % subdivision === 0) ? '3px solid #000' : "1px solid #000";
		newColumnHead.style.textAlign = "center";
		newColumnHead.style.width = '40px';
		newColumnHead.style.height = '12px';
		newColumnHead.style.fontSize = '10px';
		newColumnHead.setAttribute("hasNote", 0);
		newColumnHead.textContent = currColHeadNum;
		headerColumnRow.append(newColumnHead);
		
		// add the rest of the column 
		for(var note in pianoRollObject.noteFrequencies){
			// ignore enharmonics 
			if(note.substring(0, 2) === "Gb" || note.substring(0, 2) === "Db" ||
			   note.substring(0, 2) === "D#" || note.substring(0, 2) === "G#" ||
			   note.substring(0, 2) === "A#"){
				continue;
			}
			var n = replaceSharp(note);
			var noteRow = document.querySelector('[id^=' + n + ']');
			noteRow.append(createColumnCell(note, lastColNum + 1, pianoRollObject));
		}
		
		currColHeadNum++;
		lastColNum++;
	}
}

try{
	module.exports = {
		replaceSharp: replaceSharp,
		buildGridHeader: buildGridHeader,
		buildGrid: buildGrid,
		highlightHeader: highlightHeader
	}
}catch(e){
	// ignore 
}