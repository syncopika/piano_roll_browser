function createContextMenuElement(){
  const menu = document.createElement('ul');
  menu.style.position = "absolute";
  menu.style.margin = "0.3em";
  menu.style.padding = "0.25em 0.1em";
  menu.style.backgroundColor = "#fff";
  menu.style.border = "1px solid #bebebe";
  menu.style.borderRadius = "0.2em";
  menu.style.boxShadow = "0 2px 5px rgba(0,0,0.5)";
  menu.style.zIndex = 210;
    
  menu.addEventListener('contextmenu', (evt) => {
    evt.preventDefault();
    evt.stopPropagation();
  });
    
  return menu;
}

function createContextMenuLayer(){
  const layer = document.createElement('div');
  layer.style.position = "fixed";
  layer.style.width = "100%";
  layer.style.height = "100%";
  layer.style.zIndex = 209;
  layer.style.top = "0px";
  layer.style.left = "0px";
  layer.style.opacity = "0";
  layer.id = "context-menu-layer";
    
  layer.addEventListener('pointerdown', (evt) => {
    if(evt.target.classList.contains("context-menu-element") ||
           evt.target.classList.contains("context-menu-note")){
      return;
    }
        
    // close context menu if opened
    const instCtxMenu = document.getElementById('instrument-context-menu');
    if(instCtxMenu && instCtxMenu.style.display !== "none"){
      instCtxMenu.parentNode.removeChild(instCtxMenu);
      layer.parentNode.removeChild(layer);
    }
        
    const noteCtxMenu = document.getElementById('note-context-menu');
    if(noteCtxMenu && noteCtxMenu.style.display !== "none"){
      noteCtxMenu.parentNode.removeChild(noteCtxMenu);
      layer.parentNode.removeChild(layer);
    }
  });
    
  return layer;
}

// contextMenuElement: an HTML element that will be the parent of childElements
// childElements: an object where each key/value pair represents a list element to go in contextMenuElement
function populateContextMenu(contextMenuElement, childElements, pianoRollObject){
  // clear all children of contextMenuElement
  while(contextMenuElement.firstChild){
    contextMenuElement.removeChild(contextMenuElement.lastChild);
  }
    
  for(const label in childElements){
    const newEl = document.createElement('li');
    newEl.style.listStyleType = "none";
    newEl.style.padding = "0.6em 0.4em";
    newEl.style.borderBottom = "1px solid #e6e6e6";
    newEl.className = "context-menu-element";
        
    const newLabel = document.createElement('label');
    newLabel.style.display = "block";
    //newLabel.style.width = "80%";
    newLabel.className = "context-menu-element";
        
    const newSpan = document.createElement('span');
    newSpan.textContent = label;
    newSpan.className = "context-menu-element";
        
    newEl.appendChild(newLabel);
    newLabel.appendChild(newSpan);
        
    const type = childElements[label].type;
    const element = childElements[label];
    let inputElement = [];
    if(type === "text"){
      const textInput = document.createElement('input');
      textInput.className = "context-menu-element";
      textInput.type = "text";
      textInput.style.display = "block";
      textInput.style.width = "80%";
            
      newLabel.appendChild(textInput);
            
      inputElement = [textInput];
    }else if(type === "select"){
      const selectBox = document.createElement('select');
      selectBox.className = "context-menu-element";
      selectBox.style.display = "block";
      //selectBox.style.width = "80%";
            
      const options = element.options;
      for(const opt in options){
        const newOpt = document.createElement('option');
        newOpt.className = "context-menu-element";
        newOpt.textContent = options[opt];
        newOpt.value = opt;
        newOpt.style.display = "block";
                
        if(options[opt] === element.value){
          newOpt.selected = "selected";
        }
                
        selectBox.appendChild(newOpt);
      }
      newLabel.appendChild(selectBox);
      inputElement = [selectBox];
    }else if(type === "checkbox"){
      const checkBox = document.createElement('input');
      checkBox.type = "checkbox";
      checkBox.className = "context-menu-element";
      checkBox.checked = element.checked;
      newLabel.appendChild(checkBox);
      inputElement = [checkBox];
    }else if(type === "input-range"){
      const slider = document.createElement('input');
      slider.className = "context-menu-element";
      slider.type = "range";
      slider.style.width = "65%";
      slider.min = element.min;
      slider.max = element.max;
      slider.step = element.step;
      slider.value = element.value;
      slider.addEventListener('change', function(evt){
        this.nextElementSibling.value = this.value;
      });
            
      const sliderVal = document.createElement('input');
      sliderVal.className = "context-menu-element";
      sliderVal.type = "number";
      sliderVal.min = slider.min;
      sliderVal.max = slider.max;
      sliderVal.value = slider.value;
      sliderVal.style.width = "20%";
      sliderVal.addEventListener('change', function(evt){
        const val = parseFloat(this.value);
        if(val > slider.max) this.value = slider.max;
        if(val < slider.min) this.value = slider.min;
        slider.value = this.value;
      });
            
      newLabel.appendChild(document.createElement('br'));
      newLabel.appendChild(slider);
      newLabel.appendChild(sliderVal);
            
      inputElement = [slider, sliderVal];
    }else if(type === "select-color"){
      const changeColorInput = document.createElement('input');
      changeColorInput.className = "context-menu-element";
      changeColorInput.type = "text";
      changeColorInput.style.display = "block";
      //changeColorInput.style.width = "100%";
      changeColorInput.style.border = `2px solid ${pianoRollObject.currentInstrument.noteColorStart}`;
      changeColorInput.value = element.value;
            
      newLabel.appendChild(changeColorInput);
            
      const colorPicker = createColorPicker(changeColorInput, pianoRollObject);
      newLabel.appendChild(colorPicker);
            
      inputElement = [changeColorInput];
    }else if(type === "icon"){
      newLabel.classList.add("context-menu-icon");
            
      if(element.icon === "delete"){
        newEl.style.color = "#f00";
        newEl.style.fontWeight = "bold";
        newEl.classList.add("context-menu-delete");
      }
            
      inputElement = [newEl];
    }
        
    if(inputElement && element.events){
      for(const eventName in element.events){
        for(const input of inputElement){
          input.addEventListener(eventName, element.events[eventName]);
        }
      }
    }
        
    contextMenuElement.appendChild(newEl);
  }
}

