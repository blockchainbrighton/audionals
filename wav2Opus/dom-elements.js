// dom-elements.js

// Get references to DOM elements - these will be used globally by other modules
const statusEl = document.getElementById('status');
const progressEl = document.getElementById('progress');
const convertBtn = document.getElementById('convertBtn');
const fileInput = document.getElementById('fileInput');
const resultEl = document.getElementById('result');
const formatRadios = document.querySelectorAll('input[name="format"]');
const mp3SettingsDiv = document.getElementById('mp3Settings'); // Keep if logic might reuse
const opusSettingsDiv = document.getElementById('opusSettings'); // Reused for WebM
const mp3QualitySlider = document.getElementById('mp3Quality');
const mp3QualityValueSpan = document.getElementById('mp3QualityValue');
const opusBitrateSlider = document.getElementById('opusBitrate');   // Reused for WebM
const opusBitrateValueSpan = document.getElementById('opusBitrateValue'); // Reused for WebM
// New Opus controls
const opusVbrModeSelect = document.getElementById('opusVbrMode');
const opusCompressionLevelSlider = document.getElementById('opusCompressionLevel');
const opusCompressionLevelValueSpan = document.getElementById('opusCompressionLevelValue');
const opusApplicationSelect = document.getElementById('opusApplication');

const estSizeMp3Span = document.getElementById('estSizeMp3');
const estSizeOpusSpan = document.getElementById('estSizeOpus');
const estSizeWebmSpan = document.getElementById('estSizeWebm');
const base64Container = document.getElementById('base64Container'); // Audio Base64 Container
const base64Result = document.getElementById('base64Result');       // Audio Base64 Player/Info Area
const base64Output = document.getElementById('base64Output');       // Audio Base64 Output DIV
const copyBase64Btn = document.getElementById('copyBase64Btn');     // Audio Base64 Copy Button
const downloadBase64Btn = document.getElementById('downloadBase64Btn'); // Audio Base64 Download Button
const playSampleBtn = document.getElementById('playSampleBtn');
const originalAudioContainer = document.getElementById('originalAudioContainer');

// --- Elements for Info Popups ---
// const showInfoBtn = document.getElementById('showInfoBtn'); // REMOVED OLD
// const closeInfoBtn = document.querySelector('#audioInfoContainer .close-info-btn'); // REMOVED OLD (or update selector)

const showAudioInfoBtn = document.getElementById('showAudioInfoBtn'); // NEW
const audioInfoContainer = document.getElementById('audioInfoContainer');
const audioInfoContent = document.getElementById('audioInfoContent');
const closeAudioInfoBtn = document.getElementById('closeAudioInfoBtn'); // NEW (using specific ID)

const showAudionalInfoBtn = document.getElementById('showAudionalInfoBtn'); // NEW
const audionalInfoContainer = document.getElementById('audionalInfoContainer');
const audionalInfoContent = document.getElementById('audionalInfoContent'); // Refers to the div inside the new popup
const closeAudionalInfoBtn = document.getElementById('closeAudionalInfoBtn'); // NEW

// --- Elements for Metadata Modal (Example - ensure these match HTML) ---
const metadataModal = document.getElementById('metadataModal');
const cancelMetadataBtn = document.getElementById('cancelMetadataBtn');
const metadataForm = document.getElementById('metadataForm');
// Add others if needed (titleInput, noteInput, etc.)

// --- Elements for Image Converter (Optional but Recommended) ---
// These might be grabbed directly in image-to-base64.js, but defining them here is cleaner
const imageFileInput = document.getElementById('image-file-input');
const imagePreview = document.getElementById('image-preview');
const fileSizeInfo = document.getElementById('file-size-info');
const convertImageButton = document.getElementById('convert-image-button');
const imageBase64Output = document.getElementById('image-base64-output'); // Use new ID
const copyImageBase64Button = document.getElementById('copy-image-base64-button'); // Use new ID
const downloadImageBase64Button = document.getElementById('download-image-base64-button'); // Use new ID

// --- Generate Button ---
const generateOB1Button = document.getElementById('generateOB1Button');
