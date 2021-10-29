/******* 
    
    CONTEXT MENU FOR INSTRUMENTS 
    @param pianoRollObject: an instance of PianoRoll
    relies on dom elements with the class 'context-menu-instrument'
    
*******/
function makeInstrumentContextMenu(pianoRollObject){
    $(function(){
        $.contextMenu({
            selector: '.context-menu-instrument', 
            zIndex: 102,
            build: function($trigger, e){
                var instrumentOptions = Object.assign({}, pianoRollObject.defaultInstrumentSounds);
                var num = Object.keys(instrumentOptions).length + 1;
                
                for(var customPreset in pianoRollObject.instrumentPresets){
                    instrumentOptions[num++] = customPreset;
                }
                
                return {
                    callback: function(key, options) {
                    },
                    items: {
                        name: {
                            name: "Name - press enter to change name", 
                            type: "text",
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
                            type: "select",
                            options: instrumentOptions, //{1: 'square', 2: 'sine', 3: 'sawtooth', 4: 'triangle', 5: 'percussion'},
                            selected: function() {
                                for(var itemNum in instrumentOptions){
                                    if(pianoRollObject.currentInstrument.waveType === instrumentOptions[itemNum]){
                                        return itemNum;
                                    }
                                }                                    
                            },
                            events: {
                                change: function(e){
                                    //var instrumentId = parseInt( e.data.$trigger.attr("id") ) - 1; 
                                    pianoRollObject.currentInstrument.waveType = (this.options[e.target.options[e.target.selectedIndex].value - 1].textContent);
                                }
                            }
                        },
                        sep2: "-------------",
                        "Change volume": {
                            name: "change volume",
                            type: "select",
                            options: {1: .01, 2: .05, 3: 0.10, 4: 0.15, 5: 0.20, 6: 0.25, 7: 0.30, 8: 0.35, 9: 0.40, 10: 0.45, 11: 0.50},
                            selected: function(){
                                for(key in this.options){    
                                    if(parseFloat(this.options[key].textContent) === pianoRollObject.currentInstrument.volume){
                                        return parseInt(key) + 1; // the keys' index is offset by 1 somehow? ...
                                    }
                                }
                            },
                            events: {
                                change: function(e){
                                    // update current instrument's volume 
                                    pianoRollObject.currentInstrument.volume = parseFloat( this.options[e.target.options[e.target.selectedIndex].value - 1].textContent );
                                }
                            }
                        },
                        sep3: "-------------",
                        "Change panning": {
                            name: "change panning",
                            type: "select",
                            options: {1: -1, 2: -.75, 3: -.5, 4: -.25, 5: 0.0, 6: 0.25, 7: 0.5, 8: 0.75, 9: 1},
                            selected: function(){
                                for(key in this.options){    
                                    if(parseFloat(this.options[key].textContent) === pianoRollObject.currentInstrument.pan){
                                        return parseInt(key) + 1;
                                    }
                                }
                            },
                            events: {
                                change: function(e){
                                    // update current instrument's panning value
                                    pianoRollObject.currentInstrument.pan = parseFloat( this.options[e.target.options[e.target.selectedIndex].value - 1].textContent );
                                }
                            }
                        },
                        sep4: "-------------",
                        "Show onion-skin for this instrument": {
                            name: "Toggle onion-skin", 
                            type: "checkbox",
                            selected: pianoRollObject.currentInstrument.onionSkinOn,
                            events: {
                                click: function(e){
                                    pianoRollObject.currentInstrument.onionSkinOn = !pianoRollObject.currentInstrument.onionSkinOn;
                                }
                            }
                        },
                        sep5: "-------------",
                        "Mute instrument": {
                            name: "Toggle mute",
                            type: "checkbox",
                            selected: pianoRollObject.currentInstrument.isMute,
                            events: {
                                click: function(e){
                                    pianoRollObject.currentInstrument.isMute = !pianoRollObject.currentInstrument.isMute;
                                }
                            }
                        },
                        sep6: "-------------",
                        "Delete": {
                            name: "Delete", 
                            icon: "delete",
                            callback: function(key, options){
                                // what if current instrument is the one to be deleted?
                                var instrumentNum = options.$trigger.attr("id");
                                var instrumentTableElement = options.$trigger[0];
                                
                                // for now, let's only allow deletion for instruments other than the first instrument
                                if(instrumentNum > 1){
                                    var instrument = pianoRollObject.instruments[instrumentNum - 1];
                                
                                    // remove all of this instrument's notes
                                    for(var noteId in instrument.activeNotes){
                                        var noteElement = instrument.activeNotes[noteId];
                                        noteElement.parentNode.removeChild(noteElement);
                                    }
                                    
                                    // remove it from pianoRollObject
                                    pianoRollObject.instruments.splice(instrumentNum-1, 1);
                                    
                                    // then remove it from the instrument table
                                    instrumentTableElement.parentNode.removeChild(instrumentTableElement);
                                    
                                    // set current instrument to the first instrument
                                    pianoRollObject.currentInstrument = pianoRollObject.instruments[0];
                                    
                                    // update the ids of each instrument so they are in sequential order again
                                    var count = 1;
                                    document.querySelectorAll(".instrument").forEach((element) => {
                                        element.id = count++;
                                    });
                                    
                                    // click the first instrument to show its notes
                                    $('#1').click();
                                }
                                
                            }
                        }
                    }
                }
            }
        });
    });
}



/*****  
    
    CONTEXT MENU FOR GRID NOTES 
    @param pianoRollObject: an instance of PianoRoll
    
*****/
function makeNoteContextMenu(pianoRollObject){
    $(function(){
        $.contextMenu({
            selector: '.context-menu-one', 
            zIndex: 101,
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
                                    var note = e.data.$trigger[0];
                                    var currentVolume = note.getAttribute("volume");
                                    for(key in this.options){
                                        if(this.options[key].textContent === currentVolume){
                                            return (parseInt(key) + 1) + "";
                                        }
                                    }
                                },
                                events: {
                                    change: function(e){
                                        var selectedNote = e.data.$trigger[0];
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
                                options: pianoRollObject.defaultNoteStyles,
                                selected: function(){
                                    var currentStyle = e.data.$trigger[0].getAttribute("type");
                                    for(key in this.options){
                                        if(this.options[key].textContent === currentStyle){
                                            return (parseInt(key) + 1) + "";
                                        }
                                    }
                                },
                                events: {
                                    change: function(e){
                                        var selectedNote = e.data.$trigger[0];
                                        // update the type attribute in selected dom element 
                                        selectedNote.setAttribute("type", this.options[e.target.options[e.target.selectedIndex].value - 1].textContent );
                                    }
                                }
                            },
                            "sep2": "------------",
                            "Delete": {
                                name: "Delete", 
                                icon: "delete",
                                callback: function(key, options){
                                    var note = options.$trigger[0];
                                    var parent = note.parentNode;

                                    var colHeader = document.getElementById(parent.id.substring(parent.id.indexOf("col")));
                                    colHeader.setAttribute("numNotes", parseInt(colHeader.getAttribute("numNotes"))-1);
            
                                    parent.removeChild(note);
                                    delete pianoRollObject.currentInstrument.activeNotes[note.id];
                                }
                            }
                        }
                    }
                }
        });
    });
};




try{
    module.export = { 
        makeInstrumentContextMenu: makeInstrumentContextMenu, 
        makeNoteContextMenu: makeNoteContextMenu
    };
}catch(e){
    // ignore 
}