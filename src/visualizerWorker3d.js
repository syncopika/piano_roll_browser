// this is the worker script for the 3d audio visualizer
// https://web.dev/articles/offscreen-canvas

// TODO: need three.js
// use importScripts web worker method?
// <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r120/three.min.js" integrity="sha512-kgjZw3xjgSUDy9lTU085y+UCVPz3lhxAtdOVkcO4O2dKl2VSBcNsQ9uMg/sXIM4SoOmCiYfyFO/n1/3GSXZtSg==" crossorigin="anonymous"></script>

let canvas = null;

self.onmessage = function(msg){
  console.log(msg);
  if(msg.data.canvas){
    canvas = msg.data.canvas;
  }else{
    if(msg.data[0].visualizationType === 'ripples'){
      // 3d visualizer
      const data = msg.data[0].data;
      const stop = msg.data[0].stop;
      drawVisualization3d(data, canvas, stop);
    }
  }
};

function drawVisualization3d(data, canvas, stop){
  const width = canvas.width;
  const height = canvas.height;
  
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
}
