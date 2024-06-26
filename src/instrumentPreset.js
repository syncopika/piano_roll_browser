// utility functions to handle importing instrument presets
// currently experimental and should correspond with: https://github.com/syncopika/soundmaker

class ADSREnvelope {
  constructor(){
    this.attack = 0;
    this.sustain = 0;
    this.decay = 0;
    this.release = 0;
    this.sustainLevel = 0;
  }
    
  updateParams(params){
    for(const param in params){
      if(param in this){
        this[param] = params[param];
      }
    }
  }

  applyADSR(targetNodeParam, time, duration, volToUse=null){
    // @targetNodeParam might be the gain property of a gain node, or a filter node for example
    // the targetNode just needs to have fields that make sense to be manipulated with ADSR
    // i.e. pass in gain.gain as targetNodeParam for applying the envelope to a gain node
    // @time == current time
    // @duration == how long the note should last. it may be less than the sum of the params + start time
    // so we need to make sure the node is stopped when it needs to be.
    this.sustainLevel = this.sustainLevel === 0 ? 1 : this.sustainLevel;

    const baseParamVal = volToUse ? volToUse : targetNodeParam.value; // i.e. gain.gain.value
        
    // you want to keep the value changes from the envelope steady throughout even if the note duration is not long enough to use the whole envelope
    // NOTE: cancelAndHoldAtTime is not implemented in Firefox :(
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1308431, https://github.com/WebAudio/web-audio-api/issues/2437
    if(targetNodeParam.cancelAndHoldAtTime){
      targetNodeParam.cancelAndHoldAtTime(time);
    }
        
    targetNodeParam.linearRampToValueAtTime(0.0, time);
    targetNodeParam.linearRampToValueAtTime(baseParamVal, time + this.attack);
    targetNodeParam.linearRampToValueAtTime(baseParamVal * this.sustainLevel, time + this.attack + this.decay);
    targetNodeParam.linearRampToValueAtTime(baseParamVal * this.sustainLevel, time + this.attack + this.decay + this.sustain);
    targetNodeParam.linearRampToValueAtTime(0.0, time + duration + this.attack + this.decay + this.sustain + this.release);
        
    return targetNodeParam;
  }
}

// sets up all the audio nodes needed for this instrument preset
function createPresetInstrument(data, audioCtx){

  const nodeTypes = {
        
    "GainNode": function(params){
      const gain = new GainNode(audioCtx, params);
            
      // need to add the gain value as an extra property so we don't lose it
      // when changing the actual value of the gain. this is needed when scaling volume
      // for custom instruments with multiple gain nodes.
      gain.baseGainValue = gain.gain.value;
      return gain;
    },
        
    "OscillatorNode": function(params){ 
      return new OscillatorNode(audioCtx, params);
    },
        
    "ADSREnvelope": function(params){
      const newADSREnv = new ADSREnvelope();
      newADSREnv.updateParams(params);
      return newADSREnv;
    },
        
    "AudioBufferSourceNode": function(params){
            
      if(params["buffer"].channelData){
        const bufferData = new Float32Array([...Object.values(params["buffer"].channelData)]); 
                
        //delete params["buffer"]['channelData']; // not a real param we can use for the constructor
        delete params["buffer"]['duration']; // duration param not supported for constructor apparently
                
        const buffer = new AudioBuffer(params["buffer"]);
        buffer.copyToChannel(bufferData, 0); // only one channel
        params["buffer"] = buffer;
      }
            
      const newAudioBuffSource = new AudioBufferSourceNode(audioCtx, params);
      newAudioBuffSource.loop = true;
      return newAudioBuffSource;
    },
        
    "BiquadFilterNode": function(params){
      return new BiquadFilterNode(audioCtx, params);
    }
  };
    
  // set up all our nodes first
  const nodeMap = {}; // map our node names to their node instances
  for(const nodeName in data){
    const nodeInfo = data[nodeName];
    for(const type in nodeTypes){
      if(nodeName.indexOf(type) >= 0){
        // find the right node function to call based on nodeName
        const audioNode = nodeTypes[type](nodeInfo.node); // create new node                
        nodeMap[nodeName] = audioNode; // add it to the map
        audioNode.id = nodeInfo.id;
        break;
      }
    }
  }
    
  // attach any envelopes as needed to the gain nodes 
  const gainNodes = [...Object.keys(nodeMap)].filter((key) => key.indexOf("Gain") >= 0);
  gainNodes.forEach((gain) => {
    // TODO: for now we're assuming only 1 envelope for gain nodes (and for their gain prop)
    const feed = data[gain].feedsFrom.filter((nodeName) => nodeName.indexOf("ADSR") >= 0);
    if(feed.length >= 0){
      const envelope = nodeMap[feed[0]]; // get the ADSREnvelope object ref
      nodeMap[gain].envelope = envelope;  // attach it to this gain node for easy access as a prop called envelope
    }
  });
    
  // then link them up properly based on feedsInto and feedsFrom for each node given in the data
  const oscNodes = [...Object.keys(nodeMap)].filter((key) => key.indexOf("Oscillator") >= 0 || key.indexOf("AudioBuffer") >= 0);
    
  const nodesToStart = [];
  oscNodes.forEach((osc) => {
        
    const newOsc = nodeMap[osc];
        
    // need to go down all the way to each node and make connections
    // gain nodes don't need to be touched as they're already attached to the context dest by default
    const connections = data[osc].feedsInto;
        
    connections.forEach((conn) => {
      // connect the new osc node to this connection 
      const sinkNode = nodeMap[conn];
            
      // make connection
      newOsc.connect(sinkNode);
      //console.log("connecting: " + newOsc.constructor.name + " to: " + sinkNode.constructor.name);
            
      // if sink is a gain node, no need to go further
      if(sinkNode.id.indexOf("Gain") < 0){
        let stack = data[sinkNode.id]["feedsInto"];
        let newSource = sinkNode;
                
        while(stack.length > 0){
          const next = stack.pop();
          const currSink = nodeMap[next];
          //console.log("connecting: " + newSource.constructor.name + " to: " + currSink.constructor.name);
          newSource.connect(currSink);
          newSource = currSink;
          nextConnections = data[next]["feedsInto"].filter((name) => name.indexOf("Destination") < 0);
          stack = stack.concat(nextConnections);
        }
      }
    });
  });

  //console.log(nodeMap);
  return nodeMap;
}

