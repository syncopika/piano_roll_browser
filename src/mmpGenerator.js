// export html piano roll to .mmp (LMMS) file

/* example .mmp file
<?xml version="1.0"?>
<!DOCTYPE multimedia-project>
<multimedia-project version="1.0" creator="Linux MultiMedia Studio (LMMS)" creatorversion="0.4.12" type="song">
  <head timesig_numerator="4" mastervol="100" timesig_denominator="4" bpm="90" masterpitch="0"/>
  <song>
    <trackcontainer width="1890" x="0" y="0" maximized="1" height="928" visible="1" type="song" minimized="0">
      <track muted="0" type="0" name="piano">
        <instrumenttrack pan="0" fxch="0" pitch="0" basenote="57" vol="100">
          <instrument name="sf2player">
            <sf2player patch="0" chorusLevel="2" chorusDepth="8" reverbOn="0" reverbRoomSize="0.2" chorusOn="0" chorusSpeed="0.3" reverbDamping="0" chorusNum="3" reverbLevel="0.9" bank="0" reverbWidth="0.5" src="" gain="1"/>
          </instrument>
          <chordcreator chord="0" chordrange="1" chord-enabled="0"/>
          <arpeggiator arptime="100" arprange="1" arptime_denominator="4" syncmode="0" arpmode="0" arp-enabled="0" arp="0" arptime_numerator="4" arpdir="0" arpgate="100"/>
          <midiport inputcontroller="0" fixedoutputvelocity="-1" inputchannel="0" outputcontroller="0" writable="0" outputchannel="1" fixedinputvelocity="-1" outputprogram="1" readable="0"/>
          <fxchain numofeffects="0" enabled="0"/>
        </instrumenttrack>
        <pattern steps="16" muted="0" type="1" name="piano" pos="0" len="384" frozen="0">
        </pattern>
      </track>
    </trackcontainer>
    <ControllerRackView width="258" x="880" y="310" maximized="0" height="172" visible="1" minimized="0"/>
    <pianoroll width="1890" x="0" y="0" maximized="1" height="928" visible="1" minimized="0"/>
    <automationeditor width="740" x="510" y="151" maximized="0" height="480" visible="0" minimized="0"/>
    <projectnotes width="400" x="700" y="10" maximized="0" height="300" visible="0" minimized="0"><![CDATA[<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.0//EN" "http://www.w3.org/TR/REC-html40/strict.dtd">
<html><head><meta name="qrichtext" content="1" /><style type="text/css">
p, li { white-space: pre-wrap; }
</style></head><body style=" font-family:'MS Shell Dlg 2'; font-size:8.25pt; font-weight:400; font-style:normal;">
<p style=" margin-top:0px; margin-bottom:0px; margin-left:0px; margin-right:0px; -qt-block-indent:0; text-indent:0px;"><span style=" font-size:8pt; color:#e0e0e0;">Put down your project notes here.</span></p></body></html>]]></projectnotes>
    <timeline lp1pos="192" lp0pos="0" lpstate="0"/>
    <controllers/>
  </song>
</multimedia-project>
*/

const projectTemplate = `<?xml version="1.0"?>
<!DOCTYPE multimedia-project>
<multimedia-project version="1.0" creator="Linux MultiMedia Studio (LMMS)" creatorversion="0.4.12" type="song">
  <head timesig_numerator="%timesig" mastervol="100" timesig_denominator="4" bpm="%bpm" masterpitch="0"/>
  <song>
    <trackcontainer width="1890" x="0" y="0" maximized="1" height="928" visible="1" type="song" minimized="0">
      %tracks
    </trackcontainer>
    <ControllerRackView width="258" x="880" y="310" maximized="0" height="172" visible="1" minimized="0"/>
    <pianoroll width="1890" x="0" y="0" maximized="1" height="928" visible="1" minimized="0"/>
    <automationeditor width="740" x="510" y="151" maximized="0" height="480" visible="0" minimized="0"/>
    <projectnotes width="400" x="700" y="10" maximized="0" height="300" visible="0" minimized="0"><![CDATA[<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.0//EN" "http://www.w3.org/TR/REC-html40/strict.dtd">
<html><head><meta name="qrichtext" content="1" /><style type="text/css">
p, li { white-space: pre-wrap; }
</style></head><body style=" font-family:'MS Shell Dlg 2'; font-size:8.25pt; font-weight:400; font-style:normal;">
<p style=" margin-top:0px; margin-bottom:0px; margin-left:0px; margin-right:0px; -qt-block-indent:0; text-indent:0px;"><span style=" font-size:8pt; color:#e0e0e0;">Put down your project notes here.</span></p></body></html>]]></projectnotes>
    <timeline lp1pos="192" lp0pos="0" lpstate="0"/>
    <controllers/>
  </song>
</multimedia-project>
`;

