/****

    add event listeners for buttons
    and other clickable elements

****/
function updateAddNoteSize(el){
    pianoRoll.addNoteSize = (el.options[el.options.selectedIndex]).textContent;
}

function updateLockNoteSize(el){
    pianoRoll.lockNoteSize = (el.options[el.options.selectedIndex]).textContent;
}

function bindButtons(pianoRollObject){
    document.getElementById('delMeasure').addEventListener('click', function(){
        if(pianoRollObject.numberOfMeasures > 1){
            var okToDelete = confirm("Are you sure you want to delete the last measure?");
            if(okToDelete){
                deleteMeasure(pianoRollObject);
                
                // update ui with correct num measures
                var measureCounterElement = document.getElementById("measures");
                measureCounterElement.textContent = "measure count: " + pianoRollObject.numberOfMeasures;
            }
        }
    });

    document.getElementById('addMeasure').addEventListener('click', function(){
        addNewMeasure(pianoRollObject, document.getElementById('columnHeaderRow'));
        
        var measureCounterElement = document.getElementById("measures");
        measureCounterElement.textContent = "measure count: " + pianoRollObject.numberOfMeasures;
    });
    
    document.getElementById('clearGrid').addEventListener('click', function(){
        clearGrid(pianoRollObject.currentInstrument);
        showOnionSkin(pianoRollObject);
    });
    
    document.getElementById('addInstrument').addEventListener('click', function(){
        addNewInstrument("newInstrument", true, pianoRollObject);
    });
    
    document.getElementById('play').addEventListener('click', function(){
        // resume the context per the Web Audio autoplay policy 
        context.resume().then(() => {
            play(pianoRoll);
        })
    });
    
    document.getElementById('playAll').addEventListener('click', function(){
        context.resume().then(() => {
            playAll(pianoRoll);
        })
    });
    
    document.getElementById('stopPlay').addEventListener('click', function(){
        stopPlay(pianoRoll);
    });
    
    document.getElementById('record').addEventListener('click', function(){
        if(this.style.border === ""){
            this.style.border = "solid 2px rgb(180,0,0)";
        }
        context.resume().then(() => {
            recordPlay(pianoRoll);
        })
    });
    
    document.getElementById("changeTempo").addEventListener('change', function(){
        changeTempo(pianoRoll, this);
    });
    
    // be able to change name of piece and composer 
    document.getElementById('titleLabel').addEventListener('dblclick', function(){
        var title = document.getElementById('pieceTitle');
        var userInput = prompt('new title name:');
        
        if(userInput === null){
            return;
        }
        
        title.textContent = userInput;
    });
    
    document.getElementById('composerLabel').addEventListener('dblclick', function(){
        var name = document.getElementById('composer');
        var userInput = prompt('new composer name:');
        
        if(userInput === null){
            return;
        }
        
        name.textContent = userInput;
    });
    
    document.getElementById('toggleStickyToolbar').addEventListener('click', function(evt){
        toggleStickyToolbar = !toggleStickyToolbar;
        evt.target.parentNode.style.backgroundColor = toggleStickyToolbar ? "#d0d0d0" : "";
    });
    
    /*
    document.getElementById('loop').addEventListener('click', function(){
        pianoRoll.loopFlag = !pianoRoll.loopFlag;
        if(pianoRoll.loopFlag){
            this.style.border = "2px solid green";
        }else{
            this.style.border = "";
        }
    });*/
    
    // toggle time signature 
    document.getElementById('timeSig').addEventListener('change', function(){
        var timeSig = document.getElementById('timeSig').value;
        changeTimeSignature(pianoRollObject, timeSig);
        redrawCellBorders(pianoRollObject, 'columnHeaderRow');
        
        // update measure count 
        $('#measures').text( "measure count: " + pianoRollObject.numberOfMeasures );
    });
    
    // import instrument preset
    document.getElementById('importInstrumentPreset').addEventListener('click', function(){
        importInstrumentPreset(pianoRollObject); // from instrumentPreset.js
    });
}


