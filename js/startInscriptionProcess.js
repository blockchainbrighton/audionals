/**
 * Starts the inscription process by communicating with the Gamma API.
 *
 * @param {HTMLElement} audionalJsonText - The DOM element containing the JSON text.
 * @param {HTMLElement} inscriptionPreviewContainer - The container to display the inscription preview.
 * @param {HTMLElement} estimatedFeesSpan - The span element to display estimated fees.
 * @param {HTMLElement} networkFeeRateSpan - The span element to display the network fee rate.
 */
export async function startInscriptionProcess(
  audionalJsonText,
  inscriptionPreviewContainer,
  estimatedFeesSpan,
  networkFeeRateSpan
) {
  try {
    console.log('=== StartInscriptionProcess Initiated ===');

    // Step 1: Parse the JSON text from the DOM element
    const jsonTextContent = audionalJsonText.innerText;
    console.log('Parsed JSON text content:', jsonTextContent);

    let audionalJsonObject;
    try {
      audionalJsonObject = JSON.parse(jsonTextContent);
      console.log('Successfully parsed JSON object:', audionalJsonObject);
    } catch (parseError) {
      console.error('Failed to parse JSON:', parseError);
      throw new Error('Invalid JSON format in audionalJsonText.');
    }

    // Step 2: Call getInscriptionPreview to get the preview data from the Worker
    console.log('Calling getInscriptionPreview with the parsed JSON object.');
    const inscriptionPreview = await getInscriptionPreview(audionalJsonObject);
    console.log('Received inscription preview:', inscriptionPreview);

    // Step 3: Extract total fees and network fee rate from the response
    const totalFees = inscriptionPreview?.calculated_fee_summary?.high?.total_fee_sats;
    const networkFeeRate = inscriptionPreview?.calculated_fee_summary?.high?.network_fee_rate;

    if (typeof totalFees === 'undefined' || typeof networkFeeRate === 'undefined') {
      console.error('Missing "total_fee_sats" or "network_fee_rate" in inscriptionPreview.');
      throw new Error('Incomplete data received from inscription preview.');
    }

    console.log(`Extracted Total Fees: ${totalFees}`);
    console.log(`Extracted Network Fee Rate: ${networkFeeRate}`);

    // Step 4: Update the UI elements accordingly
    // Hide audionalJsonTextarea
    audionalJsonText.style.display = "inline-block";
    console.log('Audional JSON textarea hidden.');

    // Show inscriptionPreviewArea
    inscriptionPreviewContainer.style.display = "inline-block";
    console.log('Inscription preview container displayed.');

    // Update span with estimated fees
    estimatedFeesSpan.value = totalFees;
    console.log(`Estimated Fees Span updated with value: ${totalFees}`);

    // Update span with network fee rate
    networkFeeRateSpan.value = networkFeeRate;
    console.log(`Network Fee Rate Span updated with value: ${networkFeeRate}`);

    // Show the doInscribe button
    const doInscribeButton = document.getElementById("doInscribe");
    if (doInscribeButton) {
      doInscribeButton.style.display = "inline-block";
      console.log('doInscribe button displayed.');
    } else {
      console.warn('doInscribe button not found in the DOM.');
    }

    console.log('=== StartInscriptionProcess Completed Successfully ===');
  } catch (error) {
    console.error('=== Error in StartInscriptionProcess ===');
    console.error(error);

    // Optionally, display an error message to the user
    alert(`Inscription process failed: ${error.message}`);
  }
}