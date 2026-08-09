// for visualizing the piano roll
//
// WARNING: visualization appears to not work after exceeding a certain width, e.g. past 51 measures,
// the visualizer seems to not draw anything. 51 measures seems to be the max width of the canvas allowable for visualization.
// See https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/canvas about max canvas size.
// I guess it makes sense though that my visualization strategy using the HTML Canvas isn't infinitely scalable lol.

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

function updateVisualizer(pianoRollObject, stop=false){
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
      [{data: dataArray, stop}, dataArray.buffer]
    );
  }
  
  pianoRollObject.visualizerRequestAnimationFrameId = 
    window.requestAnimationFrame((timestamp) => updateVisualizer(pianoRollObject, stop)); 
}

// for passing note data for note ripples visualization
// we will pass data for ALL notes of a piece to the worker (is this a bad idea?? ¯\_(ツ)_/¯)
// I think it's easier to work with requestAnimationFrame this way
// @stop completely stops the visualization (which should happen when switching between visualizers)  
function updateRipplesVisualizer(pianoRollObject, noteData, stop=false, stopRender=false){
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
        stop,
        data: noteData,
      }]
    );
  }
}

// @stopRender only prevents the ripples from being rendered (so visualizer can still be toggled on/off sequentially)
function stopRipplesVisualizerRender(pianoRollObject, stopRender){
  if(pianoRollObject.visualizerCanvas){
    pianoRollObject.visualizerWebWorker.postMessage(
      [{
        visualizationType: 'ripples',
        action: 'render',
        stopRender,
      }]
    );
  }  
}

function removeVisualizer(pianoRollObject){
  if(pianoRollObject.visualizerCanvas){
    pianoRollObject.visualizerCanvas.parentNode.removeChild(pianoRollObject.visualizerCanvas);
    pianoRollObject.visualizerCanvas = null;
    pianoRollObject.visualizerOffscreenCanvas = null;
    pianoRollObject.visualizerWebWorker.terminate(); // important!
    pianoRollObject.visualizerWebWorker = null;
  }
}

// stuff for 3d visualizer 
// the 3d visualizer only needs the note data to construct a 3d rendering of each note
function removeVisualizer3d(pianoRollObject){
  if(pianoRollObject.visualizerCanvas3d){
    // detach 3d canvas container
    pianoRollObject.visualizerCanvas3d.parentNode.removeChild(pianoRollObject.visualizerCanvas3d);
    pianoRollObject.visualizerCanvas3d = null;
    
    // stop animating
    cancelAnimationFrame(pianoRollObject.visualizerRequestAnimationFrameId3d);
    pianoRollObject.visualizerRequestAnimationFrameId3d = null;
    
    pianoRollObject.visualizer3dCamera = null;
    pianoRollObject.visualizer3dScene = null;
    pianoRollObject.visualizerOffscreenCanvas3d = null;
    
    if(pianoRollObject.visualizerWebWorker3d){
      pianoRollObject.visualizerWebWorker3d.terminate(); // important!
      pianoRollObject.visualizerWebWorker3d = null;
    }
    
    if(pianoRollObject.visualizer3dRenderer){
      pianoRollObject.visualizer3dRenderer.dispose();
      pianoRollObject.visualizer3dRenderer = null;
    }
  }
}

function buildVisualizer3D(gridDivId, pianoRollObject){
  // remove existing visualizer if there is one (e.g. if pause -> play)
  removeVisualizer3d(pianoRollObject);
  
  const thePiano = document.getElementById(gridDivId);
    
  const dimensions = thePiano.getBoundingClientRect();
  const canvasContainer = document.createElement('div');
  canvasContainer.id = 'visuailzer3d';
  //canvasContainer.style.display = 'block';
  
  canvasContainer.width = dimensions.width; //thePiano.scrollWidth; //dimensions.width;
  canvasContainer.height = dimensions.height;
  
  canvasContainer.style.width = `100%`;// dimensions.width //thePiano.scrollWidth + 'px';
  canvasContainer.style.height = `${dimensions.height}px`;
  canvasContainer.style.position = 'absolute';
  canvasContainer.style.top = 0;
  canvasContainer.style.left = 0;
  canvasContainer.style.border = '1px solid #ccc';
  canvasContainer.style.zIndex = 999999;
    
  thePiano.appendChild(canvasContainer);
  
  // set up the 3d canvas with Three.js
  const renderer = new THREE.WebGLRenderer({antialias: true});
  renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight)
  canvasContainer.appendChild(renderer.domElement);
  
  // add camera, scene, lighting
  const fov = 60;
  const camera = new THREE.PerspectiveCamera(fov, canvasContainer.clientWidth / canvasContainer.clientHeight, 0.01, 1000); 
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xeeeeee);
  scene.add(camera);
  camera.position.set(0, 0, 60);
  
  const spotLight = new THREE.SpotLight(0xffffff);
  spotLight.position.set(0, 50, 0);
  spotLight.shadow.mapSize.width = 1024;
  spotLight.shadow.mapSize.height = 1024;
  scene.add(spotLight);
  
  pianoRollObject.visualizer3dScene = scene;
  pianoRollObject.visualizer3dCamera = camera;
  pianoRollObject.visualizerCanvas3d = canvasContainer;
  pianoRollObject.visualizer3dRenderer = renderer;
  
  populateVisualizer3dScene(pianoRollObject, scene);
  
  // render the scene and launch animation loop
  visualizer3dAnimationLoop(pianoRollObject);
}

