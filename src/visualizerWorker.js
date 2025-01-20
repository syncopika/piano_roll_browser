// this is the worker script for the audio visualizer
// https://web.dev/articles/offscreen-canvas

let canvas = null;

// for note ripples visualizer
let ripples = [];

let visualizerIsRunning = false;

self.onmessage = function(msg){
  //console.log(msg);
    
  if(msg.data.canvas){
    canvas = msg.data.canvas;
  }else{
    if(msg.data[0].visualizationType === 'ripples'){
      const stop = msg.data[0].stop;
      if(!stop && !visualizerIsRunning){
        visualizerIsRunning = true;
        const noteData = msg.data[0].data;
        drawRipplesVisualization(noteData, canvas);
      }else if(stop && visualizerIsRunning){
        visualizerIsRunning = false;
      }
    }else{
      const data = msg.data[0].data;
      drawVisualization(data, canvas);
    }
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

class Ripple {
  lights = [];
  colors = ['red', 'black', 'yellow', 'green', 'blue', 'pink', 'purple'];
  lineCaps = ['butt', 'round', 'square'];
  
  constructor(canvasCtx, x, y, start){
    this.speed = Math.random() + 0.2;
    this.color = this.colors[Math.floor(Math.random() * this.colors.length)];
    this.lineCap = this.lineCaps[Math.floor(Math.random() * this.lineCaps.length)];
    this.ctx = canvasCtx;
    this.startX = x;
    this.startY = y;
    this.startTime = start;
    this.isFinished = false;
    
    this.lights.push({
      currX: x,
      currY: y,
      currRadius: Math.random() * 5,
      maxRadius: 30 * Math.random() + (5 * Math.random()),
      done: false,
    });
  }
    
  distance(currX, currY){
    const xDelta = currX - this.startX;
    const yDelta = currY - this.startY;
    return Math.sqrt((xDelta * xDelta) + (yDelta * yDelta));
  }
  
  render(){
    const now = Date.now();
    if(this.lights && now >= this.startTime){
      this.lights.forEach(l => {
        if(!l.done){
          if(l.currRadius < l.maxRadius){
            this.ctx.strokeStyle = this.color;
            this.ctx.lineCap = this.lineCap;
            this.ctx.lineWidth = l.currWidth + this.speed;
            this.ctx.beginPath();
            this.ctx.arc(l.currX, l.currY, l.currRadius, 0, 2 * Math.PI);
            this.ctx.stroke();
            l.currRadius += this.speed;
          }else{
            l.done = true;
          }
        }
      });
      this.lights = this.lights.filter(l => !l.done);
      if(this.lights.length === 0){
        this.isFinished = true;
      }
    }
  }
}

function renderRipples(){
  if(!visualizerIsRunning){
    ripples = [];
    return;
  }
  
  if(canvas){
    //console.log("rendering ripples");
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ripples.forEach(f => f.render());
    ripples = ripples.filter(f => !f.isFinished);
    
    if(ripples.length === 0){
      visualizerIsRunning = false;
      return;
    }
    
    if(ripples.length > 0){
      requestAnimationFrame(renderRipples);
    }
  }
}

function drawRipplesVisualization(data, canvas){
  const width = canvas.width;
  const height = canvas.height;
  const ctx = canvas.getContext('2d');
  
  ripples = data.map(d => {
    const x = Math.random() * width;
    const y = Math.random() * height;
    return new Ripple(ctx, d.x, d.y, d.start);
  });
  
  renderRipples();
}