/****

gather JSON data 

first element in json data array will be an object with 
one key-value pair indicating how many measures there are.

http://stackoverflow.com/questions/728360/how-do-i-correctly-clone-a-javascript-object

****/
function getJSONData(pianoRoll){
    var data = {};
    
    // add metadata first 
    data["measures"] = pianoRoll.numberOfMeasures;
    data["tempo"] = parseInt( document.getElementById("changeTempo").value );
    
    // put in composer info, name of piece 
    data["composer"] = document.getElementById("composer").textContent;
    data["title"] = document.getElementById("pieceTitle").textContent;
    
    // get time signature (and set subdivision as well) 
    var timesig = document.getElementById("timeSig");
    data["timeSignature"] = timesig.options[timesig.selectedIndex].value;
    data["subdivision"] = (data["timeSignature"] === "4/4") ? 8 : 6;

    // now collect instruments
    // each instrument's data will be in an array mapped to the "instruments" key 
    data["instruments"] = [];
    for(var i = 0; i < pianoRoll.instruments.length; i++){
        var instrumentData = {};
        var currInstrument = pianoRoll.instruments[i];
        instrumentData["name"] = currInstrument["name"];
        instrumentData["volume"] = currInstrument["volume"];
        instrumentData["pan"] = currInstrument["pan"];
        instrumentData["waveType"] = currInstrument["waveType"];
        instrumentData["onionSkinOn"] = currInstrument["onionSkinOn"];
        instrumentData["notes"] = {};
        for(var note in currInstrument.activeNotes){
            var noteElement = currInstrument.activeNotes[note];
            var noteContainer = noteElement.parentNode;
            var noteData = {
                "width": noteElement.style.width,
                "left": noteElement.style.left,
                "volume": noteElement.dataset.volume,
                "type": noteElement.dataset.type,
            };
            if(!instrumentData["notes"][noteContainer.id]){
                instrumentData["notes"][noteContainer.id] = [noteData];
            }else{
                instrumentData["notes"][noteContainer.id].push(noteData);
            }
        }
        data["instruments"].push(instrumentData);
    }
    
    return data;
}

// TODO: rename this function to maybe downloadProject?
function generateJSON(){
    var nameOfFile = prompt("please enter name: ");
    if(nameOfFile === null){
        return;
    }

    var jsonData;

    pianoRoll.currentInstrument.notes = readInNotes(pianoRoll.currentInstrument, pianoRoll);
    
    var data = getJSONData(pianoRoll);

    jsonData = JSON.stringify(data, null, 4);
    
    var blob = new Blob([jsonData], {type: "application/json"});
    var url = URL.createObjectURL(blob);
    
    var link = document.createElement('a');
    link.href = url;
    
    link.download = nameOfFile + ".json";
    
    link.click();
    
    // clear array for new data 
    jsonData = [];
}


