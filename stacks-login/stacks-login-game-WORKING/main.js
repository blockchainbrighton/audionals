// --- 1. GLOBAL POLYFILLS (MUST BE AT THE VERY TOP) ---
import { Buffer } from 'buffer';
window.Buffer = window.Buffer || Buffer;
window.process = window.process || { env: {} };

// TEMPORARY: Clear localStorage to ensure clean state after import fixes.
// TODO: Remove this line after successful connection.
// console.warn("CLEARING LOCAL STORAGE to reset session state...");
// localStorage.clear();

// --- 2. IMPORTS ---
import * as StacksConnect from '@stacks/connect';
import { AppConfig, UserSession } from '@stacks/auth';

console.log("--- DEBUG: StacksConnect Module ---");
console.log("Keys:", Object.keys(StacksConnect));
console.log("Module:", StacksConnect);

// Fallback logic to find the connection function
const showConnect = StacksConnect.showConnect || StacksConnect.authenticate;

console.log("Resolved showConnect function:", showConnect);
console.log("-----------------------------------");

// --- 3. CONFIGURATION ---
// REPLACE THIS with your actual NFT Contract ID
const MY_NFT_CONTRACT = 'SP2KAF9RF86J957TC697NM90D2A430363442436C.bitcoin-monkeys'; 

const appConfig = new AppConfig(['store_write', 'publish_data']);
const userSession = new UserSession({ appConfig });

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
console.log("Checking user session...");
try {
  if (userSession.isUserSignedIn()) {
    console.log("User is signed in.");
    showDashboard();
  } else if (userSession.isSignInPending()) {
    console.log("Sign-in pending...");
    userSession.handlePendingSignIn().then(() => {
      console.log("Pending sign-in handled.");
      showDashboard()
    });
  } else {
    console.log("User is not signed in.");
  }
} catch (e) {
  console.error("Initialization error:", e);
}

// --- 6. BUTTON LISTENERS ---
if (connectBtn) {
  connectBtn.addEventListener('click', () => {
    console.log("Connect Wallet button clicked.");
    if (showConnect) {
        try {
          console.log("Calling showConnect/authenticate...");
          showConnect({
            appDetails: {
              name: 'My NFT Game',
              icon: window.location.origin + '/favicon.ico',
            },
            redirectTo: '/',
            onFinish: () => {
              console.log("Connection finished.");
              window.location.reload();
            },
            onCancel: () => {
              console.log("Connection cancelled by user.");
            },
            userSession,
          });
        } catch (error) {
          console.error("Error calling connection function:", error);
        }
    } else {
        console.error("CRITICAL: No connection function found (showConnect/authenticate).");
        alert("Wallet connection function not found. Check console.");
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

  // Check for NFTs
  checkHoldings(address);
}

async function checkHoldings(address) {
  const apiURL = `https://api.hiro.so/extended/v1/tokens/nft/holdings?principal=${address}&asset_identifiers=${MY_NFT_CONTRACT}`;

  try {
    const response = await fetch(apiURL);
    const data = await response.json();
    const holdings = data.results;

    loadingMsg.classList.add('hidden');

    if (holdings.length > 0) {
      // ACCESS GRANTED
      gameMsg.textContent = "ACCESS GRANTED: You own the required NFT.";
      gameMsg.className = "status success";

      nftList.innerHTML = ''; 
      holdings.forEach(nft => {
        const id = nft.value.repr; 
        const div = document.createElement('div');
        div.className = 'nft-item';
        div.innerHTML = `<span>Token ID: <strong>${id}</strong></span>`;
        nftList.appendChild(div);
      });

    } else {
      // ACCESS DENIED
      gameMsg.textContent = "ACCESS DENIED: You do not own the required NFT.";
      gameMsg.className = "status fail";
    }

  } catch (error) {
    console.error(error);
    loadingMsg.textContent = "Error fetching data.";
  }
}