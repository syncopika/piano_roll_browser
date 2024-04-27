// this is the worker script for the audio visualizer
// https://web.dev/articles/offscreen-canvas

let canvas = null;

self.onmessage = function(msg){
  //console.log(msg);
    
  if(msg.data.canvas){
    canvas = msg.data.canvas;
  }else{
    const data = msg.data[0].data;
    drawVisualization(data, canvas);
  }
};

function drawVisualization(data, canvas){
  const width = canvas.width;
  const height = canvas.height;
  const bufferLen = data.length;
    
  //console.log(`width: ${width}, height: ${height}, buffer len: ${bufferLen}`);
    
  const ctx = canvas.getContext('2d');
    
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    
  ctx.clearRect(0, 0, width, height);
    
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgb(0, 0, 0)';
  ctx.beginPath();
    
  const sliceWidth = width / bufferLen;
  let xPos = 0;
    
  for(let i = 0; i < bufferLen; i++){
    const dataVal = data[i] / 128.0; // why 128?
    const yPos = dataVal * (height/2);
        
    if(i === 0){
      ctx.moveTo(xPos, yPos);
    }else{
      ctx.lineTo(xPos, yPos);
    }
        
    xPos += sliceWidth;
  }
    
  ctx.stroke();
}