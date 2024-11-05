// songStructure.js
export class SongSection {
    constructor(name, duration, behavior) {
      this.name = name;
      this.duration = duration; // Duration in beats
      this.behavior = behavior; // Function defining the behavior during this section
    }
  }
  
  export class SongStructure {
    constructor() {
      this.sections = [];
      this.currentSectionIndex = 0;
    }
  
    addSection(section) {
      this.sections.push(section);
    }
  
    getCurrentSection() {
      return this.sections[this.currentSectionIndex];
    }
  
    moveToNextSection() {
      if (this.currentSectionIndex < this.sections.length - 1) {
        this.currentSectionIndex++;
      } else {
        this.currentSectionIndex = 0; // Optionally loop back to the beginning
      }
    }
  }