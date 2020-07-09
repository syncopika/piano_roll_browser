// utility functions to handle importing instrument presets
class ADSREnvelope {
	constructor(){
		this.attack = 0;
		this.sustain = 0;
		this.decay = 0;
		this.release = 0;
		this.sustainLevel = 0;
	}
	
	updateParams(params){
		for(let param in params){
			if(param in this){
				this[param] = params[param];
			}
		}
	}
	
	applyADSR(targetNodeParam, time, volToUse=null){
		// targetNodeParam might be the gain property of a gain node, or a filter node for example
		// the targetNode just needs to have fields that make sense to be manipulated with ADSR
		// i.e. pass in gain.gain as targetNodeParam
		// https://www.redblobgames.com/x/1618-webaudio/#orgeb1ffeb

		let baseParamVal = volToUse ? volToUse : targetNodeParam.value; // i.e. gain.gain.value
		targetNodeParam.linearRampToValueAtTime(0.0, time);
		targetNodeParam.linearRampToValueAtTime(baseParamVal, time + this.attack);
		targetNodeParam.linearRampToValueAtTime(baseParamVal * this.sustainLevel, this.attack + this.decay);
		targetNodeParam.linearRampToValueAtTime(baseParamVal * this.sustainLevel, this.attack + this.decay + this.sustain);
		targetNodeParam.linearRampToValueAtTime(0.0, this.attack + this.decay + this.sustain + this.release);
		return targetNodeParam;
	}
}

function importInstrumentPreset(pianoRoll){
	
	let audioCtx = pianoRoll.audioContext;
	let input = document.getElementById('importInstrumentPresetInput');
	
	function processInstrumentPreset(e){
		let reader = new FileReader();
		let file = e.target.files[0];
		
		if(file){
			reader.onload = (function(theFile){
				return function(e){ 
					let data = JSON.parse(e.target.result);
					
					if(data['name'] === undefined){
						console.log("cannot load preset because it has no name!");
						return;
					}
					
					let presetName = data['name'];
				
					// store the preset in the PianoRoll obj 
					pianoRoll.instrumentPresets[presetName] = data.data;
				}
			})(file);
		}

		//read the file as a URL
		reader.readAsText(file);
	}
	
	input.addEventListener('change', processInstrumentPreset, false);
	input.click();
}

