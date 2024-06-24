const https = require('https');
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const fetchAndExtractPako = (url, callback) => {
  https.get(url, res => {
    let data = '';
    res.on('data', chunk => {
      data += chunk;
    });
    res.on('end', () => {
      const scriptStart = data.indexOf('!function');
      const scriptEnd = data.indexOf('</script>', scriptStart);
      if (scriptStart === -1 || scriptEnd === -1) {
        console.error('Pako library script not found in the fetched content.');
        return;
      }
      const pakoScript = data.slice(scriptStart, scriptEnd).trim();

      // Execute the script in the current context and attach it to the global object
      vm.runInThisContext(pakoScript);
      global.pako = pako; // Assuming the script defines 'pako' globally

      console.log('Pako library is ready to be used in another program.');
      callback();
    });
  }).on('error', err => {
    console.error('Error fetching Pako library:', err);
  });
};

const url = 'https://ordinals.com/content/2109694f44c973892fb8152cf5c68607fb19288c045af1abc1716c1c3b4d69e6i0';

fetchAndExtractPako(url, () => {
  // Your code that uses the global 'pako' object can go here or in other files
});
