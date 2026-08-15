/****** 
    
    PIANO ROLL CLASS 
    this will hold all the data relevant to the piano roll, such as number of measures, subdivisions, time signature, etc.

*******/
function PianoRoll(){
  this.numberOfMeasures = 4;        // 4 measures by default
  this.subdivision = 8;             // number of eighth notes per measure (8 for 4 quarter notes per measure, 6 for 3/4)
  this.currentTempo = 250;          // hold the current tempo (this is time in milliseconds per 8th note). 250 ms seems about right for 120 bpm (and with the length of 8th notes as 40px)
  this.timeSignature = "4/4";       // options are 4/4 or 3/4
  this.instruments = [];            // list of instruments will be an array
  this.timers = [];                 // keep track of setTimeouts so all can be ended at once 
  this.currentInstrument;           // need to keep track of what current instrument is!
  this.audioContext;                // associate an AudioContext with this PianoRoll
  this.audioContextDestOriginal;    // the original audio context destination 
  this.audioContextDestMediaStream; // a media stream destination for the audio context (to be used when recording is desired)
  this.audioDataChunks = [];
  this.lastTime = 0;                // the time the last note was supposed to be played
  this.isPlaying = false;           // a boolean flag to easily quit playing
  this.loopFlag = false;            // if playback should be looped or not 
  this.recording = false;           // if recording. note that if looping, recording should not be possible.
  this.recorder;                    // a MediaRecorder instance
  this.playMarker;                  // the id of a column header indicating where to start playing
  this.lastNoteColumn;              // html element of the column header of the last note that was played
  this.autoScroll = false;          // if auto scroll when playing
    
  this.lockNoteSize = "16th";          // the note-size increment to be used when moving/placing notes
  this.addNoteSize = "last selected";  // note-size to use when adding notes (changes based on last selected/resize by default)
  this.lastNoteSize = 40;              // last clicked-on note size in px as integer 
  this.noteIdNum = 0;                  // use this to create a unique number for each added note's id
    
  this.instrumentPresets = {};         // a dictionary to keep track of imported instrument presets
  this.noiseBuffer;                    // for percussion
    
  // stuff needed for 2d visualizers
  this.selectedVizualizer = null;
  this.analyserNode = null; // for waveform visualization
  this.visualizerCanvas = null;
  this.visualizerOffscreenCanvas = null;
  this.visualizerWebWorker = null;
  this.visualizerRequestAnimationFrameId = null;
  
  // stuff for 3d visualizer
  this.visualizerCanvas3d = null; // the container div holding the 3d canvas element (e.g. renderer.domElement)
  this.visualizer3dRenderer = null;
  this.visualizer3dCamera = null;
  this.visualizer3dScene = null;
  this.visualizerRequestAnimationFrameId3d = null;
  
  // colors
  this.playMarkerColor = "rgb(50, 205, 50)";
  this.highlightColor = "#FFFF99"; // yellow
  this.measureNumberColor = "#2980B9"; // blue
  this.instrumentTableColor = 'rgb(188, 223, 70)';  // green
  this.currNotePlayingColor = 'rgb(112, 155, 224)'; // light blue
    
  // default instrument sounds and note styles
  this.defaultInstrumentSounds = {
    1: "square",
    2: "sine",
    3: "sawtooth",
    4: "triangle",
    5: "percussion",
    6: "piano"
  };

  /******
        default note styles
        TODO: can we reorganize this so that we can map
        a style to a function so that we don't we have do that in 
        the scheduler function?
        but we also need to note that default, legato and staccato
        affect duration, whereas glide affects oscillator freq.
        or maybe make this its own class?
    ******/
  this.defaultNoteStyles = {
    1: "default", 
    2: "legato",
    3: "staccato",
    4: "glide",
  };
    
  this.noteSizeMap = {
    "8th": 40,
    "16th": 20,
    "32nd": 10,
  };
    
  this.noteFrequencies = {
    "C8": 4186.01,
    "B7": 3951.07,
    "Bb7": 3729.31,
    "A#7": 3729.31,
    "A7": 3520.00,
    "Ab7": 3322.44,
    "G#7": 3322.44,
    "G7": 3135.96,
    "F#7": 2959.96,
    "F7": 2793.83,
    "E7": 2637.02,
    "Eb7": 2489.02,
    "D#7": 2489.02,
    "D7": 2349.32,
    "C#7": 2217.46,

    "C7": 2093.00,
    "B6": 1975.53,
    "Bb6": 1864.66,
    "A#6": 1864.66,
    "A6": 1760.00,
    "Ab6": 1661.22,
    "G#6": 1661.22,
    "G6": 1567.98,
    "F#6": 1479.98,
    "F6": 1396.91,
    "E6": 1318.51,
    "Eb6": 1244.51,
    "D#6": 1244.51,
    "D6": 1174.66,
    "C#6": 1108.73,
    "C6": 1046.50,

    "B5": 987.77,
    "Bb5": 932.33,
    "A#5": 932.33,
    "A5": 880.00,
    "Ab5": 830.61,
    "G#5": 830.61,
    "G5": 783.99,
    "F#5": 739.99,
    "F5": 698.46,
    "E5": 659.25,
    "Eb5": 622.25,
    "D#5": 622.25,
    "D5": 587.33,
    "C#5": 554.37,
    "C5": 523.25,

    "B4": 493.88,
    "Bb4": 466.16,
    "A#4": 466.16,
    "A4": 440.00,
    "Ab4": 415.30,
    "G#4": 415.30,
    "G4": 392.00,
    "F#4": 369.99,
    "F4": 349.23,
    "E4": 329.63,
    "Eb4": 311.13,
    "D#4": 311.13,
    "D4": 293.66,
    "C#4": 277.18,
    "C4": 261.63,
        
    "B3": 246.94,
    "Bb3": 233.08,
    "A#3": 233.08,
    "A3": 220.00,
    "Ab3": 207.63,
    "G#3": 207.63,
    "G3": 196.00,
    "F#3": 185.00,
    "F3": 174.61,
    "E3": 164.81,
    "Eb3": 155.56,
    "D#3": 155.56,
    "D3": 146.83,
    "C#3": 138.59,
    "C3": 130.81,
        
    "B2": 123.47,
    "Bb2": 116.54,
    "A#2": 116.54,
    "A2": 110.00,
    "Ab2": 103.83,
    "G#2": 103.83,
    "G2": 98.00,
    "F#2": 92.50,
    "F2": 87.31,
    "E2": 82.41,
    "Eb2": 77.78,
    "D#2": 77.78,
    "D2": 73.42,
    "C#2": 69.30,
    "C2": 65.41
  };
        
  this.init = function(){
    const context = new AudioContext();
    this.audioContext = context;
        
    // suspend the context (M70 update (Chrome))
    context.suspend();
        
    // save a reference to the original audio destination
    this.audioContextDestOriginal = context.destination;
        
    // make a recorder and set it up for recording
    const audioStream = context.createMediaStreamDestination();
    this.audioContextDestMediaStream = audioStream;
    this.recorder = new MediaRecorder(audioStream.stream, {mimeType: 'audio/webm; codecs=opus'}); // mime type here should be webm? is ogg ok?
        
    this.recorder.ondataavailable = (function(pianoRoll){
      return function(evt){
        pianoRoll.audioDataChunks.push(evt.data);
      };
    })(this);
        
    this.recorder.onstop = (function(pianoRoll){
      return async function(evt){
        const blob = new Blob(pianoRoll.audioDataChunks, {type: 'audio/webm; codecs=opus'}); // note the mime type here
        
        /*
        if(false){
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;

          // note this is specific to my page html
          link.download = document.getElementById('pieceTitle').textContent + "_pianorollfun";
          link.click();
        }*/
        
        // duration for output file will be set to infinity on Chrome (as of 8/15/26, this actually does not seem to be true anymore! https://issues.chromium.org/issues/40482588 - but this is interesting to try nonetheless)
        // so try decoding the audio via the audioContext to get the duration and downloading the
        // resulting audio buffer as a wav
        // https://stackoverflow.com/questions/78470608/problem-with-getting-audio-duration-from-blob-in-chrome-safari
        // TODO: currently this doesn't work - a perfectly fine .wav file does get created but the audio data is all 0s (so silence) :/
        const audioArrayBuf = await blob.arrayBuffer();
        
        const decodedAudioBuffer = await pianoRoll.audioContext.decodeAudioData(audioArrayBuf);
        
        console.log('exporting audio');
        console.log("raw samples check: " + decodedAudioBuffer.getChannelData(0).slice(0, 20));
        
        const wavData = convertAudioBufferToWav(decodedAudioBuffer);
        const wavBlob = new Blob([wavData], {type: 'audio/wav'});
        
        const url = URL.createObjectURL(wavBlob);
        const link = document.createElement('a');
        link.href = url;

        // note this is specific to my page html
        link.download = document.getElementById('pieceTitle').textContent + "_pianorollfun";
        link.click();
                
        // reset audio data array
        while(pianoRoll.audioDataChunks.length){
          pianoRoll.audioDataChunks.pop();
        }
      };
    })(this);
        
    const analyser = context.createAnalyser();
    analyser.connect(context.destination);
    analyser.fftSize = 2048;
    this.analyserNode = analyser;
        
    this.PercussionManager = new PercussionManager(this);        
    this.PianoManager = new PianoManager(this);
  };

}

