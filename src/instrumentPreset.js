// utility functions to handle importing instrument presets

function addNoise(noiseNodeParams, audioContext){
	
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
	noiseFilter.type = noiseNodeParams['noiseBufPassType1'];
	noiseFilter.frequency.value = noiseNodeParams['noiseOscFreq1']; //1800;
	noise.connect(noiseFilter);

	// add gain to the noise filter 
	let noiseEnvelope = audioContext.createGain();
	noiseFilter.connect(noiseEnvelope);
	noiseEnvelope.connect(audioContext.destination);
	return [noise, noiseEnvelope];
}


function addWaveNode(waveNodeParams, audioContext){
	let snapOsc = audioContext.createOscillator();
	snapOsc.type = waveNodeParams['waveOscType1'];
	
	let snapOscEnv = audioContext.createGain();
	snapOsc.connect(snapOscEnv);
	snapOscEnv.connect(audioContext.destination);
	
	return [snapOsc, snapOscEnv];
}


// for reference
/*
	let preset1 = {
		'presetName': 'preset1',
		'numWaveNodes': 0,//1,
		'numNoiseNodes': 1,
		'waveNodes': [
			//waveNode1
		],
		'noiseNodes': [
			noiseNode1
		],
		"comments": "this is neat"
	};
*/

function processNote(freq, vol, timeStart, audioContext, currPreset){
	// play the given note based on the current synth setup
	let allNodes = [];
	let time = timeStart;//audioContext.currentTime;
	
	currPreset.waveNodes.forEach((node) => {
		let snap = addWaveNode(node, audioContext);
		let snapOsc = snap[0];
		let snapEnv = snap[1];
		let volume = vol;//node['waveOscVolume1'];
		
		snapOsc.frequency.setValueAtTime(freq, time);
		snapEnv.gain.setValueAtTime(vol, time);
		allNodes.push(snapOsc);
	});
	
	currPreset.noiseNodes.forEach((node) => {
		let noise = addNoise(node, audioContext);
		let noiseOsc = noise[0];
		let noiseEnv = noise[1];
		let volume = vol;//node['noiseOscVolume1'];
		
		noiseEnv.gain.setValueAtTime(vol, time);
		allNodes.push(noiseOsc);
	});
	
	/*
	allNodes.forEach((osc) => {
		osc.start(0);
		osc.stop(audioContext.currentTime + .100);
	});
	*/
	return allNodes;
}