// this is the worker script for the audio visualizer
// https://web.dev/articles/offscreen-canvas

let canvas = null;

// for note ripples visualizer
let ripples = [];

let visualizerIsRunning = false;
let stopVisualizer = false;

self.onmessage = function(msg){
  //console.log(msg);
    
  if(msg.data.canvas){
    canvas = msg.data.canvas;
  }else{
    if(msg.data[0].visualizationType === 'ripples'){
      const stop = msg.data[0].stop;
      if(!stop && !visualizerIsRunning){
        const data = msg.data[0].data;
        drawRipplesVisualization(data, canvas);
        visualizerIsRunning = true;
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
  
  constructor(type, canvasCtx, x, y, start){
    this.type = type;
    this.radius = 90 * Math.random() + 10;
    this.speed = 2 * Math.random() + 0.2;
    this.color = this.colors[Math.floor(Math.random() * this.colors.length)];
    this.lineCap = this.lineCaps[Math.floor(Math.random() * this.lineCaps.length)];
    this.ctx = canvasCtx;
    this.startX = x;
    this.startY = y;
    this.startTime = start;
    this.isFinished = false;
    
    let deg = 0;
    const slices = 8;
    const sliceDeg = 360 / slices;
    for(let i = 0; i < slices; i++){
      this.lights.push({
        forward: {x: Math.cos(deg * Math.PI / 180), y: Math.sin(deg * Math.PI / 180)},
        currX: x,
        currY: y,
        currWidth: 18 * Math.random() + 1, // TODO: set random line width per firework instead of per light?
        done: false,
      });
      
      deg += sliceDeg;
    }
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
          if(this.type === 'circle'){
            if(this.distance(l.currX, l.currY) < this.radius){
              const nextX = l.currX + (l.forward.x * this.speed);
              const nextY = l.currY + (l.forward.y * this.speed);
              this.ctx.strokeStyle = this.color;
              this.ctx.lineCap = this.lineCap;
              this.ctx.lineWidth = l.currWidth;
              this.ctx.beginPath();
              this.ctx.moveTo(nextX, nextY);
              this.ctx.lineTo(nextX, nextY + 1); // this.ctx.lineTo(nextX + 1, nextY + 1); for slanted lights
              this.ctx.closePath();
              this.ctx.stroke();
              l.currX = nextX;
              l.currY = nextY;
              l.currWidth -= 1;
            }else{
              l.done = true;
            }
          }
        }
      });
      this.lights = this.lights.filter(l => !l.done);
      if(this.lights.length === 0){
        //console.log('done rendering firework');
        this.isFinished = true;
      }
    }
  }
}

function renderRipples(){
  if(stopVisualizer){
    visualizerIsRunning = false;
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
  
  // use requestAnimationFrame to draw the notes as needed as ripples
  //console.log('hello from the web worker!');
  //console.log(data);
  const x = Math.random() * width;
  const y = Math.random() * height;
  
  ripples = data.map(d => new Ripple('circle', ctx, x, y, d.start));
  
  renderRipples();
}