/****

import JSON data from file

****/
function processData(data){
    // update metadata 
    document.getElementById("composer").textContent = data.composer; // could be undefined!
    document.getElementById("pieceTitle").textContent = data.title; // could be undefined!
    var timesig = data.timeSignature || "4/4";
    document.getElementById('timeSig').value = timesig;
    
    pianoRoll.subdivision = data.subdivision || 8;
    
    // reset measure boundaries if time sig is not 4/4 
    redrawCellBorders(pianoRoll, 'columnHeaderRow');
    
    // set new tempo acording to json data
    document.getElementById("changeTempo").value = data.tempo;
    pianoRoll.currentTempo = ((1/(data.tempo / 60000))/2) // length of 8th note in ms. based on tempo
    
    // now put the data on the grid 
    var measures = data.measures;
    
    // adjust measures
    var measuresToAdd = measures - pianoRoll.numberOfMeasures;
    if(measures > pianoRoll.numberOfMeasures){
        // add more measures
        for(var i = 0; i < measuresToAdd; i++){
            document.getElementById('addMeasure').click();
        }
    }else if(measures < pianoRoll.numberOfMeasures){
        // delete extra measures
        while(measures < pianoRoll.numberOfMeasures){
            deleteMeasure(pianoRoll);
        }
    }
    
    // update num of measures 
    $('#measures').text( "measure count: " + pianoRoll.numberOfMeasures );

    // then assign instruments array the data 
    pianoRoll.instruments = []; // clear instruments array 
    
    // clear the current instrument table in the dom
    var instrumentsGrid = document.getElementById("instrumentTable");
    while(instrumentsGrid.firstChild){
        instrumentsGrid.removeChild(instrumentsGrid.firstChild);
    }
    
    for(var i = 0; i < data.instruments.length; i++){
        // put each instrument into the instrument grid 
        addNewInstrument(data.instruments[i].name, false, pianoRoll);
        
        var newInstrument = data.instruments[i];
        // TODO: this is not ideal if we need to add more instrument attributes
        if(newInstrument.pan === undefined){
            newInstrument.pan = 0.0;
        }else if(newInstrument.isMute === undefined){
            newInstrument.isMute = false;
        }
        
        // set up a fresh new gain node for each instrument 
        var newGain = initGain(pianoRoll.audioContext);
        newInstrument.gain = newGain;
        newGain.connect(context.destination);
        
        // add their notes to the grid
        newInstrument.activeNotes = {};
        for(var noteContainerId in newInstrument.notes){
            // newInstrument.notes is a mapping of noteContainer ids to 
            // the length and left pos of the actual note that will go in
            // the containers
            newInstrument.notes[noteContainerId].forEach((noteAttr) => {
                var newNote = createNewNoteElement(pianoRoll);
                newNote.style.width = noteAttr.width;
                newNote.style.left = noteAttr.left;
                newNote.style.opacity = (i === 0) ? 1.0 : (newInstrument.onionSkinOn ? 0.3 : 0.0);
                newNote.style.zIndex = (i === 0) ? 100 : 0;
                newNote.setAttribute("data-volume", noteAttr.volume);
                newNote.setAttribute("data-type", noteAttr.type);
                newInstrument.activeNotes[newNote.id] = newNote;
                document.getElementById(noteContainerId).appendChild(newNote);

                var colHeader = document.getElementById(noteContainerId.substring(noteContainerId.indexOf("col")));
                colHeader.setAttribute("data-num-notes", parseInt(colHeader.dataset.numNotes + 1));            
            });
        }
        newInstrument.notes = readInNotes(newInstrument, pianoRoll);
        
        // add new instrument to array
        pianoRoll.instruments.push(newInstrument);
    }
    
    // make 1st instrument active
    var instrument1 = document.getElementById("instrumentTable").firstChild;
    instrument1.style.backgroundColor = "rgb(188,223,70)";
    instrument1.classList.add("context-menu-instrument");
    
    pianoRoll.currentInstrument = pianoRoll.instruments[0];
}

function fileHandler(){
    //initiate file choosing after button click
    var input = document.getElementById('importFile');
    input.addEventListener('change', getFile, false);
    input.click();
}

function getFile(e){
    var reader = new FileReader();
    var file = e.target.files[0];
    
    //when the image loads, put it on the canvas.
    reader.onload = (function(theFile){
        return function(e){
            
            var data = JSON.parse(e.target.result);
            
            // make sure project is valid
            if(!validateProject(data)){
                return;
            }
            
            // note that I'm relying on my pianoRoll variable
            clearGridAll(pianoRoll);
            
            processData(data);
        }
    })(file);

    //read the file as a URL
    reader.readAsText(file);
}

function importInstrumentPreset(pianoRoll){
    let audioCtx = pianoRoll.audioContext;
    let input = document.getElementById('importInstrumentPresetInput');
    
    function processInstrumentPreset(e){
        let reader = new FileReader();
        let file = e.target.files[0];
        
        if(file){
            reader.onload = (function(theFile){
                return function(e){ 
                    let data = JSON.parse(e.target.result);
                    
                    if(data['name'] === undefined){
                        console.log("cannot load preset because it has no name!");
                        return;
                    }
                    
                    let presetName = data['name'];
                
                    // store the preset in the PianoRoll obj 
                    pianoRoll.instrumentPresets[presetName] = data.data;
                }
            })(file);
            
            //read the file as a URL
            reader.readAsText(file);
        }
    }
    
    input.addEventListener('change', processInstrumentPreset, false);
    input.click();
}

