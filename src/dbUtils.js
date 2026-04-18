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