const trackTemplate = `<track muted="0" type="0" name="%instrumentName">
  <instrumenttrack pan="%pan" fxch="0" pitch="0" basenote="57" vol="100">
    <instrument name="sf2player">
      <sf2player patch="0" chorusLevel="2" chorusDepth="8" reverbOn="0" reverbRoomSize="0.2" chorusOn="0" chorusSpeed="0.3" reverbDamping="0" chorusNum="3" reverbLevel="0.9" bank="0" reverbWidth="0.5" src="" gain="1"/>
    </instrument>
    <chordcreator chord="0" chordrange="1" chord-enabled="0"/>
    <arpeggiator arptime="100" arprange="1" arptime_denominator="4" syncmode="0" arpmode="0" arp-enabled="0" arp="0" arptime_numerator="4" arpdir="0" arpgate="100"/>
    <midiport inputcontroller="0" fixedoutputvelocity="-1" inputchannel="0" outputcontroller="0" writable="0" outputchannel="1" fixedinputvelocity="-1" outputprogram="1" readable="0"/>
    <fxchain numofeffects="0" enabled="0"/>
  </instrumenttrack>
  <pattern steps="16" muted="0" type="1" name="%instrumentName" pos="0" len="%length" frozen="0">
    %notes
  </pattern>
</track>
`;

const noteTemplate = `<note pan="0" key="%key" vol="%volume" pos="%position" len="%length"/>`;

function interpolateValues(template, key, value){
  return template.replaceAll(key, value);
}

// convert px lengths of notes in html piano roll to the lengths used in LMMS/.mmp files
function convertNoteLengthHtmlToLmms(htmlLength){
  return Math.floor((htmlLength / 40) * 24); // 1 eighth note in html piano roll is 40px. 1 eighth note in LMMS is 24 (I dunno the units lol).
}

function generateInstrumentTrack(instrumentData, pianoKeys){  
  // sort the notes first based on position
  const notes = Array.from(Object.keys(instrumentData.notes));
  const sortedNotes = notes.sort((a, b) => parseInt(a.split('_')[1]) < parseInt(b.split('_')[1])); // e.g. Fs4col_454 vs Eb6col_450
  
  // then collect xml of notes
  const notesXml = [];
  
  let currLength = 0;
  sortedNotes.forEach(noteName => {
    const n = instrumentData.notes[noteName]; // this is an array :/. tbh I don't remember why I designed it this way -__-. but there could be multiple notes in the same note cell, e.g. 2 16th notes
    const noteKey = pianoKeys[noteName.split('col')[0].replace('s', '#')] - 1; // my piano key numbering is off by one? :/
    
    if(noteKey === undefined){
      console.log(noteName);
    }
    
    n.forEach(note => {
      // convert note length
      const len = convertNoteLengthHtmlToLmms(parseInt(note.width));
      
      // convert volume
      // LMMS is from 0-100 whereas html piano roll is 0-0.5
      const vol = Math.round(parseFloat(note.volume) * 100 / 0.5);
      
      // convert position
      // html piano roll notes have an offset of 60px (so pos 0 in LMMS would be 60px in html piano roll)
      const pos = convertNoteLengthHtmlToLmms((parseInt(note.left) - 60));
      
      const addLen = interpolateValues(noteTemplate, '%length', len);
      const addVol = interpolateValues(addLen, '%volume', vol);
      const addPos = interpolateValues(addVol, '%position', pos);
      const addKey = interpolateValues(addPos, '%key', noteKey);
      
      notesXml.push(addKey);
    });
    
    // find the note with the longest width in the array and add it to the running length total
    // so we know how long to set the track pattern to be
    currLength += convertNoteLengthHtmlToLmms(Math.max(...n.map(x => parseInt(x.width))));
  });
  
  // create a new track for this instrument
  // replace instrument name
  // replace pan
  const name = instrumentData.name;
  const pan = instrumentData.pan;
  
  const addName = interpolateValues(trackTemplate, '%instrumentName', name);
  const addPan = interpolateValues(addName, '%pan', Math.round(pan * 100)); // LMMS panning and volume range from 0-100 whereas html piano roll is 0-1.
  
  // replace total length of LMMS pattern based on total length of instrument notes
  const addLength = interpolateValues(addPan, '%length', currLength);
  
  // then add the notes
  const track = interpolateValues(addLength, '%notes', notesXml.join('\n'));
  
  return track;
}

