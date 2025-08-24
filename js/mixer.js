class Mixer {
    constructor() {
        this.isVisible = false;
        this.initializeMixer();
    }
    
    initializeMixer() {
        const toggleBtn = document.getElementById('toggleMixerBtn');
        const mixerPanel = document.getElementById('mixerPanel');
        
        toggleBtn.addEventListener('click', () => {
            this.isVisible = !this.isVisible;
            mixerPanel.style.display = this.isVisible ? 'block' : 'none';
            toggleBtn.textContent = this.isVisible ? 'Hide Mixer' : 'Show Mixer';
        });
        
        this.createMixerChannels();
    }
    
    createMixerChannels() {
        const mixerChannels = document.querySelector('.mixer-channels');
        const instruments = ['kick', 'snare', 'hihat', 'openhat', 'crash', 'ride', 'bass'];
        
        instruments.forEach(instrument => {
            const channel = this.createChannel(instrument);
            mixerChannels.appendChild(channel);
        });
    }
    
    createChannel(instrument) {
        const channel = document.createElement('div');
        channel.className = 'mixer-channel';
        
        const settings = window.audioEngine.mixer[instrument];
        const presets = window.audioEngine.drumPresets[instrument];
        
        let channelHTML = `
            <h4>${instrument.charAt(0).toUpperCase() + instrument.slice(1)}</h4>
            <div class="volume-control">
                <label>Volume</label>
                <input type="range" 
                    id="${instrument}-volume" 
                    min="0" 
                    max="100" 
                    value="${settings.volume * 100}"
                    class="volume-slider">
                <span class="volume-value">${Math.round(settings.volume * 100)}%</span>
            </div>
        `;
        
        if (presets) {
            channelHTML += `
                <div class="preset-control">
                    <label>Sound</label>
                    <select id="${instrument}-preset" class="preset-selector">
                        ${Object.keys(presets).map(preset => 
                            `<option value="${preset}" ${settings.preset === preset ? 'selected' : ''}>
                                ${preset.charAt(0).toUpperCase() + preset.slice(1)}
                            </option>`
                        ).join('')}
                    </select>
                </div>
            `;
        }
        
        channelHTML += `
            <button class="test-sound" data-instrument="${instrument}">Test</button>
        `;
        
        channel.innerHTML = channelHTML;
        
        const volumeSlider = channel.querySelector(`#${instrument}-volume`);
        const volumeValue = channel.querySelector('.volume-value');
        const presetSelector = channel.querySelector(`#${instrument}-preset`);
        const testBtn = channel.querySelector('.test-sound');
        
        volumeSlider.addEventListener('input', (e) => {
            const value = e.target.value / 100;
            window.audioEngine.setVolume(instrument, value);
            volumeValue.textContent = `${e.target.value}%`;
        });
        
        if (presetSelector) {
            presetSelector.addEventListener('change', (e) => {
                window.audioEngine.setPreset(instrument, e.target.value);
            });
        }
        
        testBtn.addEventListener('click', () => {
            const time = window.audioEngine.context.currentTime;
            if (instrument === 'bass') {
                window.audioEngine.playBassNote('E2', time);
            } else {
                window.audioEngine.playDrumSound(instrument, time);
            }
        });
        
        return channel;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.mixer = new Mixer();
});