// some basic validation, not comprehensive (i.e. not going to check whether every note has all the necessary fields)
function validateProject(project){
    var measures = typeof(project.measures) === "number";
    var tempo = typeof(project.tempo) === "number";
    var composer = typeof(project.composer) === "string";
    var title = typeof(project.title) === "string";
    var subdivision = typeof(project.subdivision) === "number"; // do we even need this?
    var instruments = Array.isArray(project.instruments);
    
    // make sure note information is in current format
    project.instruments.forEach((instrument) => {
        
        if(!(typeof(instrument.notes) === "object")){
            return false;
        }
        
        for(var note in instrument.notes){
            var isNoteArray = Array.isArray(instrument.notes[note]);
            if(!isNoteArray){
                return false;
            }
        }
            
    });
    
    return measures && 
           tempo && 
           composer && 
           title && 
           subdivision && 
           instruments;
}

// load in the example instrument presets
function loadExamplePresets(pElement){
    return new Promise((resolve, reject) => {
        const presets = [
            "example_presets/belltone.json",
            "example_presets/delaySine.json",
            "example_presets/noisySine.json",
            "example_presets/dissonant.json",
        ];
        
        let count = presets.length;
        pElement.textContent = "loading custom instrument presets...";
        
        presets.forEach((preset) => {
            fetch(preset)
                .then(response => response.json())
                .then(data => {
                    const name = data.name;
                    pianoRoll.instrumentPresets[name] = data.data;
                    
                    count--;
                    
                    if(count === 0){
                        pElement.textContent = "";
                        resolve(true);
                    }
                });
        });
    });
}

/****
if testing locally, remember that Chrome
doesn't allow cross-origin resource sharing

use python -m http.server to launch 
a local server. then access index.html through localhost:8000. 

****/
function getDemo(selectedDemo){
    // get the selected demo from the dropbox
    // selectedDemo is the path to the demo to load 
    if(selectedDemo.options[selectedDemo.selectedIndex].text === ""){
        return;
    }

    var selectedDemo = "demos/" + selectedDemo.options[selectedDemo.selectedIndex].text + ".json"; 

    var httpRequest = new XMLHttpRequest();

    if(!httpRequest){
        // unable to make request instance
        return;
    }
    
    httpRequest.open("GET", selectedDemo);
    
    httpRequest.onload = function(){
        // clear grid first
        clearGridAll(pianoRoll);
        // reset playMarker if set 
        pianoRoll.playMarker = null;
        // stop playing if currently playing
        stopPlay(pianoRoll);
        var data = JSON.parse(httpRequest.responseText);
        processData(data);
    }
    
    httpRequest.send();
}




/////////////////////// database-specific (mongodb) stuff
/****
    save current project to database
****/
function saveProjectToDB(){
    var jsonData;
    
    pianoRoll.currentInstrument.notes = readInNotes(pianoRoll.currentInstrument, pianoRoll);
    
    var jsonData = JSON.stringify(getJSONData(pianoRoll), null, 4);
    
    $.ajax({
        type: 'POST',
        url: '/save_score',
        dataType: "JSON",
        data: {
            score: jsonData // the query attribute is "score"!
        },
        success: function(response){                
            // TODO: add to the 'choose score' dropdown and make it the currently selected score?
            console.log("posted score to database");
        }
    });
}


/****
    select a score of this user in the db
****/
function selectProject(selectedPrj){
    // get the selected demo from the dropbox
    // selectedDemo is the path to the demo to load 
    if(selectedPrj.options[selectedPrj.selectedIndex].text === ""){
        return;
    }
    
    // need to make a request for the score!
    var data;
    var selectedScore = selectedPrj.options[selectedPrj.selectedIndex].text;
    $.ajax({
        type: 'GET',
        url: '/get_score/?name=' + selectedScore,
        success: function(response){                
            console.log("got score");
            
            var userScores = response[0].local.scores;
            for(var i = 0; i < userScores.length; i++){
                if(userScores[i].title.trim() === selectedScore){
                    data = userScores[i];
                }
            }
            
            // request was successful. process json data now.
            pianoRoll.playMarker = null;
            stopPlay(pianoRoll);
            clearGridAll(pianoRoll);
            processData(data);
        }
    });
}