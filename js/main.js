import { audionalJsonTemplate } from "./audionalJson.js";
import { digestMessage } from "./digestMessage.js";
import { startInscriptionProcess } from "./startInscriptionProcess.js";
import { validateTaprootAddress } from "./validateTaprootAddress.js";

// Disable typing in the audio type input
var audioTypeInput = document.getElementById("audio_type");
audioTypeInput.addEventListener("keydown", function (e) {
  e.preventDefault();
});

// Store elements to avoid repeated DOM queries
const fileInput = document.getElementById("file");
const processButton = document.getElementById("process");
const convertButton = document.getElementById("convert");
const reminder = document.getElementById("reminder");
const audionalJsonTextarea = document.getElementById("audional-json");
// const startInscriptionProcessButton = document.getElementById(
//   "startInscriptionProcess"
// );
const inscriptionPreviewContainer = document.getElementById(
  "inscriptionPreviewContainer"
);
const estimatedFeesSpan = document.getElementById("estimatedFees");
const networkFeeRateSpan = document.getElementById("networkFeeRate");
const recipientAddress = document.getElementById("ordinalRecipientAddress");
const invoiceAddress = document.getElementById("invoiceAddress");
const invoiceAmount = document.getElementById("invoiceAmount");
const inscriptionInvoiceContainer = document.getElementById(
  "inscriptionInvoiceContainer"
);
const inscriptionRequestId = document.getElementById("inscriptionRequestId");

// Error container for user-friendly error messages
const errorContainer = document.createElement("div");
errorContainer.id = "error-container";
document.body.appendChild(errorContainer);

// Main code
var audioContext = new (window.AudioContext || window.webkitAudioContext)();

// Make the fileInput button flash when the page loads
fileInput.classList.add("flashing");

fileInput.addEventListener("change", function () {
  var file = fileInput.files[0];
  if (file) {
    var fileType = file.name.split(".").pop();
    if (fileType !== "mp3" && fileType !== "wav") {
      errorContainer.innerHTML =
        "Invalid file type. Please select a .mp3 or .wav file.";
      fileInput.value = ""; // Clear the input.
      return;
    }
  }
  // Remove the flashing class from the file input field
  fileInput.classList.remove("flashing");
  fileInput.style.backgroundColor = "green";

  // Reset the process button to its original state
  processButton.innerText = "Process Audio File";
  processButton.disabled = false;
  processButton.classList.add("flashing");

  // Reset the audio type input
  audioTypeInput.value = "";

  // Disable the convert button
  convertButton.innerText = "Generate Audional JSON";
  convertButton.disabled = true;
  convertButton.classList.remove("flashing");
  convertButton.style.backgroundColor = "grey";
});

processButton.addEventListener("click", function () {
  document.getElementById("reminder").style.color = "red";

  if (!audioTypeInput.value) {
    document.getElementById("reminder").innerText =
      "Please select the Audio Type and fill any other relevant fields before creating your Audional file!";
    convertButton.disabled = true;
  } else {
    document.getElementById("reminder").innerText =
      "Have you filled as many of the fields above as you can?\nMore detail equals better indexing which equals more users finding your samples!\nIf yes, go ahead and:";
    convertButton.disabled = false;
    convertButton.classList.add("flashing");
  }

  // Handle button flashing
  convertButton.addEventListener("animationiteration", function () {
    convertButton.style.backgroundColor =
      convertButton.style.backgroundColor === "red" ? "" : "red";
  });

  audioTypeInput.addEventListener("input", function () {
    if (audioTypeInput.value) {
      document.getElementById("reminder").innerText =
        "Have you filled as many of the fields above as you can?\nMore detail equals better indexing which equals more users finding your samples!\nIf yes, go ahead and:";
      convertButton.disabled = false;
      convertButton.classList.add("flashing");
    }
  });

  var file = fileInput.files[0];
  if (!file) {
    alert("Please select a file.");
    return;
  }

  var reader = new FileReader();
  reader.onload = function (e) {
    var audioData = e.target.result;

    audioContext.decodeAudioData(audioData, function (buffer) {
      var duration = buffer.duration;

      fileInput.sampleRate = buffer.sampleRate;
      fileInput.numberOfChannels = buffer.numberOfChannels;

      document.getElementById("duration").value = duration.toFixed(3);
      document.getElementById("fileName").value = file.name;

      processButton.classList.remove("flashing");
      processButton.style.backgroundColor = "green";
      processButton.innerText = "File Processed";
      convertButton.disabled = false;
      convertButton.classList.add("flashing");

      document.getElementById("fileName").readOnly = true;
      document.getElementById("duration").readOnly = true;

      document.getElementById("reminder").style.color = "red"; // added this line
    });
  };
  reader.onerror = function () {
    alert("Error reading file");
  };
  reader.readAsArrayBuffer(file);
});