// get the gain nodes and the osc nodes objects that need to be played given a custom preset 
// TODO: what about ADSR envelopes!?
function getNodeNamesFromCustomPreset(currPreset){
  //console.log(currPreset);
  const nodes = [...Object.keys(currPreset)];
  const oscNodes = nodes.filter((nodeName) => {
    return nodeName.indexOf("Osc") >= 0 || nodeName.indexOf("AudioBuffer") >= 0;
  });
    
  const gainNodes = nodes.filter((nodeName) => {
    return nodeName.indexOf("Gain") >= 0;
  });
    
  return {
    "gainNodes": gainNodes, 
    "oscNodes": oscNodes
  };
}

function getNodesCustomPreset(customPreset){
  const nodes = getNodeNamesFromCustomPreset(customPreset);
    
  for(const nodeType in nodes){
    // remap so that instead of a list of names, we get a list of nodes
    nodes[nodeType] = nodes[nodeType].map((node) => customPreset[node]);
  }
    
  return nodes;
}


// handling a custom preset when clicking on a note 
function onClickCustomPreset(pianoRollObject, waveType, volume, parent){
    
  const audioCtx = pianoRollObject.audioContext;
  const presetData = pianoRollObject.instrumentPresets[waveType];
  const currPreset = createPresetInstrument(presetData, audioCtx);
    
  const nodes = getNodeNamesFromCustomPreset(currPreset);
  const oscNodes = nodes.oscNodes;
  const gainNodes = nodes.gainNodes;
    
  const now = audioCtx.currentTime;
    
  oscNodes.forEach((oscName) => {
    const osc = currPreset[oscName];
    if(osc.frequency){
      osc.frequency.value = pianoRollObject.noteFrequencies[parent];
    }
    osc.start(0);
    if(osc.stop){
      osc.stop(now + .200);
    }
  });
    
  let gainValueSum = 0;
  gainNodes.forEach((name) => {
    gainValueSum += currPreset[name].gain.value;
  });
    
  gainNodes.forEach((gainName) => {
    // let's scale our gain nodes' gain values appropriately based on the instrument's current volume value.
    // divide this gain value from the sum of all the gain values for this preset,
    // then multiply it by the curr. instrument's volume to get the equivalent proportion of gain values in the context of this instrument's volume.
    const gainNode = currPreset[gainName];

    //gainNode.gain.value = pianoRollObject.currentInstrument.volume;
    gainNode.gain.value = ((gainNode.gain.value / gainValueSum) * volume);
        
    gainNode.connect(pianoRollObject.audioContextDestOriginal);
        
    // apply any ADSR envelopes that feed into this gainNode 
    presetData[gainName].feedsFrom.forEach((feed) => {
      if(feed.indexOf("ADSR") >= 0){
        const adsr = feed;
        const envelope = currPreset[adsr];
        envelope.applyADSR(gainNode.gain, now, .200);
      }else{
        gainNode.gain.setTargetAtTime(gainNode.gain.value, now, 0.002);
      }
    });
  });
}