// from: https://github.com/mattdiamond/Recorderjs/blob/master/src/recorder.js
function convertAudioBufferToWav(audioBuffer){
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;

  let interleavedAudioData = [];
  if(numChannels === 2){
    interleavedAudioData = interleave(audioBuffer.getChannelData(0), audioBuffer.getChannelData(1));
  }else{
    interleavedAudioData = interleave(audioBuffer.getChannelData(0));
  }

  const dataLength = interleavedAudioData.length;

  const tempBuffer = new ArrayBuffer(44 + dataLength * 2);
  const view = new DataView(tempBuffer); // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DataView

  console.log(`num channels: ${numChannels}, sample rate: ${sampleRate}, data length: ${dataLength}`);

  // the following steps sets up the metadata chunk for the wav file.
  /* RIFF identifier */
  writeString(view, 0, 'RIFF');
  /* RIFF chunk length */
  view.setUint32(4, 36 + dataLength * 2, true);
  /* RIFF type */
  writeString(view, 8, 'WAVE');
  /* format chunk identifier */
  writeString(view, 12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw) */
  view.setUint16(20, 1, true);
  /* channel count */
  view.setUint16(22, numChannels, true); 
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * 4, true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, numChannels * 2, true);
  /* bits per sample */
  view.setUint16(34, 16, true);
  /* data chunk identifier */
  writeString(view, 36, 'data');
  /* data chunk length */
  view.setUint32(40, dataLength * 2, true);

  floatTo16BitPCM(view, 44, interleavedAudioData);
  
  return view;
}