// affects dom elements with the class 'instrument-context-menu'
function setupInstrumentContextMenu(pianoRollObject, evt){
  const instrumentMenuElements = {
    "Name - press enter to change name": {
      type: "text",
      value: "",
      events: {
        keyup: function(e){ 
          if(e.code === "Enter"){
            const instCtxMenu = document.getElementById('instrument-context-menu');
            const instrumentId = parseInt(instCtxMenu.getAttribute('instrument-num'));
                        
            // update the corresponding instrument object's name field
            pianoRollObject.instruments[instrumentId - 1].name = this.value;
            document.getElementById(instrumentId).textContent = e.target.value;
          }
        }
      }
    },
    "Select sound": {
      type: "select",
      options: {1: 'square', 2: 'sine', 3: 'sawtooth', 4: 'triangle', 5: 'percussion'},
      value: pianoRollObject.currentInstrument.waveType,
      events: {
        change: function(e){
          pianoRollObject.currentInstrument.waveType = (this.options[e.target.options[e.target.selectedIndex].value - 1].textContent);
        }
      }
    },
    "Change volume": {
      type: "input-range",
      min: 0.01,
      max: 0.50,
      step: 0.01,
      value: pianoRollObject.currentInstrument.volume,
      events: {
        change: function(e){
          // update current instrument's volume
          pianoRollObject.currentInstrument.volume = e.target.value;
        }
      }
    },
    "Change panning": {
      type: "input-range",
      min: -1,
      max: 1,
      step: 0.05,
      value: pianoRollObject.currentInstrument.pan,
      events: {
        change: function(e){
          // update current instrument's panning value
          pianoRollObject.currentInstrument.pan = e.target.value;
        }
      }
    },
    "Change note color": {
      type: "select-color",
      value: pianoRollObject.currentInstrument.noteColorStart,
      events: {
        click: function(e){
          e.target.blur();
        }
      }
    },
    "Toggle onion-skin": {
      type: "checkbox",
      checked: pianoRollObject.currentInstrument.onionSkinOn,
      events: {
        click: function(e){
          pianoRollObject.currentInstrument.onionSkinOn = !pianoRollObject.currentInstrument.onionSkinOn;
        }
      }
    },
    "Toggle mute": {
      type: "checkbox",
      checked: pianoRollObject.currentInstrument.isMute,
      events: {
        click: function(e){
          pianoRollObject.currentInstrument.isMute = !pianoRollObject.currentInstrument.isMute;
        }
      }
    },
    "Delete": {
      type: "icon",
      icon: "delete",
      events: {
        click: function(){
          const instCtxMenu = document.getElementById('instrument-context-menu');
          const instrumentNum = parseInt(instCtxMenu.getAttribute('instrument-num'));
          const instrumentTableElement = document.getElementById(instrumentNum);
                    
          // for now, let's only allow deletion for instruments other than the first instrument
          if(instrumentNum > 1){
            const instrument = pianoRollObject.instruments[instrumentNum - 1];
                    
            // remove all of this instrument's notes
            for(const noteId in instrument.activeNotes){
              const noteElement = instrument.activeNotes[noteId];
              noteElement.parentNode.removeChild(noteElement);
            }
                        
            // remove context menu if open
            const ctxMenu = document.getElementById('instrument-context-menu');
            if(ctxMenu){
              ctxMenu.parentNode.removeChild(ctxMenu);
                        
              // remove context menu layer as well if menu is open
              const ctxMenuLayer = document.getElementById('context-menu-layer');
              if(ctxMenuLayer){
                ctxMenuLayer.parentNode.removeChild(ctxMenuLayer);
              }
            }
                        
            // remove it from pianoRollObject
            pianoRollObject.instruments.splice(instrumentNum-1, 1);
                        
            // then remove it from the instrument table
            instrumentTableElement.parentNode.removeChild(instrumentTableElement);
                        
            // set current instrument to the first instrument
            pianoRollObject.currentInstrument = pianoRollObject.instruments[0];
                        
            // update the ids of each instrument so they are in sequential order again
            let count = 1;
            document.querySelectorAll('.instrument').forEach((element) => {
              element.id = count++;
            });
                        
            // click the first instrument to show its notes
            document.getElementById('1').click();
          }
        }
      }
    },
  };
    
  // don't allow delete for first instrument
  if(evt.target.id === "1"){
    delete instrumentMenuElements["Delete"];
  }
    
  // add some other instruments
  const instrumentOptions = Object.assign({}, pianoRollObject.defaultInstrumentSounds);
  let num = Object.keys(instrumentOptions).length + 1;
  for(const customPreset in pianoRollObject.instrumentPresets){
    instrumentOptions[num++] = customPreset;
  }
  instrumentMenuElements["Select sound"].options = instrumentOptions;
    
  const instrumentContextMenu = createContextMenuElement();
  instrumentContextMenu.id = "instrument-context-menu";
  populateContextMenu(instrumentContextMenu, instrumentMenuElements, pianoRollObject);
    
  instrumentContextMenu.setAttribute("instrument-num", evt.target.id);
  instrumentContextMenu.style.display = "block";
  instrumentContextMenu.style.top = (evt.target.getBoundingClientRect().top + window.pageYOffset) + "px";
  instrumentContextMenu.style.left = evt.target.getBoundingClientRect().left + "px";
    
  const contextMenuLayer = createContextMenuLayer();
  document.body.appendChild(contextMenuLayer);
  document.body.appendChild(instrumentContextMenu);
}