function exportMMPFile(projectData){
  // we need to know the index of the correpsonding piano key of a note
  const pianoKeys = {
    "C8": 97,
    "B7": 96,
    "Bb7": 95,
    "A#7": 95,
    "A7": 94,
    "Ab7": 93,
    "G#7": 93,
    "G7": 92,
    "F#7": 91,
    "F7": 90,
    "E7": 89,
    "Eb7": 88,
    "D#7": 88,
    "D7": 87,
    "C#7": 86,
    "C7": 85,
    "B6": 84,
    "Bb6": 83,
    "A#6": 83,
    "A6": 82,
    "Ab6": 81,
    "G#6": 81,
    "G6": 80,
    "F#6": 79,
    "F6": 78,
    "E6": 77,
    "Eb6": 76,
    "D#6": 76,
    "D6": 75,
    "C#6": 74,
    "C6": 73,
    "B5": 72,
    "Bb5": 71,
    "A#5": 71,
    "A5": 70,
    "Ab5": 69,
    "G#5": 69,
    "G5": 68,
    "F#5": 67,
    "F5": 66,
    "E5": 65,
    "Eb5": 64,
    "D#5": 64,
    "D5": 63,
    "C#5": 62,
    "C5": 61,
    "B4": 60,
    "Bb4": 59,
    "A#4": 59,
    "A4": 58,
    "Ab4": 57,
    "G#4": 57,
    "G4": 56,
    "F#4": 55,
    "F4": 54,
    "E4": 53,
    "Eb4": 52,
    "D#4": 52,
    "D4": 51,
    "C#4": 50,
    "C4": 49,
    "B3": 48,
    "Bb3": 47,
    "A#3": 47,
    "A3": 46,
    "Ab3": 45,
    "G#3": 45,
    "G3": 44,
    "F#3": 43,
    "F3": 42,
    "E3": 41,
    "Eb3": 40,
    "D#3": 40,
    "D3": 39,
    "C#3": 38,
    "C3": 37,
    "B2": 36,
    "Bb2": 35,
    "A#2": 35,
    "A2": 34,
    "Ab2": 33,
    "G#2": 33,
    "G2": 32,
    "F#2": 31,
    "F2": 30,
    "E2": 29,
    "Eb2": 28,
    "D#2": 28,
    "D2": 27,
    "C#2": 26,
    "C2": 25
  };
  
  // get some metadata to fill in
  // %bpm
  const bpm = projectData.tempo;
  const addBpm = interpolateValues(projectTemplate, '%bpm', bpm);
  
  // %timesig
  const timeSigNumerator = parseInt(projectData.timeSignature.split('/')[0]);
  const addTimeSig = interpolateValues(addBpm, '%timesig', timeSigNumerator);
  
  // then get instruments
  const instruments = projectData.instruments;
  const instrumentXml = [];
  instruments.forEach(inst => {
    instrumentXml.push(generateInstrumentTrack(inst, pianoKeys));
  });
  
  const mmp = interpolateValues(addTimeSig, '%tracks', instrumentXml.join('\n'));
  
  // export mmp file
  const blob = new Blob([mmp], {type: "text/xml"});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${projectData.title}.mmp`;
  link.click();
}