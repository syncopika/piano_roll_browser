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
      const okToDelete = confirm("Are you sure you want to delete the last measure?");
      if(okToDelete){
        deleteMeasure(pianoRollObject);
                
        // update ui with correct num measures
        const measureCounterElement = document.getElementById('measures');
        measureCounterElement.textContent = "measure count: " + pianoRollObject.numberOfMeasures;
      }
    }
  });

  document.getElementById('addMeasure').addEventListener('click', function(){
    addNewMeasure(pianoRollObject, document.getElementById('columnHeaderRow'));
        
    const measureCounterElement = document.getElementById('measures');
    measureCounterElement.textContent = "measure count: " + pianoRollObject.numberOfMeasures;
  });
    
  document.getElementById('clearGrid').addEventListener('click', function(){
    const confirmClear = confirm('are you sure you want to clear the grid?');
    if(confirmClear){
      clearGrid(pianoRollObject.currentInstrument);
      showOnionSkin(pianoRollObject);
    }
  });
    
  document.getElementById('addInstrument').addEventListener('click', function(){
    addNewInstrument("newInstrument", true, pianoRollObject);
  });
    
  document.getElementById('play').addEventListener('click', function(){
    // resume the context per the Web Audio autoplay policy 
    context.resume().then(() => {
      if(pianoRoll.selectedVisualizer){
        buildVisualizer('grid', pianoRoll);
        if(pianoRoll.selectedVisualizer === 'wave'){
          updateVisualizer(pianoRoll);
        }
      }
      play(pianoRoll);
    });
  });
    
  document.getElementById('playAll').addEventListener('click', function(){
    context.resume().then(() => {
      if(pianoRoll.selectedVisualizer){
        buildVisualizer('grid', pianoRoll);
        if(pianoRoll.selectedVisualizer === 'wave'){
          updateVisualizer(pianoRoll);
        }
      }
      playAll(pianoRoll);
    });
  });
    
  document.getElementById('pausePlay').addEventListener('click', function(){
    pausePlay(pianoRoll);
  });
    
  document.getElementById('stopPlay').addEventListener('click', function(){
    stopPlay(pianoRoll);
    
    if(pianoRoll.visualizerCanvas && pianoRoll.selectedVisualizer === 'ripples'){
      // stop the visualizer
      updateRipplesVisualizer(pianoRoll, [], true);
    }
        
    if(pianoRoll.visualizerCanvas){
      removeVisualizer(pianoRoll);
    }
  });
    
  document.getElementById('toggleVisualizer').addEventListener('click', function(evt){
    if(pianoRoll.selectedVisualizer === 'wave'){
      // turn off wave visualizer
      document.getElementById('toggleVisualizer').style.backgroundColor = '';
      pianoRoll.visualizerRequestAnimationFrameId = window.requestAnimationFrame((timestamp) => updateVisualizer(pianoRoll, true)); // stop visualizer and clear it
      pianoRoll.selectedVisualizer = null;
    }else{
      // if ripples visualizer is selected, turn it off
      if(pianoRoll.selectedVisualizer === 'ripples'){
        document.getElementById('toggleRipplesVisualizer').style.backgroundColor = '';
        updateRipplesVisualizer(pianoRoll, [], true);
        
        // if currently playing, let user know the visualizer will take effect
        // on next play. this is because we attach the analyser node on play
        // (we can't add the analyser node during playback)
        if(pianoRoll.isPlaying){
          alert('this visualizer will take effect on next playback!');
        }
        
        if(pianoRoll.visualizerCanvas){
          removeVisualizer(pianoRoll);
        }
      }
      
      // turn on wave visualizer again (e.g. if the wave visualizer was just turned off)
      if(pianoRoll.selectedVisualizer === null){
        pianoRoll.visualizerRequestAnimationFrameId = window.requestAnimationFrame((timestamp) => updateVisualizer(pianoRoll, false));
      }
      
      document.getElementById('toggleVisualizer').style.backgroundColor = '#d0d0d0';
      pianoRoll.selectedVisualizer = 'wave';
    }
  });
  
  document.getElementById('toggleRipplesVisualizer').addEventListener('click', function(evt){
    // this one is tricky because of how the ripple visualizer is currently implemented.
    // we pass all the scheduled notes upfront to the web worker for the visualization on playback so
    // it's actually not in sync real-time with the audio (it's all pre-planned basically).
    // this makes it a bit more difficult to just turn on/off like with the wave visualizer.

    if(pianoRoll.selectedVisualizer === 'ripples'){
      // if currently playing, stop rendering the ripples
      document.getElementById('toggleRipplesVisualizer').style.backgroundColor = '';
      stopRipplesVisualizerRender(pianoRoll, true);
      pianoRoll.selectedVisualizer = null;
    }else{
      // turn off the other visualizer first if on
      if(pianoRoll.selectedVisualizer === 'wave'){
        document.getElementById('toggleVisualizer').style.backgroundColor = '';
        cancelAnimationFrame(pianoRoll.visualizerRequestAnimationFrameId);
        pianoRoll.visualizerRequestAnimationFrameId = null;
        pianoRoll.selectedVisualizer = null;
      
        if(pianoRoll.visualizerCanvas){
          removeVisualizer(pianoRoll);
        }
        
        // note that turning on this visualizer whilst audio playback is happeing won't do anything. 
        // it needs to be turned on first before the play button is pressed
        // so if playback is already happening, let the user know
        if(pianoRoll.isPlaying){
          alert('this visualizer will take effect on next playback!');
        }
      }
      
      if(pianoRoll.selectedVisualizer === null){
        // turn on rendering of ripples if going from an off state to on state for the ripples visualizer
        stopRipplesVisualizerRender(pianoRoll, false);
      }
      
      document.getElementById('toggleRipplesVisualizer').style.backgroundColor = '#d0d0d0';
      pianoRoll.selectedVisualizer = 'ripples';
    }
  });
    
  document.getElementById('record').addEventListener('click', function(){
    const confirmRecord = confirm('are you sure you want to record?');
    if(confirmRecord){
      if(this.style.border === ""){
        this.style.border = "solid 2px rgb(180, 0 ,0)";
      }
      context.resume().then(() => {
        recordPlay(pianoRoll);
      });
    }
  });
    
  document.getElementById('changeTempo').addEventListener('change', function(){
    changeTempo(pianoRoll, this);
  });
    
  // be able to change name of piece and composer 
  document.getElementById('titleLabel').addEventListener('dblclick', function(){
    const title = document.getElementById('pieceTitle');
    const userInput = prompt('new title name:');
        
    if(userInput === null){
      return;
    }
        
    title.textContent = userInput;
  });
    
  document.getElementById('composerLabel').addEventListener('dblclick', function(){
    const name = document.getElementById('composer');
    const userInput = prompt('new composer name:');
        
    if(userInput === null){
      return;
    }
        
    name.textContent = userInput;
  });
    
  document.getElementById('toggleStickyToolbar').addEventListener('click', function(evt){
    toggleStickyToolbar = !toggleStickyToolbar;
        
    document.getElementById('toggleStickyToolbar').style.backgroundColor = toggleStickyToolbar ? "#d0d0d0" : "";
        
    if(toggleStickyToolbar){
      document.getElementById('toolbar').style.position = 'sticky';
    }else{
      document.getElementById('toolbar').style.position = 'relative';
    }
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
    const timeSig = document.getElementById('timeSig').value;
    changeTimeSignature(pianoRollObject, timeSig);
    redrawCellBorders(pianoRollObject, 'columnHeaderRow');
        
    // update measure count 
    document.getElementById("measures").textContent = "measure count: " + pianoRollObject.numberOfMeasures;
  });
    
  // import instrument preset
  document.getElementById('importInstrumentPreset').addEventListener('click', function(){
    importInstrumentPreset(pianoRollObject); // from instrumentPreset.js
  });
    
  document.getElementById('toggleAutoScroll').addEventListener('click', function(){
    pianoRollObject.autoScroll = !pianoRollObject.autoScroll;
    document.getElementById('toggleAutoScroll').style.backgroundColor = pianoRollObject.autoScroll ? "#d0d0d0" : "";
  });
}


