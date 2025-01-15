// for visualizing the piano roll

// @param gridDivId: a string representing an HTML element id of the grid
// @param pianoRollObject: an instance of PianoRoll 
function buildVisualizer(gridDivId, pianoRollObject){
  // remove existing visualizer if there is one (e.g. if pause -> play)
  removeVisualizer(pianoRollObject);
  
  const thePiano = document.getElementById(gridDivId);
    
  const dimensions = thePiano.getBoundingClientRect();
  const canvas = document.createElement('canvas');
  canvas.id = 'visuailzer';
    
  canvas.width = thePiano.scrollWidth; //dimensions.width;
  canvas.height = dimensions.height;
    
  canvas.style.width = thePiano.scrollWidth + 'px';
  canvas.style.height = dimensions.height + 'px';
  canvas.style.position = 'absolute';
  canvas.style.top = 0;
  canvas.style.left = 0;
    
  thePiano.appendChild(canvas);
    
  pianoRollObject.visualizerCanvas = canvas;
  pianoRollObject.visualizerWebWorker = new Worker('./src/visualizerWorker.js');
    
  const offscreen = canvas.transferControlToOffscreen();
  pianoRollObject.visualizerWebWorker.postMessage(
    {canvas: offscreen}, [offscreen]
  );
}

function updateVisualizer(pianoRollObject){
  if(pianoRollObject.visualizerCanvas){
    // use a web worker offscreen canvas to
    // do this drawing stuff. pass it the analyser node data.
    // https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas
    // https://web.dev/articles/offscreen-canvas
    const bufferLen = pianoRollObject.analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLen);
    pianoRollObject.analyserNode.getByteTimeDomainData(dataArray);
        
    // https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects
    pianoRollObject.visualizerWebWorker.postMessage(
      [{data: dataArray}, dataArray.buffer]
    );
  }
  
  pianoRollObject.visualizerRequestAnimationFrameId = 
    window.requestAnimationFrame((timestamp) => updateVisualizer(pianoRollObject)); 
}

// for passing note data for note ripples visualization
// we will pass data for ALL notes of a piece to the worker (is this a bad idea?? ¯\_(ツ)_/¯)
// I think it's easier to work with requestAnimationFrame this way
function updateRipplesVisualizer(pianoRollObject, noteData, stop=false){
  // noteData should be an array of objects, with each object representing a note of the piece
  // each object in noteData should look like:
  // {
  //  start: noteStart, // should be unix timestamp
  //  end: noteEnd, // unix timestamp
  //  freq: number,
  //  color, // string, e.g. rgb(x,y,z)
  // }
  //
  if(pianoRollObject.visualizerCanvas){
    pianoRollObject.visualizerWebWorker.postMessage(
      [{
        visualizationType: 'ripples',
        stop: false,
        data: noteData,
      }]
    );
  }
}

function removeVisualizer(pianoRollObject){
  if(pianoRollObject.visualizerCanvas){
    pianoRollObject.visualizerCanvas.parentNode.removeChild(pianoRollObject.visualizerCanvas);
    pianoRollObject.visualizerCanvas = null;
    pianoRollObject.visualizerOffscreenCanvas = null;
    pianoRollObject.visualizerWebWorker = null;
  }
}