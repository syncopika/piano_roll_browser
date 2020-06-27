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
	
	applyADSR(targetNodeParam, time){
		// targetNodeParam might be the gain property of a gain node, or a filter node for example
		// the targetNode just needs to have fields that make sense to be manipulated with ADSR
		// i.e. pass in gain.gain as targetNodeParam
		// https://www.redblobgames.com/x/1618-webaudio/#orgeb1ffeb

		let baseParamVal = targetNodeParam.value; // i.e. gain.gain.value
		
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
		
		reader.onload = (function(theFile){
			return function(e){
				// parse JSON using JSON.parse 
				let data = JSON.parse(e.target.result);
				
				let presetName = data['name'];
			
				// store the preset in the PianoRoll obj 
				pianoRoll.instrumentPresets[presetName] = processPresetData(data.data, audioCtx);
			}
		})(file);

		//read the file as a URL
		reader.readAsText(file);
	}
	
	input.addEventListener('change', processInstrumentPreset, false);
	input.click();
}


function processPresetData(data, audioCtx){

	const nodeTypes = {
		"GainNode": function(params){ return new GainNode(audioCtx, params) },
		"OscillatorNode": function(params){ return new OscillatorNode(audioCtx, params) },
		"ADSREnvelope": function(params){
			let newADSREnv = new ADSREnvelope();
			newADSREnv.updateParams(params);
			return newADSREnv;
		},
		"AudioBufferSourceNode": function(params){
			let bufferData = params["buffer"].channelData; 
			delete params["buffer"]['channelData']; // not a real param we can use for the constructor
			delete params["buffer"]['duration']; // duration param not supported for constructor apparently
			let buffer = new AudioBuffer(params["buffer"]);
			buffer.copyToChannel(bufferData, 0); // only one channel
			
			params["buffer"] = buffer;
			let newAudioBuffSource = new AudioBufferSourceNode(audioCtx, params);
			return newAudioBuffSource;
		},
		"BiquadFilterNode": function(params){}
	}
	
	// set up all our nodes first
	let nodeMap = {}; // map our node names to their node instances
	for(let nodeName in data){
		let nodeInfo = data[nodeName];
		for(let type in nodeTypes){
			if(nodeName.indexOf(type) >= 0){
				let audioNode = nodeTypes[type](nodeInfo.node);
				nodeMap[nodeName] = audioNode;
				audioNode.id = nodeInfo.id;
				break;
			}
		}
	}
	
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
			
			// if source is a gain node, no need to go further
			if(sinkNode.id.indexOf("Gain") < 0){
				let stack = nodeStore[sinkNode.id]["feedsInto"];
				let newSource = sinkNode;
				
				while(stack.length > 0){
					let next = stack.pop();
					let currSink = nodeStore[next].node;
					console.log("connecting: " + newSource.constructor.name + " to: " + currSink.constructor.name);
					
					newSource.connect(currSink);
					newSource = currSink;
					nextConnections = nodeStore[next]["feedsInto"].filter((name) => name.indexOf("Destination") < 0);
					stack = stack.concat(nextConnections);
				}
			}
		});
	});
	
	//let gainNodes = [...Object.keys(nodeMap)].filter((key) => key.indexOf("Gain") >= 0).map((gainId) => nodeStore[gainId]);
	
	console.log(nodeMap);
	// gain node attached to destination?
	return nodeMap;
}
































