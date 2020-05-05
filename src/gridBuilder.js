/***********

build the grid 

***********/

// create a column header (the first element of a column)
// @param num: an integer (i.e. a column number)
// @param pianoRollObject: an instance of PianoRoll
function createColumnHeader(num, pianoRollObject){
	var newHeader = document.createElement('div');
	newHeader.id = "col_" + (num-1);
	newHeader.style.margin = "0 auto";
	newHeader.style.display = 'inline-block';
	newHeader.style.textAlign = "center";
	newHeader.style.width = '40px';
	newHeader.style.height = '12px';
	newHeader.style.fontSize = '10px';
	
	var subdiv = (num % pianoRollObject.subdivision) === 0 ? pianoRollObject.subdivision : (num % pianoRollObject.subdivision);
	
	if(num > 0){
		newHeader.className = "thinBorder";	
		if(subdiv === 1){
			// mark the measure number (first column of measure)
			var measureNumber = document.createElement("h2");
			measureNumber.innerHTML = (Math.floor(num / pianoRollObject.subdivision)+1);
			measureNumber.style.margin = '0 0 0 0';
			measureNumber.style.color = pianoRollObject.measureNumberColor;
			newHeader.appendChild(measureNumber);
			newHeader.className = ""
		}else{
			if(pianoRollObject.subdivision === subdiv){
				newHeader.className = "thickBorder";
			}
			newHeader.textContent = subdiv; 
		}
	}
	
	// attach highlightHeader function to allow user to specify playing to start at this column 
	newHeader.addEventListener("click", function(){highlightHeader(this.id, pianoRollObject)});
	
	return newHeader;
}

// set up grid headers first (the headers for each column)
// @param columnHeaderRowId: a dom element ID 
// @param pianoRollObject: an isntance of PianoRoll
function buildGridHeader(columnHeaderRowId, pianoRollObject){
	
	var columnHeaderRow = document.getElementById(columnHeaderRowId);

	// this will provide the headers for each column in the grid (i.e. number for each beat/subbeat) 
	for(var i = 0; i < pianoRollObject.numberOfMeasures * pianoRollObject.subdivision + 1; i++){
		
		var columnHeader = createColumnHeader(i, pianoRollObject);

		// the very first column header is special :)
		if(i === 0){
			columnHeader.style.width = '50px';
			columnHeader.style.border = '1px solid #000'
		}
		
		columnHeaderRow.append(columnHeader);
	}
}

// used for setting a play marker to indicate where to start playing 
// @param headerId: an HTML element id of a column header
// @param pianoRollObject: an instance of PianoRoll
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


// build out cells of grid 
// @param gridDivId: a string representing an HTML element id of the grid
// @param pianoRollObject: an instance of PianoRoll 
function buildGrid(gridDivId, pianoRollObject){

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

// @param pitch: a string representing the pitch of a note, i.e. Fs5 (f sharp 5)
// @param colNum: an integer representing a column number
// @param pianoRollObject: an instance of PianoRoll 
function createColumnCell(pitch, colNum, pianoRollObject){
	var column = document.createElement("div");
	column.id = replaceSharp(pitch) + "col_" + colNum;
	column.style.display = 'inline-block';
	column.style.width = "40px";
	column.style.height = "15px";
	column.style.verticalAlign = "middle";
	column.style.backgroundColor = "transparent";
	column.setAttribute("type", "default"); 
	column.setAttribute("volume", 0.2);
	column.className = "noteContainer";
	
	if((colNum + 1) % pianoRollObject.subdivision == 0){
		column.classList.add("thickBorder");
	}else{
		column.classList.add("thinBorder");
	}

	// hook up an event listener to allow for picking notes on the grid!
	column.addEventListener("click", function(evt){
		addNote(this.id, pianoRollObject, evt, true);
	});
	
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
	return string;
}


// redraw thick grid cell lines for the correct cells if subdivision changes (i.e. going from 4/4 to 3/4)
// @param pianoRollObject: an instance of PianoRoll
// @param headerId: the id of the element that holds all the column header elements
function redrawCellBorders(pianoRollObject, headerId){

	var subdivision = pianoRollObject.subdivision; 
	var headers = Array.from(document.getElementById(headerId).children);
	
	var measureCounter = 2;
	
	for(var i = 1; i < headers.length; i++){
		var columnHeader = headers[i];
		var colNum = parseInt(headers[i].id.match(/\d+/g)[0]);
		columnHeader.innerHTML = "";
		columnHeader.className = "thinBorder";
		
		var subdiv = (i % subdivision) === 0 ? subdivision : (i % subdivision);
				
		if(i < subdivision + 1){
			// for the first measure
			if(i === pianoRollObject.subdivision){
				columnHeader.className = "thickBorder";
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
				columnHeader.className = "";
			}else{
				if(subdivision === subdiv){
					columnHeader.className = "thickBorder";
				}
				headers[i].textContent = subdiv; 
			}
		}

		var columnCells = document.querySelectorAll('[id$=' + '\"' + columnHeader.id + '\"]');
		
		// skip the first element, which is the column header (not a note on the grid)
		for(var j = 1; j < columnCells.length; j++){
			var gridCell = columnCells[j];
			gridCell.className = "noteContainer " + ((columnHeader.className === "") ? "thinBorder" : columnHeader.className);
		};
		
		// update piano roll num measures 
		pianoRollObject.numberOfMeasures = measureCounter-1;
		
	}
		
	// now we have to check if changing the meter altered the last measure in such a way that 
	// we have to add more columns (i.e. going from 4/4 to 3/4 may leave the last measure consisting of only 2 columns!)
	// what if user keeps switching between 4/4 and 3/4? the total number of measures will keep increasing
	
	var lastColNum = parseInt(headers[headers.length-1].id.match(/\d+/g)[0]);
	var headerColumnRow = document.getElementById(headerId);
	var currColHeadNum = ((lastColNum + 1) % subdivision) + 1;
	
	while((lastColNum + 1) % subdivision !== 0){
		var newColumnHead = document.createElement('div');
		newColumnHead.id = "col_" + (lastColNum + 1); 
		newColumnHead.style.display = "inline-block";
		newColumnHead.style.margin = "0 auto";
		newColumnHead.className = ((lastColNum + 2) % subdivision === 0) ? "thickBorder" : "thinBorder";
		newColumnHead.style.textAlign = "center";
		newColumnHead.style.width = '40px';
		newColumnHead.style.height = '12px';
		newColumnHead.style.fontSize = '10px';
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