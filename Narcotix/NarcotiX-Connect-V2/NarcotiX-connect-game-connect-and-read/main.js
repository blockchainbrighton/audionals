// --- 1. GLOBAL POLYFILLS (MUST BE AT THE VERY TOP) ---
import { Buffer } from 'buffer';
window.Buffer = window.Buffer || Buffer;
window.process = window.process || { env: {} };

// --- 2. IMPORTS ---
import * as StacksConnect from '@stacks/connect';
import { AppConfig, UserSession } from '@stacks/auth';

// Fallback logic to find the connection function
const showConnect = StacksConnect.showConnect || StacksConnect.authenticate;

// --- 3. CONFIGURATION ---
const appConfig = new AppConfig(['store_write', 'publish_data']);
const userSession = new UserSession({ appConfig });

// --- 4. DOM ELEMENTS ---
const connectBtn = document.getElementById('connect-wallet-btn');
const signOutBtn = document.getElementById('sign-out-btn');
const loggedOutView = document.getElementById('logged-out-view');
const loggedInView = document.getElementById('logged-in-view');
const addressDisplay = document.getElementById('user-address-display');
const nftList = document.getElementById('nft-list');
const narcotixContainer = document.getElementById('narcotix-container');
const narcotixList = document.getElementById('narcotix-list');
const gameMsg = document.getElementById('game-access-msg');
const loadingMsg = document.getElementById('loading-msg');

// --- 5. CONSTANTS ---
const NARCOTIX_CONTRACT = 'SP8HMQP4Q63V3E6SXXPXZ4WJXA263HBD95QY2AM3.narcotix';

// --- 6. INITIALIZATION ---
if (userSession.isUserSignedIn()) {
  showDashboard();
} else if (userSession.isSignInPending()) {
  userSession.handlePendingSignIn().then(() => showDashboard());
}

// --- 7. BUTTON LISTENERS ---
if (connectBtn) {
  connectBtn.addEventListener('click', () => {
    if (showConnect) {
      showConnect({
        appDetails: {
          name: 'My NFT Game',
          icon: window.location.origin + '/favicon.ico',
        },
        redirectTo: '/',
        onFinish: () => {
          window.location.reload();
        },
        userSession,
      });
    } else {
      console.error("Wallet connection function not found.");
      alert("Error: Wallet connection function not found.");
    }
  });
}

if (signOutBtn) {
  signOutBtn.addEventListener('click', () => {
    userSession.signUserOut();
    window.location.reload();
  });
}

// --- 8. LOGIC ---
function showDashboard() {
  const userData = userSession.loadUserData();
  const address = userData.profile.stxAddress.mainnet;

  // Toggle UI
  loggedOutView.classList.add('hidden');
  loggedInView.classList.remove('hidden');
  addressDisplay.textContent = `${address.slice(0, 4)}...${address.slice(-4)}`;

  // Update Status Header
  gameMsg.textContent = "Your Wallet Holdings";
  gameMsg.className = "status";

  // Check for NFTs
  fetchAllHoldings(address);
}

async function fetchAllHoldings(address) {
  // Use the mainnet Hiro API to fetch ALL holdings, similar to the simple viewer
  const apiURL = `https://api.mainnet.hiro.so/extended/v1/tokens/nft/holdings?principal=${address}&limit=50`;

  console.log("Fetching all NFT holdings from:", apiURL);

  try {
    const response = await fetch(apiURL);
    if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
    }

    const data = await response.json();
    const holdings = data.results;

    loadingMsg.classList.add('hidden');
    nftList.innerHTML = ''; 
    narcotixList.innerHTML = '';
    narcotixContainer.classList.add('hidden');

    if (!holdings || holdings.length === 0) {
      nftList.innerHTML = '<p>No NFTs found on this address.</p>';
      return;
    }

    // Display Count
    const countDiv = document.createElement('div');
    countDiv.style.marginBottom = '15px';
    countDiv.innerHTML = `<strong>Found ${data.total} NFT(s)</strong> (Showing top 50)`;
    nftList.appendChild(countDiv);

    // Render Items
    holdings.forEach(nft => {
      // Parse asset identifier
      // Format: address.contract-name::asset-name
      const fullIdentifier = nft.asset_identifier;
      const parts = fullIdentifier.split('::');
      const collectionName = parts[1] || 'Unknown Collection';
      const contractAddress = parts[0];
      const id = nft.value.repr; 

      // Create Element for General List
      const div = document.createElement('div');
      div.className = 'nft-item';
      div.innerHTML = `
        <div style="font-weight: bold; color: #fff;">${collectionName}</div>
        <div style="font-size: 0.9em; margin-top: 5px;">Token ID: <strong>${id}</strong></div>
        <div style="font-size: 0.7em; color: #aaa; margin-top: 5px; word-break: break-all;">${contractAddress}</div>
      `;
      nftList.appendChild(div);

      // CHECK FOR NARCOTIX
      if (contractAddress === NARCOTIX_CONTRACT) {
        // Show container
        narcotixContainer.classList.remove('hidden');
        
        // Clone for special list (or create new with specific style)
        const specialDiv = div.cloneNode(true);
        specialDiv.style.border = "1px solid #5546FF"; // Highlight it
        narcotixList.appendChild(specialDiv);
      }
    });

  } catch (error) {
    console.error("Fetch error:", error);
    loadingMsg.textContent = "Error fetching data. Check console.";
    loadingMsg.classList.remove('hidden');
  }
}