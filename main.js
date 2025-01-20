// prevent flash of unstylized content 
document.addEventListener("DOMContentLoaded", () => {
  //console.log("im ready");
  document.body.style.display = "block";
  document.getElementById("pianoNotes").style.display = "block";
    
  // guard against inadvertently closing the page
  window.addEventListener('beforeunload', function(evt){
    // this should trigger the generic popup asking to confirm if you want to leave
    evt.returnValue = "are you sure you want to leave?"; // this text doesn't actually appear
    return "are you sure you want to leave?";
  });
});

// flag for toggling the toolbar to be static or sticky
let toggleStickyToolbar = false;

// set up piano roll
const pianoRoll = new PianoRoll();
pianoRoll.init();

bindButtons(pianoRoll); // from utils.js

document.getElementById('measures').textContent = "measure count: " + pianoRoll.numberOfMeasures;

// set up initial instrument
const context = pianoRoll.audioContext;
const gain = initGain(context);
gain.connect(context.destination);

const initialInstrument = new Instrument("Instrument 1", gain, []);
pianoRoll.instruments.push(initialInstrument);
pianoRoll.currentInstrument = pianoRoll.instruments[0];

// create piano roll grid
buildGridHeader('columnHeaderRow', pianoRoll);
buildGrid('grid', pianoRoll);

// load in presets and piano notes (TODO: maybe lazy load only when selected as instrument sound?)
loadExamplePresets(document.getElementById('loadingMsg')).then(_ => {
  pianoRoll.PianoManager.loadPianoNotes(document.getElementById('loadingMsg'));
});

document.getElementById("piano").addEventListener("scroll", (evt) => {
  document.getElementById("pianoNotes").style.left = evt.target.scrollLeft + "px";
    
  if(!toggleStickyToolbar){
    document.getElementById("toolbar").style.top = "0px";
  }
});

document.addEventListener('contextmenu', (evt) => {
  // close context menu if opened
  const instCtxMenu = document.getElementById('instrument-context-menu');
  if(instCtxMenu && instCtxMenu.style.display !== "none"){
    instCtxMenu.parentNode.removeChild(instCtxMenu);
  }
    
  const noteCtxMenu = document.getElementById('note-context-menu');
  if(noteCtxMenu && noteCtxMenu.style.display !== "none"){
    noteCtxMenu.parentNode.removeChild(noteCtxMenu);
  }
    
  if(evt.target.classList.contains('context-menu-instrument')){
    evt.preventDefault();
    setupInstrumentContextMenu(pianoRoll, evt);
  }
    
  if(evt.target.classList.contains('context-menu-note')){
    evt.preventDefault();
    setupNoteContextMenu(pianoRoll, evt);
  }
});

