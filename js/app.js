class App {
    constructor() {
        this.isPlaying = false;
        this.currentSetlistIndex = 0;
        this.setlistMode = false;
        this.initializeEventListeners();
        this.updateSetlistDisplay();
        this.registerServiceWorker();
    }

    initializeEventListeners() {
        document.getElementById('playBtn').addEventListener('click', () => this.togglePlayback());
        document.getElementById('stopBtn').addEventListener('click', () => this.stop());
        document.getElementById('clearBtn').addEventListener('click', () => this.clear());
        document.getElementById('bpmInput').addEventListener('change', (e) => this.updateTempo(e));
        
        document.getElementById('midiFileInput').addEventListener('change', (e) => this.handleMidiFile(e));
        document.getElementById('processMidiBtn').addEventListener('click', () => this.processMidi());
        
        // Swing control
        const swingSlider = document.getElementById('swingAmount');
        const swingValue = document.getElementById('swingValue');
        if (swingSlider && swingValue) {
            swingSlider.addEventListener('input', (e) => {
                swingValue.textContent = `${e.target.value}%`;
            });
        }
        
        document.getElementById('savePatternBtn').addEventListener('click', () => this.savePattern());
        document.getElementById('loadSetlistBtn').addEventListener('click', () => this.showPatternLibrary());
        
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        
        this.addPresetButton();
    }

    addPresetButton() {
        const controls = document.querySelector('.controls');
        const presetBtn = document.createElement('button');
        presetBtn.textContent = 'Basic Beat';
        presetBtn.className = 'control-btn';
        presetBtn.addEventListener('click', () => {
            window.sequencer.addBasicBeat();
        });
        controls.appendChild(presetBtn);
    }

    togglePlayback() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    play() {
        window.audioEngine.start();
        this.isPlaying = true;
        document.getElementById('playBtn').textContent = '⏸';
    }

    pause() {
        window.audioEngine.stop();
        this.isPlaying = false;
        document.getElementById('playBtn').textContent = '▶';
    }

    stop() {
        window.audioEngine.stop();
        this.isPlaying = false;
        document.getElementById('playBtn').textContent = '▶';
        window.sequencer.currentStep = 0;
    }

    clear() {
        this.stop();
        window.sequencer.clear();
    }

    updateTempo(e) {
        const bpm = parseInt(e.target.value);
        if (bpm >= 60 && bpm <= 200) {
            window.audioEngine.setTempo(bpm);
        }
    }

    async handleMidiFile(e) {
        const file = e.target.files[0];
        if (file) {
            try {
                await window.midiParser.processMidiFile(file);
                alert('MIDI file loaded successfully!');
            } catch (error) {
                console.error('Error loading MIDI file:', error);
            }
        }
    }

    async processMidi() {
        const fileInput = document.getElementById('midiFileInput');
        if (fileInput.files.length > 0) {
            await this.handleMidiFile({ target: fileInput });
        } else {
            alert('Please select a MIDI file first');
        }
    }

    savePattern() {
        const name = prompt('Enter pattern name:');
        if (name) {
            const pattern = window.storage.savePattern(name);
            window.storage.addToSetlist(pattern.id);
            this.updateSetlistDisplay();
            alert('Pattern saved and added to setlist!');
        }
    }

    updateSetlistDisplay() {
        const setlistDiv = document.getElementById('setlist');
        const setlist = window.storage.getSetlist();
        
        if (setlist.length === 0) {
            setlistDiv.innerHTML = '<p style="color: #666;">No patterns in setlist</p>';
            return;
        }
        
        setlistDiv.innerHTML = '';
        
        setlist.forEach((pattern, index) => {
            const item = document.createElement('div');
            item.className = 'setlist-item';
            if (index === this.currentSetlistIndex && this.setlistMode) {
                item.style.border = '2px solid #e94560';
            }
            
            const bars = pattern.pattern?.length ? Math.ceil(pattern.pattern.length / 16) : 1;
            item.innerHTML = `
                <span>${index + 1}. ${pattern.name} (${pattern.tempo} BPM, ${bars} bars)</span>
                <div>
                    <button onclick="app.loadFromSetlist(${pattern.id})">Load</button>
                    <button onclick="app.removeFromSetlist(${pattern.id})">Remove</button>
                    <button onclick="app.moveInSetlist(${pattern.id}, 'up')">↑</button>
                    <button onclick="app.moveInSetlist(${pattern.id}, 'down')">↓</button>
                </div>
            `;
            
            setlistDiv.appendChild(item);
        });
        
        const exportBtn = document.createElement('button');
        exportBtn.textContent = 'Export Setlist';
        exportBtn.style.marginTop = '10px';
        exportBtn.onclick = () => window.storage.exportSetlist();
        setlistDiv.appendChild(exportBtn);
        
        const importBtn = document.createElement('button');
        importBtn.textContent = 'Import Setlist';
        importBtn.style.marginTop = '10px';
        importBtn.style.marginLeft = '10px';
        importBtn.onclick = () => this.importSetlist();
        setlistDiv.appendChild(importBtn);
    }

    loadFromSetlist(id) {
        const pattern = window.storage.loadPatternById(id);
        if (pattern) {
            this.stop();
            alert(`Loaded: ${pattern.name}`);
        }
    }

    removeFromSetlist(id) {
        window.storage.removeFromSetlist(id);
        this.updateSetlistDisplay();
    }

    moveInSetlist(id, direction) {
        window.storage.moveInSetlist(id, direction);
        this.updateSetlistDisplay();
    }

    importSetlist() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                try {
                    await window.storage.importSetlist(file);
                    this.updateSetlistDisplay();
                    alert('Setlist imported successfully!');
                } catch (error) {
                    alert('Error importing setlist');
                    console.error(error);
                }
            }
        };
        input.click();
    }

    showPatternLibrary() {
        const patterns = window.storage.getAllPatterns();
        
        if (patterns.length === 0) {
            alert('No saved patterns. Save a pattern first!');
            return;
        }
        
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #1a1a2e;
            border: 2px solid #e94560;
            border-radius: 10px;
            padding: 20px;
            max-height: 80vh;
            overflow-y: auto;
            z-index: 1000;
        `;
        
        modal.innerHTML = '<h3>Pattern Library</h3>';
        
        patterns.forEach(pattern => {
            const item = document.createElement('div');
            item.style.cssText = `
                padding: 10px;
                margin: 10px 0;
                background: #0f3460;
                border-radius: 5px;
                cursor: pointer;
            `;
            item.innerHTML = `${pattern.name} (${pattern.tempo} BPM)`;
            item.onclick = () => {
                window.storage.loadPatternById(pattern.id);
                document.body.removeChild(modal);
                document.body.removeChild(overlay);
            };
            modal.appendChild(item);
        });
        
        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Close';
        closeBtn.style.marginTop = '10px';
        closeBtn.onclick = () => {
            document.body.removeChild(modal);
            document.body.removeChild(overlay);
        };
        modal.appendChild(closeBtn);
        
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 999;
        `;
        overlay.onclick = () => {
            document.body.removeChild(modal);
            document.body.removeChild(overlay);
        };
        
        document.body.appendChild(overlay);
        document.body.appendChild(modal);
    }

    handleKeyPress(e) {
        if (e.code === 'Space') {
            e.preventDefault();
            this.togglePlayback();
        } else if (e.code === 'Escape') {
            this.stop();
        } else if (e.key === 's' && e.ctrlKey) {
            e.preventDefault();
            this.savePattern();
        }
    }

    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                await navigator.serviceWorker.register('/sw.js');
                console.log('Service Worker registered');
            } catch (error) {
                console.log('Service Worker registration failed:', error);
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});