function populateVisualizer3dScene(pianoRollObject, scene){
  // data should be instruments, e.g.
  /* 
    pianoRoll.instruments = [
      {
        name, 
        noteColorEnd, 
        noteColorStart, 
        notes: [ // an array of arrays, where each internal array represents a grouping of notes in the same column
          [
            {
              block: {id, volume, style}, // ElementNode
              duration,
              freq
            },
            ...
          ],
        ]
      }
    ]
  */
  
  function createNote(length, height, depth, color='#aaff00'){
    const boxGeometry = new THREE.BoxGeometry(length, height, depth);
    const boxMaterial = new THREE.MeshStandardMaterial({color});
    const box = new THREE.Mesh(boxGeometry, boxMaterial);
    return box;
  }
  
  function getLeftmostScreenEdgeIn3dSpace(pianoRollObject){
    // first calculate the half-height of the screen in 3d space
    // we can do this by taking the tangent of half the camera's FOV (which is the vertical angle of the camera's view)
    // and multiplying it by the camera's z-axis position (z-distance from center) because tan(theta) * adj = opp, taken from TOA in SOHCAHTOA (tan(theta) = opp/adj).
    // this gives us the half-height. with the camera's aspect ratio (e.g. canvas width / canvas height), we can then calculate the half-width by multiplying the half-height with the aspect ratio.
    // the half-width can tell us how far from the center along the x-axis in 3d space will get us to the edge of the screen viewport.
    const camera = pianoRollObject.visualizer3dCamera;
    // note that camera FOV is in degrees but we need radians
    const fovRad = camera.fov * Math.PI / 180;
    const halfHeight = Math.tan(fovRad / 2) * camera.position.z; // divide the angle by 2 since we want the half-height. we want half-height because SOHCAHTOA only works for right triangles and the FOV gives us more than a right triangle :)
    const halfWidth = halfHeight * camera.aspect; // (halfHeight * (canvas width / canvas height) - should get us the proportional/equivalent halfWidth in 3d space as the canvas width
    return -halfWidth; // negative because we want the leftmost edge of the screen and center is (0, 0, 0)
  }
  
  function getNoteXPosIn3dSpace(note, canvasWidth){
    const noteLeftPx = document.getElementById(note.block.id).getBoundingClientRect().left; // in 2d pixels
    //console.log(noteLeftPx);
    const offset = 60; // first note is offset by 60 px due to the piano note column on the left of the grid
    const noteLeft = noteLeftPx - offset;
    // convert noteLeft to a proportional amount in 3d space
    return noteLeft / 40; // why 40? because 40px per 8th note?
  }
  
  let startZ = 0;
  pianoRoll.instruments.forEach(inst => {
    const startX = getLeftmostScreenEdgeIn3dSpace(pianoRollObject) + 1; // +1 for a little buffer room
    const noteColor = inst.noteColorStart;
    inst.notes.forEach(noteGroup => {
      // each note in this note group should belong to the same column
      noteGroup.forEach(note => {
        const height = 0.5;
        const width = 0.8;
        const length = note.duration / 500; // this is pretty arbitrary but it doesn't look too bad? TODO: is there a less-arbitrary way to do this
        const xPos = startX + getNoteXPosIn3dSpace(note, pianoRoll.visualizerCanvas3d.clientWidth);
        const yPos = note.freq / 100; // TODO: this looks ok too but can we figure out a more sensible/consistent/less-arbitrary way to adjust yPos?
        const zPos = startZ;
        
        const newNote = createNote(length, height, width, noteColor);
        newNote.type = 'note';
        scene.add(newNote);
        
        newNote.position.set(xPos, yPos, zPos);
      });
    });
    startZ -= 10; // each instrument should have its own z-axis position to be aligned with
  });
}

function visualizer3dAnimationLoop(pianoRollObject){
  // render/update the 3d scene
  const scene = pianoRollObject.visualizer3dScene;
  const camera = pianoRollObject.visualizer3dCamera;
  
  // TODO: move the notes based on the set tempo
  const tempo = pianoRollObject.currentTempo;
  scene.children.forEach(child => {
    if(child.type && child.type === 'note'){
      child.translateX(-0.05);
    }
  });
  
  pianoRollObject.visualizer3dRenderer.render(scene, camera);
  
  pianoRollObject.visualizerRequestAnimationFrameId3d = window.requestAnimationFrame((timestamp) => visualizer3dAnimationLoop(pianoRollObject));
}