convertButton.addEventListener("click", function () {
  var audioTypeInput = document.getElementById("audio_type");
  var fileInput = document.getElementById("file");
  var instrumentInput = document.getElementById("instrument");
  var instrumentSpecificsInput = document.getElementById(
    "instrument_specifics"
  );
  var genreInput = document.getElementById("genre");
  var keyInput = document.getElementById("key");
  var bpmInput = document.getElementById("bpm");
  var userDefinedInput = document.getElementById("user-defined");
  var noteInput = document.getElementById("note");
  var isLoopRadio = document.querySelector('input[name="isLoop"]:checked');
  var isLoop = isLoopRadio ? isLoopRadio.value.toLowerCase() === "yes" : false;

  var reader = new FileReader();
  reader.onload = function (e) {
    var audioData = e.target.result;

    audioContext.decodeAudioData(audioData, function (buffer) {
      var duration = buffer.duration;

      fileInput.sampleRate = buffer.sampleRate;
      fileInput.numberOfChannels = buffer.numberOfChannels;

      document.getElementById("duration").value = duration.toFixed(3);
      document.getElementById("fileName").value = file.name;

      processButton.classList.remove("flashing");
      processButton.style.backgroundColor = "green";
      processButton.innerText = "File Processed";
      convertButton.disabled = false;
      convertButton.classList.add("flashing");

      document.getElementById("fileName").readOnly = true;
      document.getElementById("duration").readOnly = true;

      document.getElementById("reminder").style.color = "red";
    });
  };
  reader.onerror = function () {
    alert("Error reading file");
  };
  // reader.readAsArrayBuffer(file);
});

