// sampleManager.js
export class Sample {
    constructor(name, url, attributes) {
      this.name = name;
      this.url = url;
      this.attributes = attributes;
      this.audioBuffer = null;
    }
  }
  
  export default class SampleManager {
    constructor(audioContext) {
      this.audioContext = audioContext;
      this.samples = [];
      this.loadPromises = [];
    }
  
    addSample(name, url, attributes) {
      const sample = new Sample(name, url, attributes);
      this.samples.push(sample);
      const loadPromise = this.loadSample(sample);
      this.loadPromises.push(loadPromise);
    }
  
    async loadSample(sample) {
      const response = await fetch(sample.url);
      const arrayBuffer = await response.arrayBuffer();
      sample.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    }
  
    async loadAllSamples() {
      await Promise.all(this.loadPromises);
    }
  
    playSample(name, time) {
      const sample = this.samples.find(s => s.name === name);
      if (sample && sample.audioBuffer) {
        const sampleSource = this.audioContext.createBufferSource();
        sampleSource.buffer = sample.audioBuffer;
        sampleSource.connect(this.audioContext.destination);
        sampleSource.start(time);
      }
    }
  }