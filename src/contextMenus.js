/******* 
	
	CONTEXT MENU FOR INSTRUMENTS 
	@param pianoRollObject = a PianoRoll object 
	relies on dom elements with the class 'context-menu-instrument'
	
*******/

function makeInstrumentContextMenu(pianoRollObject){
    $(function(){
		$.contextMenu({
			selector: '.context-menu-instrument', 
			build: function($trigger, e){
				var instrumentOptions = {
					1: "square",
					2: "sine",
					3: "sawtooth",
					4: "triangle",
					5: "percussion"
				};
				
				var num = 6;
				for(var customPreset in pianoRollObject.instrumentPresets){
					instrumentOptions[num] = customPreset;
					num++;
				}
				
				return {
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
								options: {1: "default", 2: "legato", 3: "staccato", 4: "glide"},
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




try{
	module.export = { 
		makeInstrumentContextMenu: makeInstrumentContextMenu, 
		makeNoteContextMenu: makeNoteContextMenu
	};
}catch(e){
	// ignore 
}