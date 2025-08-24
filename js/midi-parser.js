class MidiParser {
    constructor() {
        this.midiData = null;
        this.drumNotes = {
            35: 'kick', 36: 'kick',
            38: 'snare', 40: 'snare',
            42: 'hihat', 44: 'hihat',
            46: 'openhat',
            49: 'crash', 57: 'crash',
            51: 'ride', 59: 'ride'
        };
        
        this.bassRange = { min: 28, max: 55 };
    }

    async loadMidiFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const arrayBuffer = e.target.result;
                    const midiData = this.parseMidi(new Uint8Array(arrayBuffer));
                    resolve(midiData);
                } catch (error) {
                    reject(error);
                }
            };
            reader.readAsArrayBuffer(file);
        });
    }

    parseMidi(data) {
        let pos = 0;
        
        const readUint32 = () => {
            const value = (data[pos] << 24) | (data[pos + 1] << 16) | 
                         (data[pos + 2] << 8) | data[pos + 3];
            pos += 4;
            return value;
        };
        
        const readUint16 = () => {
            const value = (data[pos] << 8) | data[pos + 1];
            pos += 2;
            return value;
        };
        
        const readVarLength = () => {
            let value = 0;
            let byte;
            do {
                byte = data[pos++];
                value = (value << 7) | (byte & 0x7F);
            } while (byte & 0x80);
            return value;
        };
        
        const readString = (length) => {
            const str = String.fromCharCode.apply(null, data.slice(pos, pos + length));
            pos += length;
            return str;
        };
        
        const headerChunk = readString(4);
        if (headerChunk !== 'MThd') {
            throw new Error('Invalid MIDI file');
        }
        
        const headerLength = readUint32();
        const format = readUint16();
        const numTracks = readUint16();
        const division = readUint16();
        
        const tracks = [];
        
        for (let i = 0; i < numTracks; i++) {
            const trackChunk = readString(4);
            if (trackChunk !== 'MTrk') {
                throw new Error('Invalid track chunk');
            }
            
            const trackLength = readUint32();
            const trackEnd = pos + trackLength;
            const events = [];
            let runningStatus = 0;
            
            while (pos < trackEnd) {
                const deltaTime = readVarLength();
                let statusByte = data[pos];
                
                if (statusByte < 0x80) {
                    statusByte = runningStatus;
                } else {
                    pos++;
                    runningStatus = statusByte;
                }
                
                const channel = statusByte & 0x0F;
                const messageType = statusByte & 0xF0;
                
                let event = { deltaTime, channel };
                
                switch (messageType) {
                    case 0x80:
                        event.type = 'noteOff';
                        event.note = data[pos++];
                        event.velocity = data[pos++];
                        break;
                    case 0x90:
                        event.type = 'noteOn';
                        event.note = data[pos++];
                        event.velocity = data[pos++];
                        if (event.velocity === 0) {
                            event.type = 'noteOff';
                        }
                        break;
                    case 0xB0:
                        event.type = 'controller';
                        event.controller = data[pos++];
                        event.value = data[pos++];
                        break;
                    case 0xC0:
                        event.type = 'programChange';
                        event.program = data[pos++];
                        break;
                    case 0xE0:
                        event.type = 'pitchBend';
                        event.value = data[pos++] | (data[pos++] << 7);
                        break;
                    case 0xF0:
                        if (statusByte === 0xFF) {
                            event.type = 'meta';
                            event.metaType = data[pos++];
                            const length = readVarLength();
                            event.data = data.slice(pos, pos + length);
                            pos += length;
                            
                            if (event.metaType === 0x51) {
                                const tempo = (event.data[0] << 16) | (event.data[1] << 8) | event.data[2];
                                event.tempoBPM = 60000000 / tempo;
                            }
                        } else {
                            const length = readVarLength();
                            pos += length;
                        }
                        break;
                    default:
                        console.warn('Unknown MIDI event type:', messageType.toString(16));
                        break;
                }
                
                events.push(event);
            }
            
            tracks.push(events);
        }
        
        return { format, division, tracks };
    }

    extractDrumAndBass(midiData) {
        // PPQ can be in two formats:
        // If high bit is 0: ticks per quarter note
        // If high bit is 1: SMPTE format (we'll handle the common case)
        let ppq = midiData.division;
        if (ppq & 0x8000) {
            // SMPTE format - use default
            ppq = 480;
        }
        
        console.log(`MIDI PPQ (ticks per quarter note): ${ppq}`);
        
        // Get time signature and tempo information
        let timeSignature = { numerator: 4, denominator: 4 };
        let microsecondsPerQuarter = 500000; // Default 120 BPM
        let tempo = 120;
        let tempoChanges = [];
        
        // First pass: extract tempo and time signature
        midiData.tracks.forEach(track => {
            let currentTime = 0;
            track.forEach(event => {
                currentTime += event.deltaTime;
                
                if (event.type === 'meta') {
                    if (event.metaType === 0x51) { // Tempo
                        const tempoBPM = 60000000 / ((event.data[0] << 16) | (event.data[1] << 8) | event.data[2]);
                        tempo = Math.round(tempoBPM);
                        microsecondsPerQuarter = (event.data[0] << 16) | (event.data[1] << 8) | event.data[2];
                        tempoChanges.push({ time: currentTime, tempo: tempo });
                        console.log(`Tempo change at tick ${currentTime}: ${tempo} BPM`);
                    } else if (event.metaType === 0x58) { // Time signature
                        timeSignature.numerator = event.data[0];
                        timeSignature.denominator = Math.pow(2, event.data[1]);
                        console.log(`Time signature: ${timeSignature.numerator}/${timeSignature.denominator}`);
                    }
                }
            });
        });
        
        // Calculate timing based on actual musical values
        // For 4/4 time: 1 bar = 4 quarter notes = 16 sixteenth notes
        // PPQ is ticks per quarter note, so sixteenth note = PPQ / 4
        const ticksPerSixteenth = ppq / 4;
        const ticksPerBar = ppq * timeSignature.numerator;
        
        console.log(`Ticks per 16th note: ${ticksPerSixteenth}`);
        console.log(`Ticks per bar: ${ticksPerBar}`);
        
        // Find the actual length of the MIDI file
        let maxTime = 0;
        midiData.tracks.forEach(track => {
            let currentTime = 0;
            track.forEach(event => {
                currentTime += event.deltaTime;
                if (currentTime > maxTime) {
                    maxTime = currentTime;
                }
            });
        });
        
        // Calculate pattern length in 16th notes
        const totalSixteenths = Math.ceil(maxTime / ticksPerSixteenth);
        const totalBars = Math.ceil(totalSixteenths / 16);
        const patternLength = totalBars * 16; // Round up to complete bars
        
        console.log(`Total ticks: ${maxTime}, Total 16ths: ${totalSixteenths}, Pattern length: ${patternLength}`);
        
        // Initialize patterns
        const patterns = {
            drums: {
                kick: new Array(patternLength).fill(false),
                snare: new Array(patternLength).fill(false),
                hihat: new Array(patternLength).fill(false),
                openhat: new Array(patternLength).fill(false),
                crash: new Array(patternLength).fill(false),
                ride: new Array(patternLength).fill(false)
            },
            bass: new Array(patternLength).fill(null),
            tempo: tempo,
            length: patternLength
        };
        
        // Extract notes with proper timing
        midiData.tracks.forEach((track, trackIndex) => {
            let currentTick = 0;
            let isDrumTrack = false;
            let isBassTrack = false;
            
            track.forEach(event => {
                currentTick += event.deltaTime;
                
                if (event.type === 'programChange') {
                    if (event.channel === 9) {
                        isDrumTrack = true;
                    } else if (event.program >= 32 && event.program <= 39) {
                        isBassTrack = true;
                    }
                }
                
                // Channel 10 (9 in 0-based) is always drums in GM
                if (event.channel === 9) {
                    isDrumTrack = true;
                }
                
                if (event.type === 'noteOn' && event.velocity > 0) {
                    // Convert ticks to 16th note position
                    // Use floor for quantization to nearest 16th
                    const exactPosition = currentTick / ticksPerSixteenth;
                    const stepPosition = Math.floor(exactPosition + 0.5); // Round to nearest
                    
                    if (stepPosition < patternLength) {
                        if (isDrumTrack || event.channel === 9) {
                            const drumType = this.drumNotes[event.note];
                            if (drumType && patterns.drums[drumType]) {
                                patterns.drums[drumType][stepPosition] = true;
                            }
                        } else if (event.note >= this.bassRange.min && event.note <= this.bassRange.max) {
                            patterns.bass[stepPosition] = this.midiNoteToName(event.note);
                        }
                    }
                }
            });
        });
        
        console.log(`Extracted ${patternLength} steps (${patternLength/16} bars) from MIDI file at ${tempo} BPM`);
        
        return patterns;
    }

    midiNoteToName(noteNumber) {
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const octave = Math.floor(noteNumber / 12) - 1;
        const noteName = noteNames[noteNumber % 12];
        return noteName + octave;
    }

    async processMidiFile(file, options = {}) {
        try {
            const midiData = await this.loadMidiFile(file);
            
            // Get quantization settings
            const quantizeSelect = document.getElementById('quantizeSelect');
            const swingAmount = document.getElementById('swingAmount');
            const quantize = quantizeSelect ? parseInt(quantizeSelect.value) : 16;
            const swing = swingAmount ? parseInt(swingAmount.value) / 100 : 0;
            
            const patterns = this.extractDrumAndBassWithQuantize(midiData, quantize, swing);
            
            // Display MIDI info
            const midiInfo = document.getElementById('midiInfo');
            if (midiInfo) {
                midiInfo.style.display = 'block';
                midiInfo.innerHTML = `
                    <strong>MIDI File Info:</strong><br>
                    PPQ: ${midiData.division & 0x8000 ? 'SMPTE' : midiData.division}<br>
                    Tempo: ${patterns.tempo} BPM<br>
                    Time Signature: ${patterns.timeSignature || '4/4'}<br>
                    Length: ${patterns.length} steps (${patterns.length/16} bars)<br>
                    Quantization: ${quantize === 0 ? 'None' : `1/${quantize} notes`}
                `;
            }
            
            if (patterns.tempo) {
                document.getElementById('bpmInput').value = patterns.tempo;
                window.audioEngine.setTempo(patterns.tempo);
            }
            
            window.sequencer.loadPattern(patterns);
            
            return patterns;
        } catch (error) {
            console.error('Error processing MIDI file:', error);
            alert('Error processing MIDI file. Please ensure it\'s a valid MIDI file.');
            throw error;
        }
    }
    
    extractDrumAndBassWithQuantize(midiData, quantizeValue, swing) {
        const patterns = this.extractDrumAndBass(midiData);
        
        if (quantizeValue === 0) {
            return patterns; // No quantization
        }
        
        // Apply swing if needed
        if (swing > 0 && quantizeValue === 16) {
            // Apply swing to off-beats (every other 16th note)
            Object.keys(patterns.drums).forEach(drum => {
                const newPattern = [...patterns.drums[drum]];
                for (let i = 1; i < newPattern.length; i += 2) {
                    // Shift odd 16th notes slightly late for swing feel
                    if (patterns.drums[drum][i] && i + 1 < newPattern.length) {
                        const swingOffset = Math.floor(swing * 0.5);
                        if (!patterns.drums[drum][i + swingOffset]) {
                            newPattern[i] = false;
                            newPattern[Math.min(i + swingOffset, newPattern.length - 1)] = true;
                        }
                    }
                }
                patterns.drums[drum] = newPattern;
            });
        }
        
        return patterns;
    }
}

window.midiParser = new MidiParser();