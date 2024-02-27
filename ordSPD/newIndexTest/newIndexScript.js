// newIndexScript.js

document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.select-button').forEach(button => {
        button.addEventListener('click', function() {
            this.classList.toggle('selected');
            // Optional: Toggle class or style on the corresponding iframe as well
        });
    });
});
