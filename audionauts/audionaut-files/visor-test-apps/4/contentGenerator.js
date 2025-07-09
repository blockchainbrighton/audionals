/**
 * =======================================================
 *  Content Generation Module for HUD Display
 * =======================================================
 * This module is responsible for algorithmically generating
 * scene objects for the HUD. It has no knowledge of the DOM
 * or the playback engine.
 */
const ContentGenerator = (function() {

    // --- PRIVATE: The "Limited Library" of content parts ---
  
    const VOCAB = {
      PREFIXES: ['SYS', 'AUX', 'NAV', 'CORE', 'DAT', 'SEC', 'FLUX'],
      NOUNS: ['CAPACITOR', 'MATRIX', 'RELAY', 'SENSOR', 'ARRAY', 'NODE', 'FIELD', 'REACTOR', 'SHIELD'],
      STATUSES: ['NOMINAL', 'ONLINE', 'CRITICAL', 'ERROR', 'STABLE', 'UNSTABLE', 'CHARGING', 'DECAYING'],
      SYMBOLS: ['§', 'Δ', 'Ω', 'Ψ', 'Σ', 'Φ', 'θ', '!', '#', '%', '&', '*'],
      HEX_CHARS: '0123456789ABCDEF'.split(''),
    };
  
    const MEDIA_LINKS = {
      images: [
        'https://via.placeholder.com/400x100.png/0000FF/FFFFFF?text=TARGET+LOCKED',
        'https://via.placeholder.com/300x150.png/FF0000/FFFFFF?text=HULL+BREACH',
        'https://via.placeholder.com/500x80.png/00FF00/000000?text=SYSTEM+NOMINAL'
      ],
      videos: [
        // Placeholder video links (replace with actual .mp4, .webm)
        'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
        'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4'
      ],
      urls: [
        'https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d13028.66594236104!2d-122.419415!3d37.774929!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sen!2sus!4v1678886400000!5m2!1sen!2sus' // Example embed
      ]
    };
    
    const TRANSITIONS = ['fade', 'slide-up', 'zoom'];
    
    // --- PRIVATE: Helper function to get a random item from an array ---
    function _getRandom(arr) {
      return arr[Math.floor(Math.random() * arr.length)];
    }
  
    // --- PRIVATE: Specific content generation functions ---
  
    /** Generates a system status message. e.g., "SYS_REACTOR: STABLE" */
    function _generateSystemStatus() {
      const prefix = _getRandom(VOCAB.PREFIXES);
      const noun = _getRandom(VOCAB.NOUNS);
      const status = _getRandom(VOCAB.STATUSES);
      return {
        type: 'text',
        content: `${prefix}_${noun}: ${status}`,
        duration: Math.floor(Math.random() * 3000) + 2000, // 2-5 seconds
        animation: 'none',
      };
    }
  
    /** Generates a long string of hex/symbol data for scrolling. */
    function _generateDataStream() {
      let stream = 'DATASTREAM_INCOMING :: ';
      const length = Math.floor(Math.random() * 200) + 150; // 150-350 chars
      for (let i = 0; i < length; i++) {
        stream += (Math.random() > 0.1) ? _getRandom(VOCAB.HEX_CHARS) : ` ${_getRandom(VOCAB.SYMBOLS)} `;
      }
      return {
        type: 'text',
        content: stream,
        duration: Math.floor(Math.random() * 8000) + 7000, // 7-15 seconds
        animation: 'scrollLeft', // Perfect for this content type
      };
    }
    
    /** Generates a random media scene (image, video, or url). */
    function _generateMediaScene() {
        const mediaType = _getRandom(['image', 'video', 'url']);
        let content;
        switch(mediaType) {
            case 'image': content = _getRandom(MEDIA_LINKS.images); break;
            case 'video': content = _getRandom(MEDIA_LINKS.videos); break;
            case 'url':   content = _getRandom(MEDIA_LINKS.urls);   break;
        }
        return {
            type: mediaType,
            content: content,
            duration: Math.floor(Math.random() * 4000) + 6000, // 6-10 seconds
            animation: 'none'
        };
    }
  
  
    // --- PUBLIC API ---
  
    return {
      /**
       * Generates a single, random scene object.
       * @returns {object} A scene object compatible with the playback engine.
       */
      generateScene: function() {
        // Decide randomly what kind of content to generate
        const generatorType = _getRandom(['status', 'stream', 'media']);
        
        let sceneData;
        switch (generatorType) {
          case 'stream':
            sceneData = _generateDataStream();
            break;
          case 'media':
            sceneData = _generateMediaScene();
            break;
          case 'status':
          default:
            sceneData = _generateSystemStatus();
            break;
        }
  
        // Add universal properties like transitions
        sceneData.transitionIn = _getRandom(TRANSITIONS);
        sceneData.transitionOut = _getRandom(TRANSITIONS);
  
        return sceneData;
      },
  
      /**
       * Generates an array of scene objects.
       * @param {number} count - The number of scenes to generate.
       * @returns {Array<object>} An array of scene objects.
       */
      generateSequence: function(count = 5) {
          const sequence = [];
          for (let i = 0; i < count; i++) {
              sequence.push(this.generateScene());
          }
          return sequence;
      }
    };
  
  })(); // Immediately-invoked function expression (IIFE) to create the module