convertButton.addEventListener("click", function () {
  var audioTypeInput = document.getElementById("audio_type");
  var audioType = audioTypeInput.value ? audioTypeInput.value : "None given";
  if (!audioTypeInput.value) {
    alert(
      "Please select the Audio Type and add details to other fields if known."
    );
    return;
  }

  // hide step1 and show step2

  document.getElementById("step1").style.display = "none";
  document.getElementById("step2").style.display = "block";

  const checkPriceButton = document.getElementById("checkPrice");
  checkPriceButton.addEventListener("click", () => {
    showPaymentDetails();
  });

  const doInscribe = document.getElementById("doInscribe");
  doInscribe.addEventListener("click", async () => {
    await doInscribeFunction();
  });

  var fileInput = document.getElementById("file");
  var instrumentInput = document.getElementById("instrument");
  var instrumentSpecificsInput = document.getElementById(
    "instrument_specifics"
  );
  var genreInput = document.getElementById("genre");
  var keyInput = document.getElementById("key");
  var bpmInput = document.getElementById("bpm");
  var userDefinedInput = document.getElementById("user-defined");
  var noteInput = document.getElementById("note");
  var creatorInput = document.getElementById("creator"); // Make sure this input exists in your HTML

  var file = fileInput.files.length > 0 ? fileInput.files[0] : "None given";
  var instrument = instrumentInput.value ? instrumentInput.value : "None given";
  var instrumentSpecifics = instrumentSpecificsInput.value
    ? instrumentSpecificsInput.value
    : "None given";
  var genre = genreInput.value ? genreInput.value : "None given";
  var key = keyInput.value ? keyInput.value : "None given";
  var bpm = bpmInput.value ? bpmInput.value : "None given";
  var userDefined = userDefinedInput.value
    ? userDefinedInput.value
    : "None given";
  var note = noteInput.value ? noteInput.value : "None given";
  var creator = creatorInput.value ? creatorInput.value : "None given";

  var isLoopRadio = document.querySelector('input[name="isLoop"]:checked');
  var isLoop = isLoopRadio ? isLoopRadio.value.toLowerCase() === "yes" : false;

  var file = fileInput.files[0];
  if (!file) {
    alert("Please select a file.");
    return;
  }

  var reader = new FileReader();
  reader.onload = async function (e) {
    var base64Audio = e.target.result;

    var filenameWithoutExtension = file.name.replace(/\.[^/.]+$/, "");

    var duration = parseFloat(document.getElementById("duration").value);
    var bpm = parseFloat(bpmInput.value);
    var loopGap;
    if (bpm) {
      var beatsPerSecond = bpm / 60;
      var beatsInDuration = duration * beatsPerSecond;

      loopGap = Math.max(1, Math.round(beatsInDuration));
    } else {
      loopGap = duration * 2;
    }
    // Calculate the loop BPM
    var loopBPM;
    if (duration) {
      loopBPM = 60 / duration;
    }

    var hash = await digestMessage(base64Audio);

    var audionalJson = audionalJsonTemplate(
      hash,
      file,
      base64Audio,
      fileInput,
      filenameWithoutExtension,
      creator,
      audioType,
      instrument,
      instrumentSpecifics,
      genre,
      key,
      userDefined,
      note,
      isLoop,
      loopGap,
      loopBPM
    );

    var audionalJsonString = JSON.stringify(audionalJson, null, 2);
    var audionalJsonBlob = new Blob([audionalJsonString], {
      type: "application/json",
    });
    var audionalJsonUrl = URL.createObjectURL(audionalJsonBlob);

    convertButton.classList.remove("flashing");
    convertButton.style.backgroundColor = "green";
    convertButton.innerText = "Audional JSON Created";
    document.getElementById("reminder").style.color = "grey";

    // set audionalJsonTextarea to dataStr
    audionalJsonTextarea.value = audionalJsonString;
    // show audionalJsonTextarea
    audionalJsonTextarea.style.display = "block";

    // show startInscriptionProcessButton
    // startInscriptionProcessButton.style.display = "inline";
    // // enable startInscriptionProcessButton
    // startInscriptionProcessButton.disabled = false;
  };

  reader.onerror = function () {
    alert("Error reading file");
  };

  reader.readAsDataURL(file);
});

// Start Inscription Process
// startInscriptionProcessButton.addEventListener("click", async function () {
//   startInscriptionProcess(
//     audionalJsonTextarea,
//     inscriptionPreviewContainer,
//     estimatedFeesSpan,
//     networkFeeRateSpan
//   );
// });

