class AudioEngine {
    constructor() {
        this.context = null;
        this.isPlaying = false;
        this.nextNoteTime = 0.0;
        this.currentStep = 0;
        this.tempo = 120.0;
        this.lookahead = 25.0;
        this.scheduleAheadTime = 0.1;
        this.notesInQueue = [];
        this.timerID = null;
        
        this.mixer = {
            kick: { volume: 1.0, preset: 'punchy' },
            snare: { volume: 0.7, preset: 'crisp' },
            hihat: { volume: 0.3, preset: 'tight' },
            openhat: { volume: 0.4, preset: 'bright' },
            crash: { volume: 0.5, preset: 'wash' },
            ride: { volume: 0.4, preset: 'bell' },
            bass: { volume: 0.5 }
        };
        
        this.drumPresets = {
            kick: {
                punchy: { freq: 60, decay: 0.5, tone: 100, q: 1 },
                deep: { freq: 45, decay: 0.7, tone: 80, q: 2 },
                tight: { freq: 80, decay: 0.3, tone: 120, q: 0.5 },
                sub: { freq: 35, decay: 1.0, tone: 60, q: 3 }
            },
            snare: {
                crisp: { freq: 200, decay: 0.2, tone: 1500, q: 0.5, noise: 0.6 },
                fat: { freq: 150, decay: 0.3, tone: 800, q: 1, noise: 0.4 },
                tight: { freq: 250, decay: 0.1, tone: 2000, q: 0.3, noise: 0.7 },
                vintage: { freq: 180, decay: 0.25, tone: 1200, q: 0.7, noise: 0.5 }
            },
            hihat: {
                tight: { freq: 8000, decay: 0.03, tone: 10000, q: 0.5, noise: 0.9 },
                crisp: { freq: 9000, decay: 0.05, tone: 12000, q: 0.3, noise: 0.95 },
                soft: { freq: 6000, decay: 0.04, tone: 8000, q: 0.7, noise: 0.8 },
                metallic: { freq: 11000, decay: 0.02, tone: 14000, q: 0.2, noise: 1.0 }
            },
            openhat: {
                bright: { freq: 8000, decay: 0.3, tone: 10000, q: 0.5, noise: 0.9 },
                long: { freq: 7000, decay: 0.5, tone: 9000, q: 0.6, noise: 0.85 },
                short: { freq: 9000, decay: 0.2, tone: 11000, q: 0.4, noise: 0.95 },
                dark: { freq: 5000, decay: 0.4, tone: 7000, q: 0.8, noise: 0.8 }
            },
            crash: {
                wash: { freq: 500, decay: 2.0, tone: 5000, q: 0.5, noise: 0.8 },
                quick: { freq: 600, decay: 1.2, tone: 6000, q: 0.4, noise: 0.9 },
                long: { freq: 400, decay: 3.0, tone: 4500, q: 0.6, noise: 0.75 },
                bright: { freq: 700, decay: 1.5, tone: 7000, q: 0.3, noise: 0.95 }
            },
            ride: {
                bell: { freq: 600, decay: 0.4, tone: 6000, q: 1, noise: 0.3 },
                wash: { freq: 500, decay: 0.6, tone: 5000, q: 0.7, noise: 0.5 },
                ping: { freq: 800, decay: 0.3, tone: 8000, q: 1.5, noise: 0.2 },
                dark: { freq: 400, decay: 0.5, tone: 4000, q: 0.8, noise: 0.4 }
            }
        };
        
        this.loadMixerSettings();
        this.initializeAudio();
    }

    initializeAudio() {
        try {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            this.context = new AudioContext();
            this.unlockAudioContext();
        } catch (e) {
            console.error('Web Audio API is not supported in this browser', e);
        }
    }

    unlockAudioContext() {
        if (this.context.state === 'suspended') {
            const resume = () => {
                this.context.resume();
                setTimeout(() => {
                    if (this.context.state === 'running') {
                        document.body.removeEventListener('touchstart', resume, false);
                        document.body.removeEventListener('click', resume, false);
                    }
                }, 0);
            };
            document.body.addEventListener('touchstart', resume, false);
            document.body.addEventListener('click', resume, false);
        }
    }

