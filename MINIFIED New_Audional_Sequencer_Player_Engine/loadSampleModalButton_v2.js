window.setupLoadSampleModalButton(e,t);{const n=e.querySelector(".load-sample-button");n.textContent=window.unifiedSequencerSettings.settings.masterSettings.channelURLs[t],updateModalButtonText(n,t),openModal(t,n)}function openModal(e,t){const n=createModal(),o=createModalContent();n.appendChild(o),o.appendChild(createTextParagraph("Enter an Ordinal ID to load a Bitcoin Audional:"));const a=createInputField("Enter ORD ID:");o.appendChild(a),o.appendChild(createTextParagraph("Or, enter an IPFS ID for an off-chain Audional:"));const d=createInputField("Enter IPFS ID:");o.appendChild(d),addInputListeners(a,d),o.appendChild(createButton("Load Sample ID",(()=>handleLoad(e,a,d,n,t)),"loadButton","Load Audio from ID")),o.appendChild(createButton("Cancel",(()=>document.body.removeChild(n)),"cancelButton","Close this window"));const l=createExternalLinkButton("Search Ordinal Audio Files","https://ordinals.hiro.so/inscriptions?f=audio&s=genesis_block_height&o=asc","searchButton","Search for audio files (Copy and paste the Ordinal ID to load a sample");o.appendChild(l),document.body.appendChild(n)}function createModal(){const e=document.createElement("div");return e.className="loadSampleModalButton",e}function createModalContent(){const e=document.createElement("div");return e.className="loadSampleModalButton-content",e}function updateModalButtonText(e,t){const n=window.unifiedSequencerSettings.settings.masterSettings.projectChannelNames[t];e.textContent=n||`Load new audience (${t})`}function createTextParagraph(e){const t=document.createElement("p");return t.textContent=e,t.className="loadSampleModalButton-text",t}function createInputField(e){const t=document.createElement("input");return t.type="text",t.placeholder=e,t.className="loadSampleModalButton-input",t}function addInputListeners(e,t){e.addEventListener("input",(()=>{t.disabled=!!e.value})),t.addEventListener("input",(()=>{e.disabled=!!t.value}))}function createButton(e,t,n,o){const a=document.createElement("div");a.className="tooltip";const d=document.createElement("button");d.textContent=e,d.addEventListener("click",t),d.className=n,a.appendChild(d);const l=document.createElement("span");return l.className="tooltiptext",l.textContent=o,a.appendChild(l),a}function handleLoad(e,t,n,o,a){let d;if(console.log(`[HTML Debugging] [handleLoad] Called with index: ${e}`),t.value)d="https://ordinals.com/content/"+t.value;else{if(!n.value)return void console.log("[HTML Debugging] [handleLoad] No input value found.");d="https://ipfs.io/ipfs/"+n.value}d=formatURL(d),fetchAudio(d,e).then((()=>{console.log(`[HTML Debugging] [handleLoad] Audio loaded for channel ${e}: ${d}`),window.unifiedSequencerSettings.addChannelURL(e,d)})).catch((e=>{console.error(`[HTML Debugging] [handleLoad] Error loading audio for URL ${d}:`,e)})),document.body.removeChild(o),console.log(`[HTML Debugging] [handleLoad] Modal removed for channel ${e}`)}function createExternalLinkButton(e,t,n,o){const a=document.createElement("div");a.className="tooltip";const d=document.createElement("button");d.textContent=e,d.className=n,d.addEventListener("click",(()=>window.open(t,"_blank"))),a.appendChild(d);const l=document.createElement("span");return l.className="tooltiptext",l.textContent=o,a.appendChild(l),a}export{setupLoadSampleModalButton};