async function doInscribeFunction() {
  // get recipientAddress and verify it starts with bc1
  const recipientAddressValue = recipientAddress.value;
  if (!validateTaprootAddress(recipientAddressValue)) {
    alert("Recipient Address must be a taproot address.");
    return;
  }

  var audionalJsonObject = JSON.parse(audionalJsonTextarea.value);

  const inscriptionRequest = {
    btc_ordinal_recipient_address: recipientAddressValue,
    btc_refund_recipient_address: "",
    expected_total_fee_sats: estimatedFeesSpan.value,
    file: audionalJsonObject,
    keep_high_res: true,
    network_fee_rate: networkFeeRateSpan.value,
    submitter_email_address: "",
  };
  const inscriptionRequestResults = await requestInscription(
    inscriptionRequest
  );

  // show inscriptionInvoiceContainer
  inscriptionInvoiceContainer.style.display = "block";

  generateBitcoinPaymentQRCode(
    inscriptionRequestResults.btc_deposit_address,
    inscriptionRequestResults.total_request_fee_sats
  );
  // update the input invoiceAmount with inscriptionRequestResults.total_request_fee_sats
  invoiceAddress.value = inscriptionRequestResults.btc_deposit_address;
  // update the input invoiceAddress with inscriptionRequestResults.btc_deposit_address
  invoiceAmount.value = inscriptionRequestResults.total_request_fee_sats;
  inscriptionRequestId.value = inscriptionRequestResults.id;
}

function generateBitcoinPaymentQRCode(
  btc_deposit_address,
  total_request_fee_sats
) {
  // Convert Satoshi to Bitcoin
  const satToBtc = total_request_fee_sats / 1e8;

  // Construct Bitcoin URI
  const paymentURI = `bitcoin:${btc_deposit_address}?amount=${satToBtc}&label=${encodeURIComponent(
    "Audionals.com"
  )}`;

  // Clear previous QR Code
  document.getElementById("qrcode").innerHTML = "";

  // Generate new QR Code
  new QRCode(document.getElementById("qrcode"), {
    text: paymentURI,
    width: 128,
    height: 128,
    colorDark: "#000000",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H,
  });
}

// Define these values globally or within your class/component scope
let inscriptionCost = null;
let currentFeeRates = null;

// on checkPrice button click run showPaymentDetails
function showPaymentDetails() {
  // Retrieve the Audional Ordinal Recipient Address
  const recipientAddress = document
    .getElementById("bitcoinAddress")
    .value.trim();

  // Check if the recipient address is valid
  if (!isValidRecipientAddress(recipientAddress)) {
    alert("Please enter a valid recipient's address.");
    return;
  }

  // Show loading state
  const inscriptionButton = document.getElementById("inscribe");
  inscriptionButton.disabled = true;
  inscriptionButton.classList.remove("custom-gold-button");

  // Simulate asynchronous data retrieval
  setTimeout(function () {
    // Retrieve the current fee rates, inscription cost, and Bitcoin payment address
    // Now we use actual values from `startInscriptionProcess`
    const paymentAddress = getPaymentAddress(); // Replace this with your own logic to get the payment address

    // Create and populate the text nodes for displaying the information
    const feeRatesTextNode = document.createTextNode(
      "Current Fee Rates: " + currentFeeRates
    );
    const inscriptionCostTextNode = document.createTextNode(
      "Inscription Cost: " + inscriptionCost
    );
    const paymentAddressTextNode = document.createTextNode(
      "Payment Address: " + paymentAddress
    );

    // Clear the current content and append the text nodes
    const userDefinedRight = document.getElementById("user-defined-right");
    userDefinedRight.innerHTML = ""; // Clear the current content

    const feeRatesInput = document.createElement("div");
    feeRatesInput.className = "payment-input";
    feeRatesInput.appendChild(feeRatesTextNode);
    userDefinedRight.appendChild(feeRatesInput);

    const inscriptionCostInput = document.createElement("div");
    inscriptionCostInput.className = "payment-input";
    inscriptionCostInput.appendChild(inscriptionCostTextNode);
    userDefinedRight.appendChild(inscriptionCostInput);

    const paymentAddressInput = document.createElement("div");
    paymentAddressInput.className = "payment-input";
    paymentAddressInput.appendChild(paymentAddressTextNode);
    userDefinedRight.appendChild(paymentAddressInput);

    // Enable and style the inscription button
    inscriptionButton.disabled = false;

    setTimeout(function () {
      inscriptionButton.classList.add("custom-gold-button", "enabled");
    }, 100); // Delay for button color change and shimmer effect
  }, 2000); // Simulated delay, replace with your data retrieval logic
}