// from https://github.com/mattdiamond/Recorderjs/blob/master/src/recorder.js
function writeString(view, offset, string) {
  for(let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// from https://github.com/mattdiamond/Recorderjs/blob/master/src/recorder.js
function floatTo16BitPCM(output, offset, input) {
  for(let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
}

// from https://github.com/mattdiamond/Recorderjs/blob/master/src/recorder.js
function interleave(chan1, chan2){
  const length = chan1.length + chan2.length;
  const result = new Float32Array(length);
  
  let idx = 0;
  let inputIdx = 0;
  
  while(idx < inputIdx){
    result[idx++] = chan1[inputIdx];
    result[idx++] = chan2[inputIdx];
    inputIdx++;
  }
  
  return result;
}


/****** INSTRUMENT CLASS ********/
function Instrument(name, gain, notesArray){
  this.name = name;
  this.gain = gain;               // assign a gain node object
  this.notes = notesArray;        // array of arrays of Note objects (notes that occur at the same time get grouped in the same array)
  this.activeNotes = {};          // 
  this.waveType = "sine";         // sine wave by default 
  this.volume = 0.2;
  this.pan = 0.0;
  this.isMute = false;
  this.onionSkinOn = true;
    
  // note color is a gradient
  this.noteColorStart = "rgb(0,158,52)";
  this.noteColorEnd = "rgb(52,208,0)";
}

function updateNoteColors(instrument){
  for(const noteName in instrument.activeNotes){
    // should be something like: linear-gradient(90deg, rgb(0, 158, 52) 90%, rgb(52, 208, 0) 99%)
    instrument.activeNotes[noteName].style.background = `linear-gradient(90deg, ${instrument.noteColorStart} 90%, ${instrument.noteColorEnd} 99%)`;
  }
}

/*****  NOTE CLASS ******/
// this class will hold a note's frequency, duration, and div element
// duration is in milliseconds (i.e. 600, 300, 1000)
function Note(freq, duration, block){
  this.freq = freq;
  this.duration = duration;
  this.block = new ElementNode(block);
}

/****** CUSTOM DOM ELEMENT NODE CLASS *********/
// This class will take a DOM element node and just extract some important info from it,
// such as the id and custom attributes I've assigned, such as "length", "volume", etc.

// the id is very important in keeping track of which columns to subdivide or rejoin when
// switching instruments.

// pass in a dom element node and the object will extract the information 
function ElementNode(domElement){
  this.id = domElement.id;
  this.volume = domElement.dataset.volume;
    
  // indicates whether note is regular, legato, staccato, or glide 
  this.style = domElement.dataset.type;
}

/***** PERCUSSION CLASS ******/
// thanks to: https://dev.opera.com/articles/drum-sounds-webaudio/
function PercussionManager(pianoRollObject){
  // set up a noise buffer
  // used in hihat and snare drum 
  this.context = pianoRollObject.audioContext;
  const bufSize = this.context.sampleRate;
  const buffer = this.context.createBuffer(1, bufSize, bufSize);
  const output = buffer.getChannelData(0);
  for(let i = 0; i < bufSize; i++){
    output[i] = Math.random() * 2 - 1;
  }
    
  this.noiseBuffer = buffer;
    
  // note that each oscillator needs its own gain node!
  this.kickDrumNote = function(frequency, volume, time, returnBool){
    const context = this.context;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.connect(gain);
        
    osc.frequency.setValueAtTime(frequency, time);
    gain.gain.setValueAtTime(volume, time);
        
    osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
        
    if(pianoRollObject.recording){
      gain.connect(pianoRoll.audioContextDestMediaStream);
    }
    gain.connect(pianoRoll.audioContextDestOriginal);
        
    if(!returnBool){
      // this is just for clicking on a note
      osc.start(0);
      osc.stop(time + 0.1);
    }else{
      // this is for a note that needs to be played.
      // return the oscillator node in an array
      return [osc];
    }
  };
    
  this.snareDrumNote = function(frequency, volume, time, returnBool){
    const context = this.context;
    const noise = context.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const noiseFilter = context.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1800;
    noise.connect(noiseFilter);

    // add gain to the noise filter 
    const noiseEnvelope = context.createGain();
    noiseFilter.connect(noiseEnvelope);
    //noiseEnvelope.connect(context.destination);

    // the pianoRollObject should have the noise buffer and envelope set up for the snare 
    // we just need to trigger it 
    // here we add the snappy part of the drum sound
    const snapOsc = context.createOscillator();
    snapOsc.type = 'triangle';
        
    const snapOscEnv = context.createGain(); //gainNode;
    snapOsc.connect(snapOscEnv);
    //snapOscEnv.connect(context.destination);
        
    noiseEnvelope.gain.setValueAtTime(volume, time);
    noiseEnvelope.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
        
    snapOsc.frequency.setValueAtTime(100, time);
    snapOscEnv.gain.setValueAtTime(0.7, time);
    snapOscEnv.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
        
    if(pianoRollObject.recording){
      noiseEnvelope.connect(pianoRoll.audioContextDestMediaStream);
      snapOscEnv.connect(pianoRoll.audioContextDestMediaStream);
    }
    noiseEnvelope.connect(pianoRoll.audioContextDestOriginal);
    snapOscEnv.connect(pianoRoll.audioContextDestOriginal);
            
    if(!returnBool){
      // this is for clicking a note (not setting up a note for playback)
      // filter the noise buffer 
      noise.start(time);
      snapOsc.start(time);
      snapOsc.stop(time + 0.2);
      noise.stop(time + 0.2);
    }else{
      return [noise, snapOsc];
    }
  };
    
  this.hihatNote = function(volume, time, returnBool){
    const context = this.context;
    const noise = context.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const noiseFilter = context.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1200;
    noise.connect(noiseFilter);

    // add gain to the noise filter 
    const noiseEnvelope = context.createGain();
    noiseFilter.connect(noiseEnvelope);
        
    if(pianoRollObject.recording){
      noiseEnvelope.connect(pianoRoll.audioContextDestMediaStream);
    }
    noiseEnvelope.connect(pianoRoll.audioContextDestOriginal);
        
    noiseEnvelope.gain.setValueAtTime(volume, time);
    noiseEnvelope.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
            
    if(!returnBool){
      // this is for clicking a note (not setting up a note for playback)
      noise.start(time);
      noise.stop(time + 0.2);
    }else{
      return [noise];
    }
  };
}

// until I think or learn of a better way to do this, let's try getting realistic piano sounds
// via loading in .ogg files of each note on the piano roll and using AudioBufferSourceNodes :D
function PianoManager(pianoRollObject) {
  this.audioCtx = pianoRollObject.audioContext;
  this.noteMap = {};
    
  for(const note in pianoRollObject.noteFrequencies){
    this.noteMap[note.replace('#', 's')] = "";
  }
    
  this.getAudioBufferForNote = function(note){
    return this.noteMap[note].buffer;
  };
    
  // load in the notes
  this.loadPianoNotes = function(pElement){
    let totalNotes = Object.keys(this.noteMap).length;
    pElement.textContent = "loading in piano notes...";
        
    for(const note in this.noteMap){
      const fileToFetch = "example_presets/piano/piano-" + note + '.ogg';
      const newSource = this.audioCtx.createBufferSource();
            
      // https://developer.mozilla.org/en-US/docs/Web/API/Body/arrayBuffer
      const req = new Request(fileToFetch);
            
      fetch(req).then((res) => {
        return res.arrayBuffer();
      }).then((buffer) => {
        this.audioCtx.decodeAudioData(buffer, (decodedData) => {
          newSource.buffer = decodedData; // newSource will be a buffer source node that will be a reference node that we'll use to create the nodes for playing the notes
          this.noteMap[note] = newSource;
                    
          totalNotes--;
          if(totalNotes === 0){
            pElement.textContent = "";
          }
        });
      });
    }
  };
}

// a priority queue (min-heap) for getting the minimum number of nodes needed for an instrument
// no prototype because there should only be one instance of these at a time
function PriorityQueue(){
  this.array = [];
  this.size = 0;
  this.lastIndex = 0;
    
  this.swap = function(idx1, idx2){
    const temp = this.array[idx1];
    this.array[idx1] = this.array[idx2];
    this.array[idx2] = temp;
  };
    
  this.add = function(num){
    this.array[this.lastIndex++] = num;
        
    // bubble-up
    let currIdx = this.lastIndex - 1;
    let parentIdx = (currIdx - 1) / 2;
        
    while(this.array[parentIdx] > this.array[currIdx]){
      this.swap(currIdx, parentIdx);
      currIdx = parentIdx;
      parentIdx = (currIdx - 1) / 2;
    }
        
    this.size++;
  };
    
  this.remove = function(){
    if(this.size === 0){
      return null;
    }
        
    const root = this.array[0];
        
    this.array[0] = this.array[this.lastIndex - 1]; // move last node to root
    this.lastIndex--;
        
    // bubble-down
    for(let i = 0; (2*i + 1) < this.array.length; i++){
      let smallestChildIdx = 2*i + 1;
      const rightChildIdx = 2*i + 2;
            
      if(rightChildIdx < this.array.length){
        // compare against right child since it exists
        if(this.array[smallestChildIdx] > this.array[rightChildIdx]){
          smallestChildIdx = rightChildIdx;
        }
      }
            
      if(this.array[i] > this.array[smallestChildIdx]){
        this.swap(i, smallestChildIdx);
      }
    }
        
    this.size--;
        
    return root;
  };
    
  this.peek = function(){
    return this.array[0];
  };
}


try{
  module.exports = {
    PianoRoll,
    Instrument,
    Note,
    ElementNode,
    PriorityQueue,
  };
}catch(e){
  // ignore
}