// affects dom elements with the class 'note-context-menu'
function setupNoteContextMenu(pianoRollObject, evt){
  const noteMenuElements = {
    "Change volume": {
      type: "input-range",
      min: 0.01,
      max: 0.50,
      step: 0.01,
      value: parseFloat(evt.target.getAttribute("data-volume")),
      events: {
        change: function(e){
          const selectedNote = evt.target;
          // update volume attribute in selected dom element 
          selectedNote.setAttribute("data-volume", e.target.value);
        }
      }
    },
    "Change style": {
      type: 'select',
      options: pianoRollObject.defaultNoteStyles,
      value: evt.target.getAttribute("data-type"),
      events: {
        change: function(e){
          const selectedNote = evt.target;
          // update the type attribute in selected dom element 
          selectedNote.setAttribute("data-type", this.options[e.target.options[e.target.selectedIndex].value - 1].textContent);
        }
      }
    },
    "Delete": {
      type: "icon",
      icon: "delete",
      events: {
        click: function(e){
          const note = evt.target;
          const parent = note.parentNode;

          const colHeader = document.getElementById(parent.id.substring(parent.id.indexOf("col")));
          colHeader.setAttribute("data-num-notes", parseInt(colHeader.dataset.numNotes - 1));

          parent.removeChild(note);
          delete pianoRollObject.currentInstrument.activeNotes[note.id];
                    
          // close context menu
          const menu = document.getElementById("note-context-menu");
          menu.parentNode.removeChild(menu);
                    
          // remove context menu layer
          const ctxMenuLayer = document.getElementById('context-menu-layer');
          if(ctxMenuLayer){
            ctxMenuLayer.parentNode.removeChild(ctxMenuLayer);
          }
        }
      }
    },
  };
    
  const noteContextMenu = createContextMenuElement();
  noteContextMenu.id = "note-context-menu";
  populateContextMenu(noteContextMenu, noteMenuElements, pianoRollObject);
    
  noteContextMenu.style.display = "block";
  noteContextMenu.style.top = (evt.target.getBoundingClientRect().top + window.pageYOffset) + "px";
  noteContextMenu.style.left = evt.target.getBoundingClientRect().left + "px";

  const contextMenuLayer = createContextMenuLayer();
  document.body.appendChild(contextMenuLayer);        
  document.body.appendChild(noteContextMenu);
}