    playDrumSound(type, time) {
        const settings = this.mixer[type];
        const preset = this.drumPresets[type][settings.preset];
        const volume = settings.volume;
        
        if (type === 'hihat' || type === 'openhat') {
            this.playHiHat(type, time, preset, volume);
        } else if (type === 'snare') {
            this.playSnare(time, preset, volume);
        } else if (type === 'kick') {
            this.playKick(time, preset, volume);
        } else if (type === 'crash' || type === 'ride') {
            this.playCymbal(type, time, preset, volume);
        }
    }
    
    playKick(time, preset, volume) {
        const osc = this.context.createOscillator();
        const gainNode = this.context.createGain();
        const filter = this.context.createBiquadFilter();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(preset.freq, time);
        osc.frequency.exponentialRampToValueAtTime(0.01, time + preset.decay);
        
        filter.type = 'lowpass';
        filter.frequency.value = preset.tone;
        filter.Q.value = preset.q;
        
        gainNode.gain.setValueAtTime(volume, time);
        gainNode.gain.exponentialRampToValueAtTime(0.01, time + preset.decay);
        
        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.context.destination);
        
        osc.start(time);
        osc.stop(time + preset.decay);
    }
    
    playSnare(time, preset, volume) {
        const osc = this.context.createOscillator();
        const gainNode = this.context.createGain();
        const filter = this.context.createBiquadFilter();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(preset.freq, time);
        
        filter.type = 'highpass';
        filter.frequency.value = preset.tone;
        filter.Q.value = preset.q;
        
        gainNode.gain.setValueAtTime(volume * 0.5, time);
        gainNode.gain.exponentialRampToValueAtTime(0.01, time + preset.decay);
        
        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.context.destination);
        
        osc.start(time);
        osc.stop(time + preset.decay);
        
        this.playNoise(time, preset.decay * 0.8, preset.noise * volume, preset.tone);
    }
    
    playHiHat(type, time, preset, volume) {
        const noiseSource = this.context.createBufferSource();
        const noiseGain = this.context.createGain();
        const noiseFilter = this.context.createBiquadFilter();
        
        const bufferSize = this.context.sampleRate * preset.decay;
        const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
        const output = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        
        noiseSource.buffer = buffer;
        
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.value = preset.freq;
        noiseFilter.Q.value = preset.q;
        
        const bandpass = this.context.createBiquadFilter();
        bandpass.type = 'bandpass';
        bandpass.frequency.value = preset.tone;
        bandpass.Q.value = 2;
        
        noiseGain.gain.setValueAtTime(volume * preset.noise * 0.5, time);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, time + preset.decay);
        
        noiseSource.connect(noiseFilter);
        noiseFilter.connect(bandpass);
        bandpass.connect(noiseGain);
        noiseGain.connect(this.context.destination);
        
        noiseSource.start(time);
        noiseSource.stop(time + preset.decay);
    }
    
    playCymbal(type, time, preset, volume) {
        const osc = this.context.createOscillator();
        const gainNode = this.context.createGain();
        const filter = this.context.createBiquadFilter();
        
        osc.type = 'square';
        osc.frequency.setValueAtTime(preset.freq, time);
        
        filter.type = 'highpass';
        filter.frequency.value = preset.tone;
        filter.Q.value = preset.q;
        
        gainNode.gain.setValueAtTime(volume * 0.3, time);
        gainNode.gain.exponentialRampToValueAtTime(0.01, time + preset.decay);
        
        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.context.destination);
        
        osc.start(time);
        osc.stop(time + preset.decay);
        
        this.playNoise(time, preset.decay, preset.noise * volume, preset.tone);
    }

    playNoise(time, duration, volume = 0.1, filterFreq = 1000) {
        const bufferSize = this.context.sampleRate * duration;
        const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
        const output = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        const noise = this.context.createBufferSource();
        const noiseFilter = this.context.createBiquadFilter();
        const noiseGain = this.context.createGain();

        noise.buffer = buffer;
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.value = filterFreq;
        noiseGain.gain.setValueAtTime(volume, time);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, time + duration);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.context.destination);
        
        noise.start(time);
        noise.stop(time + duration);
    }

    playBassNote(note, time, duration = 0.25) {
        const osc = this.context.createOscillator();
        const gainNode = this.context.createGain();
        const filter = this.context.createBiquadFilter();

        const frequencies = {
            'C1': 32.70, 'C#1': 34.65, 'D1': 36.71, 'D#1': 38.89,
            'E1': 41.20, 'F1': 43.65, 'F#1': 46.25, 'G1': 49.00,
            'G#1': 51.91, 'A1': 55.00, 'A#1': 58.27, 'B1': 61.74,
            'C2': 65.41, 'C#2': 69.30, 'D2': 73.42, 'D#2': 77.78,
            'E2': 82.41, 'F2': 87.31, 'F#2': 92.50, 'G2': 98.00,
            'G#2': 103.83, 'A2': 110.00, 'A#2': 116.54, 'B2': 123.47,
            'C3': 130.81
        };

        const freq = frequencies[note] || 82.41;
        const volume = this.mixer.bass.volume;
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, time);
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(freq * 4, time);
        filter.frequency.exponentialRampToValueAtTime(freq * 2, time + duration);
        filter.Q.value = 5;

        gainNode.gain.setValueAtTime(volume * 0.3, time);
        gainNode.gain.exponentialRampToValueAtTime(0.01, time + duration);

        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.context.destination);
        
        osc.start(time);
        osc.stop(time + duration);
    }

    start() {
        if (this.context.state === 'suspended') {
            this.context.resume();
        }
        
        if (!this.isPlaying) {
            this.isPlaying = true;
            this.currentStep = 0;
            this.nextNoteTime = this.context.currentTime;
            this.scheduler();
        }
    }

    stop() {
        this.isPlaying = false;
        if (this.timerID) {
            clearTimeout(this.timerID);
            this.timerID = null;
        }
        this.currentStep = 0;
    }

    scheduler() {
        while (this.nextNoteTime < this.context.currentTime + this.scheduleAheadTime) {
            this.scheduleNote(this.currentStep, this.nextNoteTime);
            this.nextNote();
        }
        if (this.isPlaying) {
            this.timerID = setTimeout(() => this.scheduler(), this.lookahead);
        }
    }

    scheduleNote(beatNumber, time) {
        this.notesInQueue.push({ note: beatNumber, time: time });
        
        if (typeof window.sequencer !== 'undefined') {
            window.sequencer.playStep(beatNumber, time);
        }
    }

    nextNote() {
        const secondsPerBeat = 60.0 / (this.tempo * 4);
        this.nextNoteTime += secondsPerBeat;
        
        this.currentStep++;
        const patternLength = window.sequencer ? window.sequencer.patternLength : 16;
        if (this.currentStep >= patternLength) {
            this.currentStep = 0;
        }
    }

    setTempo(bpm) {
        this.tempo = bpm;
    }
    
    setVolume(instrument, value) {
        this.mixer[instrument].volume = Math.max(0, Math.min(1, value));
        this.saveMixerSettings();
    }
    
    setPreset(instrument, preset) {
        if (this.drumPresets[instrument] && this.drumPresets[instrument][preset]) {
            this.mixer[instrument].preset = preset;
            this.saveMixerSettings();
        }
    }
    
    saveMixerSettings() {
        localStorage.setItem('livebeatMixer', JSON.stringify(this.mixer));
    }
    
    loadMixerSettings() {
        const saved = localStorage.getItem('livebeatMixer');
        if (saved) {
            try {
                const settings = JSON.parse(saved);
                Object.assign(this.mixer, settings);
            } catch (e) {
                console.log('Using default mixer settings');
            }
        }
    }
}

window.audioEngine = new AudioEngine();