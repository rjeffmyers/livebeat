class Sequencer {
    constructor() {
        this.patternLength = 16;
        this.maxPatternLength = 2048;
        this.stepsPerMeasure = 16;
        this.visibleSteps = 32;
        this.scrollPosition = 0;
        
        this.drumPattern = {
            kick: new Array(this.patternLength).fill(false),
            snare: new Array(this.patternLength).fill(false),
            hihat: new Array(this.patternLength).fill(false),
            openhat: new Array(this.patternLength).fill(false),
            crash: new Array(this.patternLength).fill(false),
            ride: new Array(this.patternLength).fill(false)
        };
        
        this.bassPattern = {
            notes: new Array(this.patternLength).fill(null),
            activeNote: 'E2'
        };
        
        this.currentStep = 0;
        this.initializeGrid();
        this.setupBassNotes();
        this.setupPatternControls();
    }

    initializeGrid() {
        this.createDrumGrid();
        this.createBassGrid();
    }

    createDrumGrid() {
        const drumGrid = document.getElementById('drumGrid');
        drumGrid.innerHTML = '';
        const instruments = ['kick', 'snare', 'hihat', 'openhat', 'crash', 'ride'];
        
        instruments.forEach(instrument => {
            const row = document.createElement('div');
            row.className = 'grid-row';
            row.dataset.instrument = instrument;
            
            const label = document.createElement('div');
            label.className = 'instrument-label';
            label.textContent = instrument.charAt(0).toUpperCase() + instrument.slice(1);
            row.appendChild(label);
            
            const cellContainer = document.createElement('div');
            cellContainer.className = 'cell-container';
            
            for (let i = 0; i < this.visibleSteps; i++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                if (i % this.stepsPerMeasure === 0) {
                    cell.classList.add('measure-start');
                } else if (i % 4 === 0) {
                    cell.classList.add('beat-start');
                }
                cell.dataset.instrument = instrument;
                cell.dataset.step = i;
                
                cell.addEventListener('click', () => {
                    const actualStep = this.scrollPosition + i;
                    if (actualStep < this.patternLength) {
                        this.toggleDrumCell(instrument, actualStep, cell);
                    }
                });
                
                cellContainer.appendChild(cell);
            }
            
            row.appendChild(cellContainer);
            drumGrid.appendChild(row);
        });
        
        this.updateGridDisplay();
    }

    createBassGrid() {
        const bassGrid = document.getElementById('bassGrid');
        bassGrid.innerHTML = '';
        const notes = ['C3', 'B2', 'A#2', 'A2', 'G#2', 'G2', 'F#2', 'F2', 'E2', 'D#2', 'D2', 'C#2', 'C2', 'B1', 'A#1', 'A1', 'G#1', 'G1', 'F#1', 'F1', 'E1', 'D#1', 'D1', 'C#1', 'C1'];
        
        notes.forEach(note => {
            const row = document.createElement('div');
            row.className = 'grid-row';
            row.dataset.note = note;
            
            const label = document.createElement('div');
            label.className = 'instrument-label';
            label.textContent = note;
            row.appendChild(label);
            
            const cellContainer = document.createElement('div');
            cellContainer.className = 'cell-container';
            
            for (let i = 0; i < this.visibleSteps; i++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                if (i % this.stepsPerMeasure === 0) {
                    cell.classList.add('measure-start');
                } else if (i % 4 === 0) {
                    cell.classList.add('beat-start');
                }
                cell.dataset.note = note;
                cell.dataset.step = i;
                
                cell.addEventListener('click', () => {
                    const actualStep = this.scrollPosition + i;
                    if (actualStep < this.patternLength) {
                        this.toggleBassCell(note, actualStep, cell);
                    }
                });
                
                cellContainer.appendChild(cell);
            }
            
            row.appendChild(cellContainer);
            bassGrid.appendChild(row);
        });
        
        this.updateBassGridDisplay();
    }

    setupBassNotes() {
        const bassSection = document.getElementById('bassSection');
        const noteSelector = document.createElement('div');
        noteSelector.className = 'note-selector';
        noteSelector.innerHTML = `
            <label>Active Note: </label>
            <select id="bassNoteSelect">
                <option value="C1">C1</option>
                <option value="C#1">C#1</option>
                <option value="D1">D1</option>
                <option value="D#1">D#1</option>
                <option value="E1">E1</option>
                <option value="F1">F1</option>
                <option value="F#1">F#1</option>
                <option value="G1">G1</option>
                <option value="G#1">G#1</option>
                <option value="A1">A1</option>
                <option value="A#1">A#1</option>
                <option value="B1">B1</option>
                <option value="C2">C2</option>
                <option value="C#2">C#2</option>
                <option value="D2">D2</option>
                <option value="D#2">D#2</option>
                <option value="E2" selected>E2</option>
                <option value="F2">F2</option>
                <option value="F#2">F#2</option>
                <option value="G2">G2</option>
                <option value="G#2">G#2</option>
                <option value="A2">A2</option>
                <option value="A#2">A#2</option>
                <option value="B2">B2</option>
                <option value="C3">C3</option>
            </select>
        `;
        
        const h2 = bassSection.querySelector('h2');
        h2.insertAdjacentElement('afterend', noteSelector);
        
        document.getElementById('bassNoteSelect').addEventListener('change', (e) => {
            this.bassPattern.activeNote = e.target.value;
        });
    }

    setupPatternControls() {
        const header = document.querySelector('header .controls');
        
        const patternControls = document.createElement('div');
        patternControls.className = 'pattern-controls';
        patternControls.innerHTML = `
            <label>Length:</label>
            <input type="number" id="patternLength" value="${this.patternLength}" min="16" max="${this.maxPatternLength}" step="16">
            <span id="measureCount">1 bar</span>
            <button id="scrollLeft" class="scroll-btn">◀</button>
            <span id="scrollInfo">1-${Math.min(this.visibleSteps, this.patternLength)}</span>
            <button id="scrollRight" class="scroll-btn">▶</button>
        `;
        
        header.appendChild(patternControls);
        
        document.getElementById('patternLength').addEventListener('change', (e) => {
            this.setPatternLength(parseInt(e.target.value));
        });
        
        document.getElementById('scrollLeft').addEventListener('click', () => {
            this.scroll(-this.stepsPerMeasure);
        });
        
        document.getElementById('scrollRight').addEventListener('click', () => {
            this.scroll(this.stepsPerMeasure);
        });
    }
    
    setPatternLength(newLength) {
        if (newLength < 16) newLength = 16;
        if (newLength > this.maxPatternLength) newLength = this.maxPatternLength;
        
        newLength = Math.ceil(newLength / 16) * 16;
        
        Object.keys(this.drumPattern).forEach(instrument => {
            const oldPattern = this.drumPattern[instrument];
            this.drumPattern[instrument] = new Array(newLength).fill(false);
            for (let i = 0; i < Math.min(oldPattern.length, newLength); i++) {
                this.drumPattern[instrument][i] = oldPattern[i];
            }
        });
        
        const oldBassPattern = this.bassPattern.notes;
        this.bassPattern.notes = new Array(newLength).fill(null);
        for (let i = 0; i < Math.min(oldBassPattern.length, newLength); i++) {
            this.bassPattern.notes[i] = oldBassPattern[i];
        }
        
        this.patternLength = newLength;
        
        const measures = Math.ceil(newLength / this.stepsPerMeasure);
        document.getElementById('measureCount').textContent = `${measures} bar${measures > 1 ? 's' : ''}`;
        
        this.updateScrollInfo();
        this.updateGridDisplay();
        this.updateBassGridDisplay();
    }
    
    scroll(direction) {
        const newPosition = this.scrollPosition + direction;
        
        if (newPosition < 0) {
            this.scrollPosition = 0;
        } else if (newPosition >= this.patternLength - this.visibleSteps) {
            this.scrollPosition = Math.max(0, this.patternLength - this.visibleSteps);
        } else {
            this.scrollPosition = newPosition;
        }
        
        this.updateScrollInfo();
        this.updateGridDisplay();
        this.updateBassGridDisplay();
    }
    
    updateScrollInfo() {
        const start = this.scrollPosition + 1;
        const end = Math.min(this.scrollPosition + this.visibleSteps, this.patternLength);
        document.getElementById('scrollInfo').textContent = `${start}-${end}`;
    }
    
    toggleDrumCell(instrument, step, cell) {
        if (!this.drumPattern[instrument][step]) {
            this.drumPattern[instrument][step] = true;
            cell.classList.add('active');
        } else {
            this.drumPattern[instrument][step] = false;
            cell.classList.remove('active');
        }
    }

    toggleBassCell(note, step, cell) {
        const visibleStep = step - this.scrollPosition;
        const allCellsInColumn = document.querySelectorAll(`#bassGrid .grid-cell[data-step="${visibleStep}"]`);
        allCellsInColumn.forEach(c => c.classList.remove('active'));
        
        if (this.bassPattern.notes[step] === note) {
            this.bassPattern.notes[step] = null;
            cell.classList.remove('active');
        } else {
            this.bassPattern.notes[step] = note;
            cell.classList.add('active');
        }
    }

    playStep(step, time) {
        this.highlightCurrentStep(step);
        
        Object.keys(this.drumPattern).forEach(instrument => {
            if (this.drumPattern[instrument][step]) {
                window.audioEngine.playDrumSound(instrument, time);
            }
        });
        
        if (this.bassPattern.notes[step]) {
            window.audioEngine.playBassNote(this.bassPattern.notes[step], time);
        }
    }

    highlightCurrentStep(step) {
        document.querySelectorAll('.grid-cell.playing').forEach(cell => {
            cell.classList.remove('playing');
        });
        
        if (step >= this.scrollPosition && step < this.scrollPosition + this.visibleSteps) {
            const visibleStep = step - this.scrollPosition;
            document.querySelectorAll(`.grid-cell[data-step="${visibleStep}"]`).forEach(cell => {
                cell.classList.add('playing');
            });
            
            setTimeout(() => {
                document.querySelectorAll(`.grid-cell[data-step="${visibleStep}"]`).forEach(cell => {
                    cell.classList.remove('playing');
                });
            }, 100);
        }
        
        if (step % this.stepsPerMeasure === 0 && step > 0) {
            const shouldScroll = step >= this.scrollPosition + this.visibleSteps - 8;
            if (shouldScroll && this.scrollPosition + this.visibleSteps < this.patternLength) {
                this.scroll(this.stepsPerMeasure);
            }
        }
    }

    clear() {
        Object.keys(this.drumPattern).forEach(instrument => {
            this.drumPattern[instrument].fill(false);
        });
        
        this.bassPattern.notes.fill(null);
        
        document.querySelectorAll('.grid-cell').forEach(cell => {
            cell.classList.remove('active');
        });
        
        this.scrollPosition = 0;
        this.updateScrollInfo();
    }

    getPattern() {
        return {
            drums: this.drumPattern,
            bass: this.bassPattern.notes,
            length: this.patternLength
        };
    }

    loadPattern(pattern) {
        if (pattern.length) {
            this.setPatternLength(pattern.length);
        }
        
        if (pattern.drums) {
            this.drumPattern = pattern.drums;
            Object.keys(this.drumPattern).forEach(instrument => {
                if (!this.drumPattern[instrument]) {
                    this.drumPattern[instrument] = new Array(this.patternLength).fill(false);
                }
            });
        }
        
        if (pattern.bass) {
            this.bassPattern.notes = pattern.bass;
        }
        
        this.scrollPosition = 0;
        this.updateScrollInfo();
        this.updateGridDisplay();
        this.updateBassGridDisplay();
    }

    addBasicBeat() {
        this.drumPattern.kick[0] = true;
        this.drumPattern.kick[4] = true;
        this.drumPattern.kick[8] = true;
        this.drumPattern.kick[12] = true;
        
        this.drumPattern.snare[4] = true;
        this.drumPattern.snare[12] = true;
        
        for (let i = 0; i < 16; i += 2) {
            this.drumPattern.hihat[i] = true;
        }
        
        this.updateGridDisplay();
    }

    updateGridDisplay() {
        Object.keys(this.drumPattern).forEach(instrument => {
            const row = document.querySelector(`.grid-row[data-instrument="${instrument}"]`);
            if (!row) return;
            
            const cells = row.querySelectorAll('.grid-cell');
            cells.forEach((cell, index) => {
                const actualStep = this.scrollPosition + index;
                if (actualStep < this.patternLength && this.drumPattern[instrument][actualStep]) {
                    cell.classList.add('active');
                } else {
                    cell.classList.remove('active');
                }
                
                if (actualStep >= this.patternLength) {
                    cell.classList.add('disabled');
                } else {
                    cell.classList.remove('disabled');
                }
            });
        });
    }
    
    updateBassGridDisplay() {
        const bassGrid = document.getElementById('bassGrid');
        const rows = bassGrid.querySelectorAll('.grid-row');
        
        rows.forEach(row => {
            const note = row.dataset.note;
            const cells = row.querySelectorAll('.grid-cell');
            
            cells.forEach((cell, index) => {
                const actualStep = this.scrollPosition + index;
                if (actualStep < this.patternLength && this.bassPattern.notes[actualStep] === note) {
                    cell.classList.add('active');
                } else {
                    cell.classList.remove('active');
                }
                
                if (actualStep >= this.patternLength) {
                    cell.classList.add('disabled');
                } else {
                    cell.classList.remove('disabled');
                }
            });
        });
    }
}

window.sequencer = new Sequencer();