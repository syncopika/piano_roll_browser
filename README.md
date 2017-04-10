# piano_roll_browser    
a music sequencer inspired by LMMS, one of the best software applications ever!     
    
This project is currently still a very early prototype. more to come! (^_^\)    
    
features I would like to implement:    
- ability to add more voices/instruments + 'onion skin' to see the other instruments' notes like in PxTone Collage    
- ability to change color of highlight and color of note blocks    
- be able to make custom sounds!    
- allow staccato, legato, and maybe note glides and bends? for individual notes maybe?    
    
other notes:    
absolutely need 16th notes and tempo change option. also, no magic numbers! all the milliseconds for setTimeout for each note should be calculated based on tempo and, if possible, note type. if staccato and legato notes can be implemented, the amount of time a note is heard will be different but the amount of time total for that note (i.e. a staccato note might be 100ms of sound + 300ms of silence -> for 400ms total time per note, while legato might be 400ms of sound with no silence). I think the gliding from one note to another is caused by using a certain oscillator method - check the comments in the source.
    
Additionally, I want to think about how I can modularize what I have so that my functions are not so specific to my implmentation (i.e. a lot of my functions currently rely on specific element id's. it would be nice I think to use these functions by instead passing in an id so that they can be used more flexibly and possibly in other projects. )

