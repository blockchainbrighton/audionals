const BASE_URL = "https://audionals-api.jim-2ac.workers.dev";
let apiKey = "honey-pot";
let feeRates = {};
let calculatedFee = {};
let inscriptionPreviewData = {};

// Function to fetch the API key from the server
async function getApiKey() {
  try {
    const response = await fetch("/api-key");
    const data = await response.json();
    apiKey = data.apiKey;
  } catch (error) {
    displayResponse("Error fetching API key.");
  }
}

// getApiKey(); // Fetch API key initially

async function makeRequest(method, url, headers, body) {
  try {
    const response = await fetch(url, { method, headers, body });
    return await response.json();
  } catch (error) {
    displayResponse("An error occurred.");
  }
}

async function getRecommendedNetworkFeeRates() {
  const requestUrl = `${BASE_URL}/network_fee_rates`;
  var data = await makeRequest("GET", requestUrl, { "x-api-key": apiKey }).then(
    (data) => {
      feeRates = data;
      return feeRates;
      // displayResponse(feeRates);
    }
  );
  return data;
}

function calculateInscriptionRequestFee() {
  const file = document.getElementById("fileInput").files[0];
  const file_size_bytes = file.size;
  const network_fee_rate = feeRates.normal_fee_rate;

  const requestUrl = `${BASE_URL}/calculate_fee?network_fee_rate=${network_fee_rate}&file_size_bytes=${file_size_bytes}`;

  makeRequest("GET", requestUrl, { "x-api-key": apiKey }).then((data) => {
    calculatedFee = data.summary;
    displayResponse(calculatedFee);
    document.getElementById("expectedFee").innerHTML =
      calculatedFee.total_fee_sats;
  });
}

/**
 * Sends a request to the /preview endpoint of the Worker to get inscription preview data.
 *
 * @param {Object} audionalJsonObject - The JSON object to be inscribed.
 * @returns {Promise<Object>} - The inscription preview data.
 */
async function getInscriptionPreview(audionalJsonObject) {
  try {
    console.log('Sending request to /preview endpoint with:', audionalJsonObject);
    const formData = new FormData();
    formData.append('json', JSON.stringify(audionalJsonObject));
    formData.append('keep_high_res', 'true');

    const response = await fetch('https://audionals-api.jim-2ac.workers.dev/preview', {
      method: 'POST',
      body: formData,
      // No custom headers needed; 'Content-Type' is automatically set for FormData
    });

    console.log('Received response from /preview:', response);

    const data = await response.json();
    console.log('Parsed JSON from /preview response:', data);

    if (!response.ok) {
      console.error('Error response from /preview:', data);
      throw new Error(data.error || 'Unknown error from /preview');
    }

    return data;
  } catch (error) {
    console.error('Error in getInscriptionPreview:', error);
    throw error; // Propagate the error to be handled by the caller
  }
}

async function requestInscription(inscriptionObject) {
  const binaryString = JSON.stringify(inscriptionObject.file);
  // const file = new Blob([binaryString], { type: "application/json" });
  //   const file = await fetch("/tiny.png").then((r) => r.blob());
  const keep_high_res = true;

  const formData = new FormData();
  formData.append(
    "btc_ordinal_recipient_address",
    inscriptionObject.btc_ordinal_recipient_address
  );
  formData.append(
    "btc_refund_recipient_address",
    inscriptionObject.btc_ordinal_recipient_address
  );
  formData.append(
    "expected_total_fee_sats",
    inscriptionObject.expected_total_fee_sats
  );
  formData.append("json", binaryString);
  formData.append("keep_high_res", keep_high_res);
  formData.append("network_fee_rate", inscriptionObject.network_fee_rate);
  formData.append("submitter_email_address", "jim@jim.com");

  const requestUrl = `${BASE_URL}/requests`;

  var data = await makeRequest(
    "POST",
    requestUrl,
    { "x-api-key": apiKey },
    formData
  ).then((data) => {
    return data;
  });
  return data;
}

function displayResponse(response) {
  const responseContainer = document.getElementById("response");
  responseContainer.innerHTML = JSON.stringify(response, null, 2);
}
