<script>
  import AudioTrimmer from './AudioTrimmer.svelte';
  let showModal = false;

  function openModal() {
      showModal = true;
  }

  function closeModal() {
      showModal = false;
  }
  
  function handleKeydown(event) {
        // Check if the key pressed is 'Enter' or 'Space'
        if (event.key === 'Enter' || event.key === ' ') {
            closeModal();
        }
    }
</script>

<button on:click={openModal}>Open Audio Trimmer</button>

<div id="audio-trimmer-modal" class="modal" style="display: {showModal ? 'block' : 'none'};">
  <div class="modal-content">
      <span class="close-button" on:click={closeModal}>&times;</span>
      {#if showModal}
          <AudioTrimmer />
      {/if}
  </div>
</div>