function isValidRecipientAddress(address) {
  // Replace this with your own validation logic for the recipient's address
  // Return true if the address is valid, false otherwise
  return address.startsWith("bc1");
}

// Example functions to retrieve the fee rates, inscription cost, and payment address
function getCurrentFeeRates() {
  // Replace this with your own logic to retrieve the current fee rates
  return "15 Sat/vB";
}

function getInscriptionCost() {
  // Replace this with your own logic to retrieve the inscription cost
  return "15 Sat/vB * filesize";
}

function getPaymentAddress() {
  // Replace this with your own logic to retrieve the payment address
  return "1ABCxyz..."; // Example payment address
}

window.addEventListener("DOMContentLoaded", (event) => {
  fetch("Step-for-man_audional.json")
    .then((response) => response.json())
    .then((data) => {
      const textarea = document.getElementById("user-defined");
      textarea.placeholder = JSON.stringify(data, null, 2);
    })
    .catch((error) => console.error("Error:", error));
});

function toggleInfo(buttonId) {
  var audionalsButton = document.getElementById("audionals-button");
  var jsonButton = document.getElementById("check-order-button");

  var audionalsContent = document.getElementById("info-content-audionals");
  var jsonContent = document.getElementById("info-content-json");

  if (buttonId === "audionals") {
    var isAudionalsActive = audionalsButton.classList.contains("active");
    if (isAudionalsActive) {
      audionalsButton.classList.remove("active");
      audionalsContent.style.display = "none";
    } else {
      audionalsButton.classList.add("active");
      jsonButton.classList.remove("active");
      audionalsContent.style.display = "block";
      jsonContent.style.display = "none";
    }
  } else {
    var isJsonActive = jsonButton.classList.contains("active");
    if (isJsonActive) {
      jsonButton.classList.remove("active");
      jsonContent.style.display = "none";
    } else {
      jsonButton.classList.add("active");
      audionalsButton.classList.remove("active");
      audionalsContent.style.display = "none";
      jsonContent.style.display = "block";
    }
  }
}

function toggleDescription(buttonId) {
  var taprootButton = document.getElementById("metadata-button");
  var jsonButton = document.getElementById("check-order-button");

  var taprootContent = document.getElementById("info-content-taproot");
  var jsonContent = document.getElementById("info-content-json");

  if (buttonId === "taproot") {
    var isTaprootActive = taprootButton.classList.contains("active");
    if (isTaprootActive) {
      taprootButton.classList.remove("active");
      taprootContent.style.display = "none";
    } else {
      taprootButton.classList.add("active");
      jsonButton.classList.remove("active");
      taprootContent.style.display = "block";
      jsonContent.style.display = "none";
    }
  } else {
    var isJsonActive = jsonButton.classList.contains("active");
    if (isJsonActive) {
      jsonButton.classList.remove("active");
      jsonContent.style.display = "none";
    } else {
      jsonButton.classList.add("active");
      taprootButton.classList.remove("active");
      taprootContent.style.display = "none";
      jsonContent.style.display = "block";
    }
  }
}

// Set initial state
window.onload = function () {
  var audionalsButton = document.getElementById("audionals-button");
  var taprootButton = document.getElementById("metadata-button");
  var jsonButton = document.getElementById("check-order-button");

  var audionalsContent = document.getElementById("info-content-audionals");
  var taprootContent = document.getElementById("info-content-taproot");
  var jsonContent = document.getElementById("info-content-json");

  // Enable all buttons
  audionalsButton.disabled = false;
  taprootButton.disabled = false;
  jsonButton.disabled = false;

  // Show all content
  audionalsContent.style.display = "block";
  taprootContent.style.display = "block";
  jsonContent.style.display = "block";
};
