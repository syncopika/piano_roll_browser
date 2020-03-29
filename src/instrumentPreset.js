// utility functions to handle importing instrument presets

function addNoise(noiseNodeParams, pianoRoll){
	
	let audioContext = pianoRoll.audioContext;
	
	// this stuff should be customizable
	let bufSize = audioContext.sampleRate;
	let buffer = audioContext.createBuffer(1, bufSize, bufSize);
	let output = buffer.getChannelData(0);
	
	// TODO: fix this
	for(let i = 0; i < bufSize; i++){
		output[i] = Math.random() * 2 - 1;
	}
	
	this.noiseBuffer = buffer;
	let noise = audioContext.createBufferSource();
	noise.buffer = this.noiseBuffer;
	let noiseFilter = audioContext.createBiquadFilter();
	noiseFilter.type = noiseNodeParams['noiseFilterPassType'];
	noiseFilter.frequency.value = noiseNodeParams['noiseOscFreq'];
	noise.connect(noiseFilter);

	// add gain to the noise filter 
	let noiseEnvelope = audioContext.createGain();
	noiseFilter.connect(noiseEnvelope);
	
	if(pianoRoll.recording){
		noiseEnvelope.connect(pianoRoll.audioContextDestMediaStream);
	}
	noiseEnvelope.connect(pianoRoll.audioContextDestOriginal);
	
	
	return [noise, noiseEnvelope];
}


function addWaveNode(waveNodeParams, pianoRoll){
	
	let audioContext = pianoRoll.audioContext;
	
	let snapOsc = audioContext.createOscillator();
	snapOsc.type = waveNodeParams['waveOscType'];
	
	let snapOscEnv = audioContext.createGain();
	snapOsc.connect(snapOscEnv);
	
	if(pianoRoll.recording){
		snapOscEnv.connect(pianoRoll.audioContextDestMediaStream);
	}
	snapOscEnv.connect(pianoRoll.audioContextDestOriginal);
	
	return [snapOsc, snapOscEnv];
}


function processNote(freq, vol, timeStart, pianoRoll, currPreset){
	// play the given note based on the current synth setup
	let allNodes = [];
	let time = timeStart;
	
	currPreset.waveNodes.forEach((node) => {
		let snap = addWaveNode(node, pianoRoll);
		let snapOsc = snap[0];
		let snapEnv = snap[1];
		
		snapOsc.frequency.setValueAtTime(freq, time);
		
		// here we're using the volume given by the current note's volume setting
		// but that conflicts with the volume given by the preset for this particular node 
		// can we reconcile the difference? like given the current note's volume, maybe we
		// can come up with a corresponding ratio of separate node volumes?
		snapEnv.gain.setValueAtTime(vol, time);
		
		if(node['waveOscDetune']){
			snapOsc.detune.setValueAtTime(node['waveOscDetune'], time);
		}			
		
		allNodes.push(snapOsc);
	});
	
	currPreset.noiseNodes.forEach((node) => {
		let noise = addNoise(node, pianoRoll);
		let noiseOsc = noise[0];
		let noiseEnv = noise[1];
		
		noiseEnv.gain.setValueAtTime(vol, time);
		allNodes.push(noiseOsc);
	});
	
	return allNodes;
}