/****

gather JSON data 

first element in json data array will be an object with 
one key-value pair indicating how many measures there are.

http://stackoverflow.com/questions/728360/how-do-i-correctly-clone-a-javascript-object

****/
function getJSONData(pianoRoll){
  const data = {};
    
  // add metadata first 
  data["measures"] = pianoRoll.numberOfMeasures;
  data["tempo"] = parseInt( document.getElementById("changeTempo").value );
    
  // put in composer info, name of piece 
  data["composer"] = document.getElementById("composer").textContent;
    
  // don't allow spaces in the title b/c otherwise we won't be able to delete from db
  data["title"] = document.getElementById("pieceTitle").textContent.trim();
    
  // get time signature (and set subdivision as well) 
  const timesig = document.getElementById("timeSig");
  data["timeSignature"] = timesig.options[timesig.selectedIndex].value;
  data["subdivision"] = (data["timeSignature"] === "4/4") ? 8 : 6;

  // now collect instruments
  // each instrument's data will be in an array mapped to the "instruments" key 
  data["instruments"] = [];
  for(let i = 0; i < pianoRoll.instruments.length; i++){
    const instrumentData = {};
    const currInstrument = pianoRoll.instruments[i];
    instrumentData["name"] = currInstrument["name"];
    instrumentData["volume"] = currInstrument["volume"];
    instrumentData["pan"] = currInstrument["pan"];
    instrumentData["waveType"] = currInstrument["waveType"];
    instrumentData["onionSkinOn"] = currInstrument["onionSkinOn"];
    instrumentData["noteColorStart"] = currInstrument["noteColorStart"];
    instrumentData["noteColorEnd"] = currInstrument["noteColorEnd"];
    instrumentData["notes"] = {};
    for(const note in currInstrument.activeNotes){
      const noteElement = currInstrument.activeNotes[note];
      const noteContainer = noteElement.parentNode;
            
      // sorry this is a bit complicated but I like the current grid setup, which unfortunately
      // causes some weird 8px offset (probably because css is still pretty mysterious to me).
      // to make sure the left position for each note is still consistent with the old ui,
      // we're making an adjustment to the left position value
      const noteData = {
        "width": noteElement.style.width,
        "left": (parseInt(noteElement.style.left) + 8) + "px",
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
  const nameOfFile = prompt("please enter name: ");
  if(nameOfFile === null){
    return;
  }

  let jsonData;

  pianoRoll.currentInstrument.notes = readInNotes(pianoRoll.currentInstrument, pianoRoll);
    
  const data = getJSONData(pianoRoll);

  jsonData = JSON.stringify(data, null, 4);
    
  const blob = new Blob([jsonData], {type: "application/json"});
  const url = URL.createObjectURL(blob);
    
  const link = document.createElement('a');
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
  const timesig = data.timeSignature || "4/4";
  document.getElementById('timeSig').value = timesig;
    
  pianoRoll.subdivision = data.subdivision || 8;
    
  // reset play marker if any
  if(pianoRoll.playMarker){
    const prevMarker = document.getElementById(pianoRoll.playMarker);
    if(prevMarker){
      prevMarker.style.backgroundColor = "#fff";
    }
    pianoRoll.playMarker = null;
  }
    
  // reset measure boundaries if time sig is not 4/4 
  redrawCellBorders(pianoRoll, 'columnHeaderRow');
    
  // set new tempo acording to json data
  document.getElementById("changeTempo").value = data.tempo;
  pianoRoll.currentTempo = ((1/(data.tempo / 60000))/2); // length of 8th note in ms. based on tempo
    
  // now put the data on the grid 
  const measures = data.measures;
    
  // adjust measures
  const measuresToAdd = measures - pianoRoll.numberOfMeasures;
  if(measures > pianoRoll.numberOfMeasures){
    // add more measures
    for(let m = 0; m < measuresToAdd; m++){
      document.getElementById('addMeasure').click();
    }
  }else if(measures < pianoRoll.numberOfMeasures){
    // delete extra measures
    while(measures < pianoRoll.numberOfMeasures){
      deleteMeasure(pianoRoll);
    }
  }
    
  // update num of measures 
  document.getElementById('measures').textContent = "measure count: " + pianoRoll.numberOfMeasures;

  // then assign instruments array the data 
  pianoRoll.instruments = []; // clear instruments array 
    
  // clear the current instrument table in the dom
  const instrumentsGrid = document.getElementById("instrumentTable");
  while(instrumentsGrid.firstChild){
    instrumentsGrid.removeChild(instrumentsGrid.firstChild);
  }
    
  for(let i = 0; i < data.instruments.length; i++){
    // put each instrument into the instrument grid 
    addNewInstrument(data.instruments[i].name, false, pianoRoll);
        
    const newInstrument = data.instruments[i];
        
    // TODO: this is not ideal if we need to add more instrument attributes
    if(newInstrument.pan === undefined){
      newInstrument.pan = 0.0;
    }else if(newInstrument.isMute === undefined){
      newInstrument.isMute = false;
    }
        
    // set up a fresh new gain node for each instrument 
    const newGain = initGain(pianoRoll.audioContext);
    newInstrument.gain = newGain;
    newGain.connect(context.destination);
        
    // add their notes to the grid
    newInstrument.activeNotes = {};
    for(const noteContainerId in newInstrument.notes){
      // newInstrument.notes is a mapping of noteContainer ids to 
      // the length and left pos of the actual note that will go in
      // the containers
      newInstrument.notes[noteContainerId].forEach((noteAttr) => {
        const newNote = createNewNoteElement(pianoRoll);
        newNote.style.width = noteAttr.width;
        newNote.style.left = (parseInt(noteAttr.left) - 8) + "px"; // TODO: find a way to not have to adjust because of magic 8px of padding
        newNote.style.opacity = (i === 0) ? 1.0 : (newInstrument.onionSkinOn ? 0.3 : 0.0);
        newNote.style.zIndex = (i === 0) ? 100 : 0;
        newNote.setAttribute("data-volume", noteAttr.volume);
        newNote.setAttribute("data-type", noteAttr.type);
        newInstrument.activeNotes[newNote.id] = newNote;
        document.getElementById(noteContainerId).appendChild(newNote);

        const colHeader = document.getElementById(noteContainerId.substring(noteContainerId.indexOf("col")));
        colHeader.setAttribute("data-num-notes", parseInt(colHeader.dataset.numNotes + 1));            
      });
    }
    newInstrument.notes = readInNotes(newInstrument, pianoRoll);
        
    if(newInstrument.noteColorStart === undefined){
      newInstrument.noteColorStart = "rgb(0,158,52)";
      newInstrument.noteColorEnd = "rgb(52,208,0)";
    }
        
    updateNoteColors(newInstrument);

    // add new instrument to array
    pianoRoll.instruments.push(newInstrument);
  }
    
  // make 1st instrument active
  const instrument1 = document.getElementById("instrumentTable").firstChild;
  instrument1.style.backgroundColor = "rgb(188,223,70)";
  instrument1.classList.add("context-menu-instrument");
    
  pianoRoll.currentInstrument = pianoRoll.instruments[0];
}

function fileHandler(){
  //initiate file choosing after button click
  const input = document.getElementById('importFile');
  input.addEventListener('change', getFile, false);
  input.click();
}

function getFile(e){
  const reader = new FileReader();
  const file = e.target.files[0];
    
  //when the image loads, put it on the canvas.
  reader.onload = (function(theFile){
    return function(e){
            
      const data = JSON.parse(e.target.result);
            
      // make sure project is valid
      if(!validateProject(data)){
        return;
      }
            
      // note that I'm relying on my pianoRoll variable
      clearGridAll(pianoRoll);
            
      processData(data);
    };
  })(file);

  //read the file as a URL
  reader.readAsText(file);
}

function importInstrumentPreset(pianoRoll){
  const audioCtx = pianoRoll.audioContext;
  const input = document.getElementById('importInstrumentPresetInput');
    
  function processInstrumentPreset(e){
    const reader = new FileReader();
    const file = e.target.files[0];
        
    if(file){
      reader.onload = (function(theFile){
        return function(e){ 
          const data = JSON.parse(e.target.result);
                    
          if(data['name'] === undefined){
            console.log("cannot load preset because it has no name!");
            return;
          }
                    
          const presetName = data['name'];
                
          // store the preset in the PianoRoll obj 
          pianoRoll.instrumentPresets[presetName] = data.data;
                    
          console.log(`imported: ${presetName}`);
        };
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
  const measures = typeof(project.measures) === "number";
  const tempo = typeof(project.tempo) === "number";
  const composer = typeof(project.composer) === "string";
  const title = typeof(project.title) === "string";
  const subdivision = typeof(project.subdivision) === "number"; // do we even need this?
  const instruments = Array.isArray(project.instruments);
    
  // make sure note information is in current format
  project.instruments.forEach((instrument) => {
        
    if(!(typeof(instrument.notes) === "object")){
      return false;
    }
        
    for(const note in instrument.notes){
      const isNoteArray = Array.isArray(instrument.notes[note]);
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
        })
        .catch((error) => {
          console.log("unable to import example presets");
          pElement.textContent = "";
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

  selectedDemo = "demos/" + selectedDemo.options[selectedDemo.selectedIndex].text + ".json"; 

  const httpRequest = new XMLHttpRequest();

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
    const data = JSON.parse(httpRequest.responseText);
    processData(data);
  };
    
  httpRequest.send();
}




/////////////////////// database-specific (mongodb) stuff
/****
    save current project to database
****/
function saveProjectToDB(){
  pianoRoll.currentInstrument.notes = readInNotes(pianoRoll.currentInstrument, pianoRoll);
    
  const jsonData = JSON.stringify(getJSONData(pianoRoll), null, 4);
    
  $.ajax({
    type: 'POST',
    url: '/score',
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
  let data;
  const selectedScore = selectedPrj.options[selectedPrj.selectedIndex].text;
  $.ajax({
    type: 'GET',
    url: '/score/?name=' + selectedScore,
    success: function(response){                
      console.log("got score");
            
      const userScores = response[0].local.scores;
      for(let i = 0; i < userScores.length; i++){
        if(userScores[i].title === selectedScore){
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

function saveProfileInfo(){
  //console.log("saving edits.");
    
  // collect the info from the textareas
  // TODO: probably should be using a form 
  const locInfo = document.getElementById('editLocation').value.trim();
  const aboutInfo = document.getElementById('editAbout').value.trim();
    
  // save the info in the textareas to the database, update the display, and remove textareas
  // is there going to be a problem if the ampersand appears in the textarea????? :/
  $.ajax({
    type: 'PUT',
    url: '/profile/?' + 'location=' + locInfo + '&' + 'about=' + aboutInfo,
    success: function(response){				
      console.log("saved info.");
            
      // display the changes on the client side immediately!
      const updatedLocInfo = document.getElementById('locationText');
      updatedLocInfo.textContent = "location: " + locInfo;
            
      const updatedAbout = document.getElementById('aboutText');
      updatedAbout.textContent = aboutInfo;
    }
  });
    
  // use cancelEdit to remove the editing stuff 
  cancelEdit();
}

function cancelEdit(){
  /* simply remove the text areas */
  const locationTextbox = document.getElementById("editLocation");
  locationTextbox.parentNode.removeChild(locationTextbox);
    
  const aboutTextbox = document.getElementById("editAbout");
  aboutTextbox.parentNode.removeChild(aboutTextbox);
    
  // remove the buttons also!
  const sbutton = document.getElementById("saveButton");
  const cbutton = document.getElementById("cancelButton");
  sbutton.parentNode.removeChild(sbutton);
  cbutton.parentNode.removeChild(cbutton);
}

function editProfile(){
  // check if already editing. 
  // there are many choices to check if editing is on currently, but I will choose the presence of the save button.
  if(document.getElementById('saveButton') !== null){
    return;
  }

  // edit sections (location, about)
  // show textareas corresponding to the fields
  // what about if user clicks edit, but then tries to navigate away from page? need some check for that?
  const loc = document.getElementById('locationField');
  const about = document.getElementById('aboutField');
    
  const locationTextarea = document.createElement("textarea");
  locationTextarea.id = "editLocation";
    
  const currLocation = document.getElementById('locationText').textContent;
  locationTextarea.value = currLocation.substring(currLocation.indexOf(":") + 1).trim();
  loc.appendChild(locationTextarea);
    
  const aboutTextarea = document.createElement("textarea");
  const currAbout = document.getElementById('aboutText').textContent.trim();
  aboutTextarea.id = "editAbout";
  aboutTextarea.value = currAbout;
  about.appendChild(aboutTextarea);
    
  // add a 'save changes' button and 'cancel' button 
  const saveButton = document.createElement("button");
  saveButton.innerHTML = "save changes";
  saveButton.id = "saveButton";
    
  const cancelButton = document.createElement("button");
  cancelButton.innerHTML = "cancel";
    
  const buttonLocation = document.getElementById('userFacts');
    
  // attach each button with their corresponding function 
  saveButton.addEventListener("click", saveProfileInfo);
  cancelButton.addEventListener("click", cancelEdit);
  cancelButton.id = "cancelButton";
    
  buttonLocation.appendChild(saveButton);
  buttonLocation.appendChild(cancelButton);
}

// delete a score 
function deleteScore(scoreName){
  $.ajax({
    type: 'DELETE',
    url: '/score?name=' + scoreName,
    success: function(response){
      if(response === "success"){
        console.log("removed score: " + scoreName);
                
        // remove from DOM 
        const element = document.getElementById(scoreName);
        element.parentNode.removeChild(element);
      }
    }
  });
}