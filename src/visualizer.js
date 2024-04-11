// for visualizing the piano roll

// @param gridDivId: a string representing an HTML element id of the grid
// @param pianoRollObject: an instance of PianoRoll 
function buildVisualizer(gridDivId, pianoRollObject){  
    const thePiano = document.getElementById(gridDivId);
    
    const dimensions = thePiano.getBoundingClientRect();
    const canvas = document.createElement('canvas');
    canvas.id = 'visuailzer';
    
    canvas.style.border = '1px solid #000';
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    
    canvas.style.width = dimensions.width + 'px';
    canvas.style.height = dimensions.height + 'px';
    canvas.style.position = 'absolute';
    canvas.style.top = 0;
    canvas.style.left = 0;
    
    const context = canvas.getContext('2d');
    context.fillStyle = 'rgba(255, 255, 255, 0.6)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    thePiano.appendChild(canvas);
    
    pianoRollObject.visualizerCanvas = canvas;
    pianoRollObject.visualizerContext = context;
}

function clearVisualizer(pianoRollObject){
    const ctx = pianoRollObject.visualizerContext;
    const width = pianoRollObject.visualizerCanvas.width;
    const height = pianoRollObject.visualizerCanvas.height;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillRect(0, 0, width, height);
}

function updateVisualizer(pianoRollObject){
    if(pianoRollObject.visualizerCanvas){
        console.log('updating canvas');
        
        const ctx = pianoRollObject.visualizerContext;
        const width = pianoRollObject.visualizerCanvas.width;
        const height = pianoRollObject.visualizerCanvas.height;
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillRect(0, 0, width, height);
        
        pianoRollObject.analyserNode.fftSize = 2048;
        const bufferLen = pianoRollObject.analyserNode.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLen);
        pianoRollObject.analyserNode.getByteTimeDomainData(dataArray);
        
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgb(0, 0, 0)';
        ctx.beginPath();
        
        const sliceWidth = width / bufferLen;
        let xPos = 0;
        
        for(let i = 0; i < bufferLen; i++){
            const dataVal = dataArray[i] / 128.0; // why 128?
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
}

function removeVisualizer(pianoRollObject){
    if(pianoRollObject.visualizerCanvas){
        pianoRollObject.visualizerCanvas.parentNode.removeChild(pianoRollObject.visualizerCanvas);
        pianoRollObject.visualizerCanvas = null;
        pianoRollObject.visualizerContext = null;
    }
}