function createColorPicker(colorInput, pianoRollObject){
  const colorWheel = document.createElement('canvas');
  colorWheel.id = "colorWheel";
  colorWheel.className = "context-menu-element";
  colorWheel.setAttribute('width', 150);
  colorWheel.setAttribute('height', 150);

  const colorWheelContext = colorWheel.getContext('2d');
  const x = colorWheel.width / 2;
  const y = colorWheel.height / 2;
  const radius = 60;

  // why 5600??
  for(let angle = 0; angle <= 5600; angle++) {
    const startAngle = (angle - 2) * Math.PI / 180; //convert angles to radians
    const endAngle = (angle) * Math.PI / 180;
    colorWheelContext.beginPath();
    colorWheelContext.moveTo(x, y);
    colorWheelContext.arc(x, y, radius, startAngle, endAngle, false);
    colorWheelContext.closePath();
    const gradient = colorWheelContext.createRadialGradient(x, y, 0, startAngle, endAngle, radius);
    gradient.addColorStop(0, 'hsla(' + angle + ', 10%, 100%, 1)');
    gradient.addColorStop(1, 'hsla(' + angle + ', 100%, 50%, 1)');
    colorWheelContext.fillStyle = gradient;
    colorWheelContext.fill();
  }

  // make black a pickable color 
  colorWheelContext.fillStyle = "rgba(0,0,0,1)";
  colorWheelContext.beginPath();
  colorWheelContext.arc(10, 10, 8, 0, 2*Math.PI);
  colorWheelContext.fill();

  colorWheel.addEventListener('mousedown', (evt) => {
    const x = evt.offsetX;
    const y = evt.offsetY;
    const colorPicked = colorWheel.getContext('2d', {willReadFrequently: true}).getImageData(x, y, 1, 1).data;
    const pickedColor = 'rgb(' + colorPicked[0] + ',' + colorPicked[1] + ',' + colorPicked[2] + ')';
        
    // assumes colorInput is an input of type 'text'
    colorInput.value = pickedColor;
    colorInput.style.border = `2px solid ${pickedColor}`;
        
    pianoRollObject.currentInstrument.noteColorStart = pickedColor;
        
    // TODO: figure out what the 2nd color needs to be for the gradient (noteColorEnd)
    // for now just leave it the default green
    updateNoteColors(pianoRollObject.currentInstrument);
  });
    
  return colorWheel;
}

/*
try{
    module.export = {};
}catch(e){
    // ignore 
}*/