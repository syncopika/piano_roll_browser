// prevent flash of unstylized content 
$(document).ready(function(){
    $("body").css("display", "block");
    $("#pianoNotes").css("display", "block");
    
    // guard against inadvertently closing the page
    $(window).on('beforeunload', function(evt){
        // this should trigger the generic popup asking to confirm if you want to leave
        evt.returnValue = "are you sure you want to leave?"; // this text doesn't actually appear
        return "are you sure you want to leave?";
    });
});

// flag for toggling the toolbar to be static or sticky
var toggleStickyToolbar = false;

// set up piano roll
var pianoRoll = new PianoRoll();
pianoRoll.init();

makeInstrumentContextMenu(pianoRoll);
makeNoteContextMenu(pianoRoll);
bindButtons(pianoRoll); // from utils.js

document.getElementById('measures').textContent = "measure count: " + pianoRoll.numberOfMeasures;

// set up initial instrument
var context = pianoRoll.audioContext;
var gain = initGain(context);
gain.connect(context.destination);

var initialInstrument = new Instrument("Instrument 1", gain, []);
pianoRoll.instruments.push(initialInstrument);
pianoRoll.currentInstrument = pianoRoll.instruments[0];

// create piano roll grid
buildGridHeader('columnHeaderRow', pianoRoll);
buildGrid('grid', pianoRoll);

// load in presets and piano notes (TODO: maybe lazy load only when selected as instrument sound?)
loadExamplePresets(document.getElementById('loadingMsg')).then(_ => {
    pianoRoll.PianoManager.loadPianoNotes(document.getElementById('loadingMsg'));
});

// allow components like the toolbar to move with the user when scrolling right after more measures are added 
$("#piano").scroll(function(){
    // change position of the piano notes bar on the left to move 
    // with horizontal scroll
    $('#pianoNotes').css('left', $("#piano").scrollLeft());
    
    $('#toolbar').css('left', $(window).scrollLeft());
    
    if(!toggleStickyToolbar){
        $('#toolbar').css('top', 0);
    }
    
    $('.footer').css('left', $(window).scrollLeft());
});
