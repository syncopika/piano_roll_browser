# piano_roll_browser    
a music sequencer inspired by LMMS, one of the best software applications ever!   
also carries a bit of influence from PxTone Collage, another great piece of software!    
    
This project is currently still a very early prototype. more to come! (^_^\)    

### instructions:
left-click a block in the grid to place a note; click again to remove.   
right-click blocks on the grid to create 16th notes, or rejoin 16th notes to revert back to 8th notes.    
right-click an instrument to modify its sound and name.    
check out a demo! see the demo dropdown box.    

### known problems:
notes getting torn past 150 (need to check what's happening to duration calculations).    
pressing stop once does not stop all instruments. why is this?

### current next steps:
still need to delete measures, instruments.    
still need to be able to join notes.    
need to make volume adjustable for each instrument.   
be able to edit composer and title of piece
    
### features I would like to implement:    
- ability to change color of highlight and color of note blocks, i.e. different for each new instrument    
- be able to make custom sounds!    
- allow staccato, legato, and maybe note glides and bends? for individual notes maybe?    
- be able to record playback
    
other notes:    
if staccato and legato notes can be implemented, the amount of time a note is heard will be different but the amount of time total for that note (i.e. a staccato note might be 100ms of sound + 300ms of silence -> for 400ms total time per note, while legato might be 400ms of sound with no silence). I think the gliding from one note to another is caused by using a certain oscillator method - check the comments in the source.    

### implementation / design:    

There aren't too many purely HTML piano rolls out there, but from the ones I've seen, it appears that utilizing the canvas element
is very effective.    
    
My implementation does not use the canvas element and instead relies on just DOM manipulation of a grid to manipulate notes. 
The objective of my piano roll, at least conceptually, is fairly straightforward. The goal is to arrange a number of notes with
varying lengths and pitches with the help of a grid, put these notes in an array, and then feed them to an OscillatorNode so that a musical phrase can be played back.    

To achieve this, I made a function that dynamically creates the grid. Each column represents one eighth note, and each block in the grid (except for the first block of each column - these are the headers with a special element attribute, "hasnote", which indicates whether or not a column has a selected note or not, indicating a rest) represents a single note. Each note's element id tells which column the note is in, whether it may be a 16th note (if a "-1" or "-2" is in the id), and has other attributes such as length and volume. These attributes are present, but currently not yet implemented. By adding new attributes to elements in the DOM, making changes to the DOM and getting the information I need for setting up the notes becomes easier.    
    
Additionally, I also created some classes that I feel help streamline my process. First is the Instrument object, which stores some information about an instrument (name, wave type), and most importantly its notes, which is just an array. Next is the Notes object, which holds an ElementNode object, the duration of the note, in milliseconds, and the frequency of the note. The ElementNode object holds the DOM element data of a particular note, such as the id, and custom attributes like length (eighth or sixteenth) and volume. This is necessary because I want to be able to draw back notes of an instrument when switching instruments, or loading a project.    

Another very important feature is the use of custom contextmenus (thanks to <a href="http://swisnl.github.io/jQuery-contextMenu/index.html"> this great jQuery contextmenu plugin </a> ). When right-clicking either the note blocks on the grid or an instrument in the instruments grid, a contextmenu will allow the editing of an instrument's name, wave/sound type, as well as allow the subdivision of a column to make 16th notes or rejoining of two columns. It's not as nice as being allowed to drag a note to an arbitrary length, like in LMMS, but it works out fine. Maybe eventually I'll see if I can get it possible to drag a note to a certain length. 




### demos:    
Intrada - Johann Pezel (1639 - 1694)    


    

