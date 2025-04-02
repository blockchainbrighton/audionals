// dom-elements.js

// Get references to DOM elements - these will be used globally by other modules
const statusEl = document.getElementById('status');
const progressEl = document.getElementById('progress');
const convertBtn = document.getElementById('convertBtn');
const fileInput = document.getElementById('fileInput');
const resultEl = document.getElementById('result');
const formatRadios = document.querySelectorAll('input[name="format"]');
const mp3SettingsDiv = document.getElementById('mp3Settings');
const opusSettingsDiv = document.getElementById('opusSettings');
const mp3QualitySlider = document.getElementById('mp3Quality');
const mp3QualityValueSpan = document.getElementById('mp3QualityValue');
const opusBitrateSlider = document.getElementById('opusBitrate');
const opusBitrateValueSpan = document.getElementById('opusBitrateValue');
const estSizeMp3Span = document.getElementById('estSizeMp3');
const estSizeOpusSpan = document.getElementById('estSizeOpus');
const base64Container = document.getElementById('base64Container');
const base64Result = document.getElementById('base64Result');
const base64Output = document.getElementById('base64Output');
const copyBase64Btn = document.getElementById('copyBase64Btn');
const downloadBase64Btn = document.getElementById('downloadBase64Btn');
const playSampleBtn = document.getElementById('playSampleBtn');
const originalAudioContainer = document.getElementById('originalAudioContainer');