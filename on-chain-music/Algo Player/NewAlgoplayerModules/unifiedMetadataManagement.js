// unifiedMetadataManagement.js
(()=>{const t=t=>t?.match(/Song\s+\d+:\s+(.+)/)?.[1]?.trim()||"UNKNOWN PROJECT NAME",a=(t,a,e)=>a?.[t]||e||"Unknown Artist Name",e=e=>{if(!Array.isArray(e)||!e.length)return void console.warn("No songs data available to process.");const n=(e=>{const n=window.globalData?.projectArtistMap||window.projectArtistMap||{};return e.map(((e,o)=>({trackNumber:o+1,projectName:t(e.id),artistName:a(t(e.id),n,e.artist)})))})(e);(t=>{const a=document.getElementById("metadataContent");if(!a)return console.warn("Metadata content container (#metadataContent) not found.");a.innerHTML=t.map((({trackNumber:t,projectName:a,artistName:e})=>`<div class="metadataItem"><h2>${t}. ${a}</h2><p>${e}</p></div>`)).join("")})(n),(t=>{t.forEach((({projectName:t,artistName:a})=>console.log(`Project Name: ${t}, Artist Name: ${a}`)))})(n)},n=()=>{window.globalData?.songsArray?.length?e(window.globalData.songsArray):document.addEventListener("dataLoadingComplete",(({detail:{songs:t}={}})=>e(t))),document.addEventListener("keydown",(({key:t})=>{"t"===t.toLowerCase()&&(()=>{const t=document.getElementById("trackListingPanel");t?t.classList.toggle("visible"):console.warn("Metadata panel container (#trackListingPanel) not found.")})()}))};try{n()}catch(t){console.error("Error initializing Metadata Management and Logging:",t)}})();