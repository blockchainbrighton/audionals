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

// REPLACE WITH THE ACTUAL NARCOTIX CONTRACT ADDRESS
// Format: SP...contract-name
// Example: 'SP2KAF9RF86JMX6LAYAZ7XUE0SEPC1LS6CT97AR50.narcotix'
const NARCOTIX_CONTRACT = 'SP2KAF9RF86JMX6LAYAZ7XUE0SEPC1LS6CT97AR50.narcotix'; 

// --- 4. DOM ELEMENTS ---
const connectBtn = document.getElementById('connect-wallet-btn');
const signOutBtn = document.getElementById('sign-out-btn');
const loggedOutView = document.getElementById('logged-out-view');
const loggedInView = document.getElementById('logged-in-view');
const addressDisplay = document.getElementById('user-address-display');
const nftList = document.getElementById('nft-list');
const gameMsg = document.getElementById('game-access-msg');
const loadingMsg = document.getElementById('loading-msg');

// --- 5. INITIALIZATION ---
if (userSession.isUserSignedIn()) {
  showDashboard();
} else if (userSession.isSignInPending()) {
  userSession.handlePendingSignIn().then(() => showDashboard());
}

// --- 6. BUTTON LISTENERS ---
if (connectBtn) {
  connectBtn.addEventListener('click', () => {
    if (showConnect) {
      showConnect({
        appDetails: {
          name: 'Narcotix Access',
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

// --- 7. LOGIC ---
function showDashboard() {
  const userData = userSession.loadUserData();
  const address = userData.profile.stxAddress.mainnet;

  // Toggle UI
  loggedOutView.classList.add('hidden');
  loggedInView.classList.remove('hidden');
  addressDisplay.textContent = `${address.slice(0, 4)}...${address.slice(-4)}`;

  // Update Status Header
  gameMsg.textContent = "Scanning for Narcotix...";
  gameMsg.className = "status";

  // Check for NFTs
  fetchAllHoldings(address);
}

async function fetchAllHoldings(address) {
  // Use the mainnet Hiro API to fetch ALL holdings
  const apiURL = `https://api.mainnet.hiro.so/extended/v1/tokens/nft/holdings?principal=${address}&limit=200`;

  console.log("Fetching all NFT holdings from:", apiURL);

  try {
    const response = await fetch(apiURL);
    if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
    }

    const data = await response.json();
    const allHoldings = data.results;

    // Filter for Narcotix only
    const narcotixHoldings = allHoldings.filter(nft => 
      nft.asset_identifier.startsWith(NARCOTIX_CONTRACT)
    );

    loadingMsg.classList.add('hidden');
    nftList.innerHTML = ''; 

    if (!narcotixHoldings || narcotixHoldings.length === 0) {
      nftList.innerHTML = '<p class="fail">ACCESS DENIED: No Narcotix Tokens Found.</p>';
      return;
    }

    // Display Count
    const countDiv = document.createElement('div');
    countDiv.style.marginBottom = '15px';
    countDiv.style.color = '#0f0';
    countDiv.innerHTML = `<strong>ACCESS GRANTED: ${narcotixHoldings.length} Token(s) Found</strong>`;
    nftList.appendChild(countDiv);

    // Render Items (Just IDs)
    const listContainer = document.createElement('div');
    listContainer.className = 'token-grid';
    
    narcotixHoldings.forEach(nft => {
      // Format: address.contract-name::asset-name
      // We just want the ID (repr)
      const id = nft.value.repr.replace('u', '#'); // Remove 'u' prefix usually found in Stacks uints

      const div = document.createElement('div');
      div.className = 'token-item';
      div.innerText = id;
      listContainer.appendChild(div);
    });
    
    nftList.appendChild(listContainer);

  } catch (error) {
    console.error("Fetch error:", error);
    loadingMsg.textContent = "SYSTEM ERROR: DATA FETCH FAILED";
    loadingMsg.classList.remove('hidden');
    loadingMsg.style.color = 'red';
  }
}