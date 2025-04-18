# Bitcoin Ordinals Music Technology Research

## Audionals - The Technology Behind OB1

Audionals is a revolutionary project founded by Jim (one of the three members of OB1) that introduces a novel way to generate music on the Bitcoin blockchain by inscribing audio data in an affordable and unprecedented manner.

### Core Technology

1. **Base64 Audio Conversion**: 
   - Audio files are converted into Base64 format and embedded within JSON files
   - This makes audio data easily indexable and sortable
   - Facilitates efficient searching and organization of audio samples

2. **Metadata Integration**:
   - The JSON format allows for comprehensive metadata inclusion:
     - Musical key
     - Tempo
     - Instrument type
     - Creator information
     - Ownership details
   - Creates a searchable and user-friendly database of audio files

3. **Recursive Techniques**:
   - Allows new music to be created by building on existing audio inscriptions
   - Enables modular music production directly on-chain
   - Opens up endless possibilities for creativity and collaboration

4. **OrdSPD (Audional Sample Pad)**:
   - An easy-to-use regenerative Bitcoin Ordinal Mixer for Audional Smart Samples
   - Allows users to play with inscribed samples
   - Features include:
     - BPM adjustment
     - Volume control
     - Playback speed modification
     - Loop length customization
   - Users can create their own mix and download it as a JSON file

5. **High-Resolution Audio Support**:
   - Supports inscription of studio-quality samples
   - Users can layer lower-resolution audio on top of high-resolution backing tracks
   - Maintains professional audio quality in blockchain-based music production

## Recursive Ordinal Inscriptions for Music

Recursive inscriptions solve the problem of Bitcoin's block size limitations for large media files like music:

1. **The Challenge**: 
   - Bitcoin has limitations on how big individual inscriptions can be
   - This presents a challenge for storing large music or video files

2. **The Solution - inscriptionJoin**:
   - A function that fetches individual inscription parts and concatenates their binary data
   - Returns a complete byte array containing all parts combined
   - Allows for splitting large audio files into smaller parts that can be inscribed separately
   - These parts can later be reassembled on-chain

3. **Implementation Process**:
   - Split audio recordings into individual parts
   - Inscribe each part separately
   - Use inscriptionJoin to reassemble the parts in their original order
   - Verify integrity by comparing hash digests of original and reassembled files

4. **Advanced Applications**:
   - Interactive music players with synchronized visual elements
   - Sheet music display that follows along with audio playback
   - Complex audio-visual experiences entirely on-chain

## Future Developments

1. **On-Chain Music Production**:
   - Entire music production processes from composition to mastering
   - Open and accessible tools for others to build upon

2. **Storage Integration**:
   - Plans to integrate with permanent data storage solutions like Arweave
   - Cost-effective storage (e.g., 1GB of permanent storage on Arweave for $10)

3. **Royalty Framework**:
   - Implementation of fair compensation mechanisms
   - Every contributor receives attribution and payment for their work
   - Democratization of the music industry through blockchain technology

## Significance for OB1

The Audionals technology forms the foundation of OB1's "Bitcoin beat lab and music studio" concept. By leveraging these innovations, OB1 is creating a platform where:

1. Each NFT can have unique sounds embedded within it
2. Artists can create and share music directly on the Bitcoin blockchain
3. Fair attribution and rights are preserved through immutable blockchain records
4. Musicians can collaborate and build upon each other's work
5. A new economic model for music creation and distribution is established

This technology represents a paradigm shift in how music can be created, owned, and distributed, with significant implications for artists' rights and the future of the music industry.
