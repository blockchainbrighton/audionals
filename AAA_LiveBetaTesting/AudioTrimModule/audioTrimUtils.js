// audioTrimUtils.js

document.addEventListener('DOMContentLoaded', function() {
    // Add event listener to all "T" buttons
    document.querySelectorAll('.open-audio-trimmer').forEach(button => {
        button.addEventListener('click', function() {
            openAudioTrimmerModal();
        });
    });
});

function openAudioTrimmerModal() {
    // Fetch the HTML content from audioTrimModule.html
    fetch('audioTrimModule.html')
        .then(response => response.text())
        .then(html => {
            // Inject the HTML into the modal's container
            document.getElementById('audio-trimmer-container').innerHTML = html;

            // Display the modal
            document.getElementById('audio-trimmer-modal').style.display = 'block';
        })
        .catch(error => {
            console.error('Error loading audio trimmer module:', error);
        });
}

// Close modal functionality
document.querySelector('.close-button').addEventListener('click', function() {
    document.getElementById('audio-trimmer-modal').style.display = 'none';
});
