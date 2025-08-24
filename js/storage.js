class Storage {
    constructor() {
        this.storageKey = 'livebeatData';
        this.setlistKey = 'livebeatSetlist';
        this.currentSetlist = [];
        this.loadSetlist();
    }

    savePattern(name) {
        if (!name) {
            name = `Pattern ${new Date().toLocaleString()}`;
        }
        
        const pattern = window.sequencer.getPattern();
        const tempo = document.getElementById('bpmInput').value;
        
        const patternData = {
            id: Date.now(),
            name: name,
            pattern: pattern,
            tempo: tempo,
            timestamp: new Date().toISOString()
        };
        
        const savedPatterns = this.getAllPatterns();
        savedPatterns.push(patternData);
        
        localStorage.setItem(this.storageKey, JSON.stringify(savedPatterns));
        
        return patternData;
    }

    getAllPatterns() {
        const data = localStorage.getItem(this.storageKey);
        return data ? JSON.parse(data) : [];
    }

    loadPatternById(id) {
        const patterns = this.getAllPatterns();
        const pattern = patterns.find(p => p.id === id);
        
        if (pattern) {
            window.sequencer.loadPattern(pattern.pattern);
            document.getElementById('bpmInput').value = pattern.tempo;
            window.audioEngine.setTempo(pattern.tempo);
            return pattern;
        }
        
        return null;
    }

    deletePattern(id) {
        const patterns = this.getAllPatterns();
        const filtered = patterns.filter(p => p.id !== id);
        localStorage.setItem(this.storageKey, JSON.stringify(filtered));
        
        this.currentSetlist = this.currentSetlist.filter(p => p.id !== id);
        this.saveSetlist();
    }

    addToSetlist(patternId) {
        const patterns = this.getAllPatterns();
        const pattern = patterns.find(p => p.id === patternId);
        
        if (pattern && !this.currentSetlist.find(p => p.id === patternId)) {
            this.currentSetlist.push(pattern);
            this.saveSetlist();
            return true;
        }
        
        return false;
    }

    removeFromSetlist(patternId) {
        this.currentSetlist = this.currentSetlist.filter(p => p.id !== patternId);
        this.saveSetlist();
    }

    saveSetlist() {
        localStorage.setItem(this.setlistKey, JSON.stringify(this.currentSetlist));
    }

    loadSetlist() {
        const data = localStorage.getItem(this.setlistKey);
        this.currentSetlist = data ? JSON.parse(data) : [];
        return this.currentSetlist;
    }

    getSetlist() {
        return this.currentSetlist;
    }

    moveInSetlist(id, direction) {
        const index = this.currentSetlist.findIndex(p => p.id === id);
        
        if (index === -1) return;
        
        if (direction === 'up' && index > 0) {
            [this.currentSetlist[index], this.currentSetlist[index - 1]] = 
            [this.currentSetlist[index - 1], this.currentSetlist[index]];
        } else if (direction === 'down' && index < this.currentSetlist.length - 1) {
            [this.currentSetlist[index], this.currentSetlist[index + 1]] = 
            [this.currentSetlist[index + 1], this.currentSetlist[index]];
        }
        
        this.saveSetlist();
    }

    exportSetlist() {
        const data = {
            version: '1.0',
            created: new Date().toISOString(),
            setlist: this.currentSetlist,
            patterns: this.getAllPatterns()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `livebeat-setlist-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    importSetlist(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    
                    if (data.patterns) {
                        const existingPatterns = this.getAllPatterns();
                        const newPatterns = [...existingPatterns, ...data.patterns];
                        localStorage.setItem(this.storageKey, JSON.stringify(newPatterns));
                    }
                    
                    if (data.setlist) {
                        this.currentSetlist = data.setlist;
                        this.saveSetlist();
                    }
                    
                    resolve(data);
                } catch (error) {
                    reject(error);
                }
            };
            reader.readAsText(file);
        });
    }

    clearAll() {
        if (confirm('Are you sure you want to clear all saved patterns and setlists?')) {
            localStorage.removeItem(this.storageKey);
            localStorage.removeItem(this.setlistKey);
            this.currentSetlist = [];
        }
    }
}

window.storage = new Storage();