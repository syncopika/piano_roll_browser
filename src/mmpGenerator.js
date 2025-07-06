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
  <head timesig_numerator="4" mastervol="100" timesig_denominator="%timesig" bpm="%bpm" masterpitch="0"/>
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
    const noteKey = pianoKeys.indexOf(noteName.split('col')[0]);
    
    n.forEach(note => {
      // convert note length
      const len = convertNoteLengthHtmlToLmms(parseInt(note.width));
      
      // convert volume
      // LMMS is from 0-100 whereas html piano roll is 0-1
      const vol = parseFloat(note.volume) * 100;
      
      // convert position
      // html piano roll notes have an offset of 60px (so pos 0 in LMMS would be 60px in html piano roll)
      // there's also a weird additional 8px offset (see getJSONData() in utils.js)
      const pos = convertNoteLengthHtmlToLmms((parseInt(note.left) - 68));
      
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
  
  console.log(name);
  console.log(pan);
  
  const addName = interpolateValues(trackTemplate, '%instrumentName', name);
  const addPan = interpolateValues(addName, '%pan', pan * 100); // LMMS panning and volume range from 0-100 whereas html piano roll is 0-1.
  
  // replace total length of LMMS pattern based on total length of instrument notes
  const addLength = interpolateValues(addPan, '%length', currLength);
  
  // then add the notes
  const track = interpolateValues(addLength, '%notes', notesXml.join('\n'));
  
  return track;
}

function exportMMPFile(projectData, pianoRoll){
  // we need to know the index of the correpsonding piano key of a note
  const pianoKeys = Array.from(Object.keys(pianoRoll.noteFrequencies)).reverse(); // reverse because I listed the notes in descending order
  
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
  console.log(mmp);
  
  return mmp;
}