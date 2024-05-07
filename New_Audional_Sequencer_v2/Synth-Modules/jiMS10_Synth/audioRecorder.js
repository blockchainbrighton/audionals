// audioRecorder.js

function setupMediaRecorder() {
    const context = window.audioContext;
    const gainNode = window.gainNode;

    const mediaStreamDestination = context.createMediaStreamDestination();
    gainNode.connect(mediaStreamDestination); // Connect gainNode to mediaStreamDestination only

    const mimeType = MediaRecorder.isTypeSupported('audio/webm; codecs=opus') ? 'audio/webm; codecs=opus' : 'audio/webm';
    let recorder = new MediaRecorder(mediaStreamDestination.stream, { mimeType });
    let audioChunks = [];

    // Event handlers and other recorder setup
    recorder.ondataavailable = event => {
        if (event.data.size > 0) {
            audioChunks.push(event.data);
            console.log(`Received audio data size: ${event.data.size}, chunks count: ${audioChunks.length}`);
        } else {
            console.log('Received an empty audio chunk.');
        }
    };

    recorder.onerror = event => {
        console.error('Recorder Error:', event.error);
    };

    recorder.onstop = async () => {
        console.log(`Recorder stopped, total chunks: ${audioChunks.length}`);
        if (audioChunks.length > 0) {
            const audioBlob = new Blob(audioChunks, { type: mimeType });
            const arrayBuffer = await blobToArrayBuffer(audioBlob);
            window.parent.postMessage({
                type: 'audioData',
                data: arrayBuffer,
                mimeType: mimeType,
                filename: 'SynthSample',
                channelIndex: currentChannelIndex
            }, '*');
        } else {
            console.error('No audio data recorded.');
        }
    };

    window.startAudioRecording = () => {
        if (recorder && recorder.state !== 'recording') {
            audioChunks.length = 0; // Clear previous recordings
            recorder.start();
            console.log("Audio recording started.");
        } else {
            console.error("Attempted to start recording, but recorder is already in state:", recorder.state);
        }
    };

    window.stopAudioRecording = () => {
        recorder.stop();
    };

    function blobToArrayBuffer(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                resolve(reader.result);
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(blob);
        });
    }
}

document.addEventListener('DOMContentLoaded', setupMediaRecorder);


    

//     // document.getElementById('playRecordButton').addEventListener('click', () => {
//     //     if (context.state === 'suspended') {
//     //         context.resume().then(() => {
//     //             console.log("AudioContext resumed successfully");
//     //             playRecordedAudio();
//     //         }).catch(e => console.error('Error resuming the audio context:', e));
//     //     } else {
//     //         playRecordedAudio();
//     //     }
//     // });

//     function playRecordedAudio() {
//         let audioUrl; // Ensure this variable is defined correctly in your context or passed in
//         if (audioUrl) {
//             console.log('Playing from URL:', audioUrl);
//             const audio = new Audio(audioUrl);
//             audio.play().then(() => {
//                 console.log('Playback started');
//             }).catch(e => {
//                 console.error('Error playing the audio:', e);
//             });
//         } else {
//             console.error('Audio URL is not defined.');
//         }
//     }