// sets up all the audio nodes needed for this instrument preset
function createPresetInstrument(data, audioCtx){

	const nodeTypes = {
		
		"GainNode": function(params){ 
			return new GainNode(audioCtx, params);
		},
		
		"OscillatorNode": function(params){ 
			return new OscillatorNode(audioCtx, params);
		},
		
		"ADSREnvelope": function(params){
			let newADSREnv = new ADSREnvelope();
			newADSREnv.updateParams(params);
			return newADSREnv;
		},
		
		"AudioBufferSourceNode": function(params){
			
			if(params["buffer"].channelData){
				let bufferData = new Float32Array([...Object.values(params["buffer"].channelData)]); 
				
				//delete params["buffer"]['channelData']; // not a real param we can use for the constructor
				delete params["buffer"]['duration']; // duration param not supported for constructor apparently
				
				let buffer = new AudioBuffer(params["buffer"]);
				buffer.copyToChannel(bufferData, 0); // only one channel
				params["buffer"] = buffer;
			}
			
			let newAudioBuffSource = new AudioBufferSourceNode(audioCtx, params);
			newAudioBuffSource.loop = true;
			return newAudioBuffSource;
		},
		
		"BiquadFilterNode": function(params){
			return new BiquadFilterNode(audioCtx, params);
		}
	}
	
	// set up all our nodes first
	let nodeMap = {}; // map our node names to their node instances
	for(let nodeName in data){
		let nodeInfo = data[nodeName];
		for(let type in nodeTypes){
			if(nodeName.indexOf(type) >= 0){
				// find the right node function to call based on nodeName
				let audioNode = nodeTypes[type](nodeInfo.node); // create new node
				nodeMap[nodeName] = audioNode; // add it to the map
				audioNode.id = nodeInfo.id;
				break;
			}
		}
	}
	
	// attach any envelopes as needed to the gain nodes 
	let gainNodes = [...Object.keys(nodeMap)].filter((key) => key.indexOf("Gain") >= 0);
	gainNodes.forEach((gain) => {
		// TODO: for now we're assuming only 1 envelope for gain nodes (and for their gain prop)
		let feed = data[gain].feedsFrom.filter((nodeName) => nodeName.indexOf("ADSR") >= 0);
		if(feed.length >= 0){
			var envelope = nodeMap[feed[0]]; // get the ADSREnvelope object ref
			nodeMap[gain].envelope = envelope;  // attach it to this gain node for easy access as a prop called envelope
		}
	});
	
	// then link them up properly based on feedsInto and feedsFrom for each node given in the data
	let oscNodes = [...Object.keys(nodeMap)].filter((key) => key.indexOf("Oscillator") >= 0 || key.indexOf("AudioBuffer") >= 0);
	
	let nodesToStart = [];
	oscNodes.forEach((osc) => {
		
		let newOsc = nodeMap[osc];
		
		// need to go down all the way to each node and make connections
		// gain nodes don't need to be touched as they're already attached to the context dest by default
		let connections = data[osc].feedsInto;
		
		connections.forEach((conn) => {
			// connect the new osc node to this connection 
			let sinkNode = nodeMap[conn];
			
			// make connection
			newOsc.connect(sinkNode);
			//console.log("connecting: " + newOsc.constructor.name + " to: " + sinkNode.constructor.name);
			
			// if source is a gain node, no need to go further
			if(sinkNode.id.indexOf("Gain") < 0){
				let stack = data[sinkNode.id]["feedsInto"];
				let newSource = sinkNode;
				
				while(stack.length > 0){
					let next = stack.pop();
					let currSink = nodeMap[next];
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
	var nodes = [...Object.keys(currPreset)];
	var oscNodes = nodes.filter((nodeName) => {
		return nodeName.indexOf("Osc") >= 0 || nodeName.indexOf("AudioBuffer") >= 0;
	});
	
	var gainNodes = nodes.filter((nodeName) => {
		return nodeName.indexOf("Gain") >= 0;
	});
	
	return {
		"gainNodes": gainNodes, 
		"oscNodes": oscNodes
	};
}

// this needs to be refactored lol
function getNodesCustomPreset(customPreset){
	
	var nodes = [...Object.keys(customPreset)];
	var oscNodes = nodes.filter((nodeName) => {
		return nodeName.indexOf("Osc") >= 0 || nodeName.indexOf("AudioBuffer") >= 0;
	});
	oscNodes = oscNodes.map((osc) => customPreset[osc]);
	
	var gainNodes = nodes.filter((nodeName) => {
		return nodeName.indexOf("Gain") >= 0;
	});
	gainNodes = gainNodes.map((gain) => customPreset[gain]);
	return {
		"gainNodes": gainNodes, 
		"oscNodes": oscNodes
	};
}


// handling a custom preset when clicking on a note 
function onClickCustomPreset(pianoRollObject, waveType, parent){
	
	// weird, but for some reason playing an ADSR-enveloped gain node initially produces no sound.
	// after the first click, it works. :<
	var audioCtx = pianoRollObject.audioContext;
	var presetData = pianoRollObject.instrumentPresets[waveType];
	var currPreset = createPresetInstrument(presetData, audioCtx);
	
	var nodes = getNodeNamesFromCustomPreset(currPreset);
	var oscNodes = nodes.oscNodes;
	var gainNodes = nodes.gainNodes;
	
	var now = audioCtx.currentTime;
	
	oscNodes.forEach((oscName) => {
		var osc = currPreset[oscName];
		if(osc.frequency){
			osc.frequency.value = pianoRollObject.noteFrequencies[parent];
		}
		osc.start(0);
		if(osc.stop){
			osc.stop(now + .200);
		}
	});
	
	var gainValueSum = 0;
	gainNodes.forEach((name) => {
		gainValueSum += currPreset[name].gain.value;
	});
	
	gainNodes.forEach((gainName) => {

		// let's scale our gain nodes' gain values appropriately based on the instrument's current volume value.
		// divide this gain value from the sum of all the gain values for this preset,
		// then multiply it by the curr. instrument's volume to get the equivalent proportion of gain values in the context of this instrument's volume.
		var gainNode = currPreset[gainName];

		//gainNode.gain.value = pianoRollObject.currentInstrument.volume;
		gainNode.gain.value = ((gainNode.gain.value / gainValueSum) * pianoRollObject.currentInstrument.volume);
		
		gainNode.connect(pianoRollObject.audioContextDestOriginal);
		
		// apply any ADSR envelopes that feed into this gainNode 
		presetData[gainName].feedsFrom.forEach((feed) => {
			if(feed.indexOf("ADSR") >= 0){
				var adsr = feed;
				var envelope = currPreset[adsr];
				envelope.applyADSR(gainNode.gain, now);
			}else{
				gainNode.gain.setTargetAtTime(gainNode.gain.value, now, 0.002);
			}
		});
	});
	
}































