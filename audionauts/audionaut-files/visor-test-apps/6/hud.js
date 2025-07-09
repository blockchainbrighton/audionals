/**
 * B.A.M. HUD Programmer 2.0
 *
 * Main application logic. Imports asset data from the dedicated library
 * and manages the UI, state, playlist, and rendering.
 */

import { MEDIA_ASSETS } from './asset_library.js';

class HUDApp {
  // --- All methods from constructor() to savePlaylistToFile() are unchanged ---
  // --- The only changes are in the loadDefaultPlaylist() function below ---
  
  // (Methods from previous response are included here in a condensed format for completeness)
  constructor() { this.bindDOM(); this.initState(); this.bindEvents(); this.loadDefaultPlaylist(); }
  bindDOM() { this.dom={visorHud:document.getElementById("visorHud"),playBtn:document.getElementById("playBtn"),prevBtn:document.getElementById("prevBtn"),nextBtn:document.getElementById("nextBtn"),hudMode:document.getElementById("hudMode"),loopToggle:document.getElementById("loopToggle"),shuffleToggle:document.getElementById("shuffleToggle"),playlistDisplay:document.getElementById("playlist"),addSceneBtn:document.getElementById("addSceneBtn"),clearBtn:document.getElementById("clearBtn"),loadDefaultBtn:document.getElementById("loadDefaultBtn"),saveBtn:document.getElementById("saveBtn"),loadFileInput:document.getElementById("loadFileInput"),editorContainer:document.getElementById("editor-container"),sceneEditorTitle:document.getElementById("scene-editor-title"),sceneDurationInput:document.getElementById("sceneDurationInput"),sceneTransitionInput:document.getElementById("sceneTransitionInput"),layerList:document.getElementById("layer-list"),addLayerBtn:document.getElementById("addLayerBtn"),layerEditor:document.getElementById("layer-editor"),layerEditorTitle:document.getElementById("layer-editor-title"),layerType:document.getElementById("layerType"),layerContent:document.getElementById("layerContent"),layerX:document.getElementById("layerX"),layerXValue:document.getElementById("layerXValue"),layerY:document.getElementById("layerY"),layerYValue:document.getElementById("layerYValue"),layerW:document.getElementById("layerW"),layerWValue:document.getElementById("layerWValue"),layerH:document.getElementById("layerH"),layerHValue:document.getElementById("layerHValue"),layerAnimType:document.getElementById("layerAnimType"),layerAnimDir:document.getElementById("layerAnimDir"),layerAnimSpeed:document.getElementById("layerAnimSpeed"),layerAnimSpeedValue:document.getElementById("layerAnimSpeedValue"),layerFilterType:document.getElementById("layerFilterType"),layerFilterValue:document.getElementById("layerFilterValue"),layerFilterValueText:document.getElementById("layerFilterValueText")}}
  initState() {this.playlist=[],this.currentSceneIndex=-1,this.selectedSceneIndex=-1,this.selectedLayerIndex=-1,this.isPlaying=!1,this.isLooping=!0,this.isShuffling=!1,this.playTimeout=null,this.sceneCounter=0,this.layerCounter=0}
  bindEvents() {this.dom.playBtn.addEventListener("click",()=>this.togglePlay()),this.dom.nextBtn.addEventListener("click",()=>this.nextScene(!0)),this.dom.prevBtn.addEventListener("click",()=>this.prevScene()),this.dom.hudMode.addEventListener("change",e=>this.dom.visorHud.classList.toggle("mirrored","mirrored"===e.target.value)),this.dom.loopToggle.addEventListener("change",e=>this.isLooping=e.target.checked),this.dom.shuffleToggle.addEventListener("change",e=>this.isShuffling=e.target.checked),document.addEventListener("keydown",e=>{"INPUT"!==e.target.tagName&&"SELECT"!==e.target.tagName&&("Space"===e.code&&(e.preventDefault(),this.togglePlay()),"ArrowRight"===e.code&&this.nextScene(!0),"ArrowLeft"===e.code&&this.prevScene())}),this.dom.addSceneBtn.addEventListener("click",()=>this.addScene()),this.dom.clearBtn.addEventListener("click",()=>this.clearPlaylist()),this.dom.loadDefaultBtn.addEventListener("click",()=>this.loadDefaultPlaylist()),this.dom.saveBtn.addEventListener("click",()=>this.savePlaylistToFile()),this.dom.loadFileInput.addEventListener("change",e=>this.loadPlaylistFromFile(e)),this.dom.sceneDurationInput.addEventListener("input",e=>this.updateSceneProperty("duration",parseInt(e.target.value,10))),this.dom.sceneTransitionInput.addEventListener("change",e=>this.updateSceneProperty("transition",e.target.value)),this.dom.addLayerBtn.addEventListener("click",()=>this.addLayer());const e=[{el:this.dom.layerType,prop:"type"},{el:this.dom.layerContent,prop:"content"},{el:this.dom.layerX,prop:"x"},{el:this.dom.layerY,prop:"y"},{el:this.dom.layerW,prop:"width"},{el:this.dom.layerH,prop:"height"},{el:this.dom.layerAnimType,prop:"animType"},{el:this.dom.layerAnimDir,prop:"animDir"},{el:this.dom.layerAnimSpeed,prop:"animSpeed"},{el:this.dom.layerFilterType,prop:"filterType"},{el:this.dom.layerFilterValue,prop:"filterValue"}];e.forEach(({el:e,prop:t})=>{const i="range"===e.type?"input":"change";e.addEventListener(i,e=>this.updateLayerProperty(t,e.target.value))})}
  togglePlay() {this.isPlaying=!this.isPlaying,this.isPlaying?(this.currentSceneIndex===-1?this.nextScene():this.playCurrentScene(),this.dom.playBtn.textContent="Pause",this.dom.playBtn.classList.add("active")):(clearTimeout(this.playTimeout),this.dom.playBtn.textContent="Play",this.dom.playBtn.classList.remove("active"))}
  playCurrentScene() {if(!this.isPlaying||this.currentSceneIndex===-1)return;const e=this.playlist[this.currentSceneIndex];this.renderSceneToHUD(e),this.updatePlaylistUI(),clearTimeout(this.playTimeout),this.playTimeout=setTimeout(()=>{this.nextScene()},e.duration)}
  nextScene(e=!1) {if(0===this.playlist.length)return this.stop();this.currentSceneIndex!==-1&&this.transitionOutCurrentScene(),this.isShuffling&&!e?this.currentSceneIndex=Math.floor(Math.random()*this.playlist.length):this.currentSceneIndex++,this.currentSceneIndex>=this.playlist.length?(this.isLooping?this.currentSceneIndex=0:this.stop()):setTimeout(()=>this.playCurrentScene(),500)}
  prevScene() {if(0===this.playlist.length)return;this.currentSceneIndex--,this.currentSceneIndex<0&&(this.currentSceneIndex=this.playlist.length-1),this.playCurrentScene()}
  stop() {this.isPlaying=!1,this.currentSceneIndex=-1,clearTimeout(this.playTimeout),this.transitionOutCurrentScene(),this.dom.playBtn.textContent="Play",this.dom.playBtn.classList.remove("active"),this.updatePlaylistUI()}
  addScene() {this.sceneCounter++;const e={id:Date.now(),name:`Scene ${this.sceneCounter}`,duration:5e3,transition:"fade",layers:[]};this.playlist.push(e),this.selectScene(this.playlist.length-1)}
  removeScene(e) {this.playlist.splice(e,1),this.currentSceneIndex===e&&this.stop(),this.currentSceneIndex>e&&this.currentSceneIndex--,this.selectedSceneIndex===e&&this.hideEditors(),this.selectedSceneIndex>e&&this.selectedSceneIndex--,this.updatePlaylistUI()}
  addLayer() {if(this.selectedSceneIndex===-1)return;this.layerCounter++;const e={id:Date.now(),name:`Layer ${this.layerCounter}`,type:"text",content:"New Layer",x:50,y:50,width:80,height:20,animType:"none",animDir:"left",animSpeed:8,filterType:"none",filterValue:"100"};this.playlist[this.selectedSceneIndex].layers.push(e),this.selectLayer(this.playlist[this.selectedSceneIndex].layers.length-1)}
  removeLayer(e) {if(this.selectedSceneIndex===-1)return;this.playlist[this.selectedSceneIndex].layers.splice(e,1),this.selectedLayerIndex===e&&this.dom.layerEditor.classList.add("hidden"),this.selectedLayerIndex>e&&this.selectedLayerIndex--,this.renderSceneEditor()}
  clearPlaylist() {this.stop(),this.initState(),this.updatePlaylistUI(),this.hideEditors()}
  updatePlaylistUI() {this.dom.playlistDisplay.innerHTML="<h4>Scene Queue</h4>";if(0===this.playlist.length)return void(this.dom.playlistDisplay.innerHTML+='<p style="opacity:0.5; text-align:center;">Queue is empty.</p>');const e=document.createElement("ul");this.playlist.forEach((t,i)=>{const n=document.createElement("li");n.className="playlist-item",i===this.currentSceneIndex&&this.isPlaying&&n.classList.add("playing"),i===this.selectedSceneIndex&&n.classList.add("selected"),n.innerHTML=`<span>${t.name} (${t.layers.length} layers)</span><div class="item-controls"><button class="delete-btn" data-index="${i}">X</button></div>`,n.addEventListener("click",e=>{e.target.classList.contains("delete-btn")||this.selectScene(i)}),n.querySelector(".delete-btn").addEventListener("click",()=>this.removeScene(i)),e.appendChild(n)}),this.dom.playlistDisplay.appendChild(e)}
  selectScene(e) {this.selectedSceneIndex=e,this.selectedLayerIndex=-1,this.renderSceneEditor(),this.updatePlaylistUI()}
  selectLayer(e) {this.selectedLayerIndex=e,this.renderLayerEditor(),this.renderLayerListUI()}
  hideEditors() {this.selectedSceneIndex=-1,this.dom.editorContainer.classList.add("hidden"),this.dom.layerEditor.classList.add("hidden")}
  renderSceneEditor() {if(this.selectedSceneIndex===-1)return this.hideEditors();const e=this.playlist[this.selectedSceneIndex];this.dom.editorContainer.classList.remove("hidden"),this.dom.layerEditor.classList.add("hidden"),this.dom.sceneEditorTitle.textContent=`for "${e.name}"`,this.dom.sceneDurationInput.value=e.duration,this.dom.sceneTransitionInput.value=e.transition,this.renderLayerListUI(),this.liveUpdateCheck()}
  renderLayerListUI() {const e=this.playlist[this.selectedSceneIndex];this.dom.layerList.innerHTML="",e.layers.forEach((t,i)=>{const n=document.createElement("div");n.className="layer-item",i===this.selectedLayerIndex&&n.classList.add("selected"),n.innerHTML=`<span>${t.name||"Untitled Layer"}</span><div class="item-controls"><button class="delete-btn" data-index="${i}">X</button></div>`,n.addEventListener("click",e=>{e.target.classList.contains("delete-btn")||this.selectLayer(i)}),n.querySelector(".delete-btn").addEventListener("click",()=>this.removeLayer(i)),this.dom.layerList.appendChild(n)})}
  renderLayerEditor() {if(this.selectedLayerIndex===-1)return void this.dom.layerEditor.classList.add("hidden");const e=this.playlist[this.selectedSceneIndex].layers[this.selectedLayerIndex];this.dom.layerEditor.classList.remove("hidden"),this.dom.layerEditorTitle.textContent=`for "${e.name}"`,this.dom.layerType.value=e.type,this.dom.layerContent.value=e.content,this.dom.layerX.value=e.x,this.dom.layerXValue.textContent=e.x,this.dom.layerY.value=e.y,this.dom.layerYValue.textContent=e.y,this.dom.layerW.value=e.width,this.dom.layerWValue.textContent=e.width,this.dom.layerH.value=e.height,this.dom.layerHValue.textContent=e.height,this.dom.layerAnimType.value=e.animType,this.dom.layerAnimDir.value=e.animDir,this.dom.layerAnimSpeed.value=e.animSpeed,this.dom.layerAnimSpeedValue.textContent=e.animSpeed,this.dom.layerFilterType.value=e.filterType,this.updateFilterValueUI(e.filterType,e.filterValue),this.dom.layerFilterValue.value=e.filterValue,this.liveUpdateCheck()}
  updateSceneProperty(e,t) {if(this.selectedSceneIndex===-1)return;this.playlist[this.selectedSceneIndex][e]=t,this.liveUpdateCheck()}
  updateLayerProperty(e,t) {if(this.selectedSceneIndex===-1||this.selectedLayerIndex===-1)return;const i=this.playlist[this.selectedSceneIndex].layers[this.selectedLayerIndex];i[e]=t,["x","y","width","height","animSpeed"].includes(e)&&(this.dom[`layer${e.charAt(0).toUpperCase()+e.slice(1)}Value`].textContent=t),"filterType"===e&&this.updateFilterValueUI(t,i.filterValue),"filterValue"===e&&this.updateFilterValueUI(i.filterType,t,!0),this.liveUpdateCheck()}
  liveUpdateCheck() {this.isPlaying&&this.currentSceneIndex===this.selectedSceneIndex&&this.renderSceneToHUD(this.playlist[this.currentSceneIndex])}
  updateFilterValueUI(e,t,i=!1) {let n=0,s=200,a=1,r="%",l=t;switch(e){case"blur":s=20,r="px";break;case"hue-rotate":s=360,r="deg";break;case"invert":s=100;break;case"none":s=0,l=0}i||(this.dom.layerFilterValue.min=n,this.dom.layerFilterValue.max=s,this.dom.layerFilterValue.step=a,this.dom.layerFilterValue.value=l),this.dom.layerFilterValueText.textContent=`${l}${r}`}
  transitionOutCurrentScene() {const e=this.dom.visorHud.querySelector(".hud-scene-container");if(e){const t=e.dataset.transition,i=e.style.getPropertyValue("--transition-duration");e.classList.remove(`${t}-in`,"active"),e.classList.add(`${t}-out`),setTimeout(()=>e.remove(),i?parseInt(i):500)}}
  renderSceneToHUD(e) {this.transitionOutCurrentScene();const t=document.createElement("div");t.className="hud-scene-container",t.dataset.transition=e.transition;const i=Math.min(.1*e.duration,500);t.style.setProperty("--transition-duration",`${i}ms`),e.layers.forEach(e=>{const i=this.createLayerElement(e);t.appendChild(i)}),this.dom.visorHud.appendChild(t),t.classList.add(`${e.transition}-in`,"active")}
  createLayerElement(e) {const t=document.createElement("div");t.className="hud-layer",t.style.setProperty("--x-pos",`${e.x}%`),t.style.setProperty("--y-pos",`${e.y}%`),t.style.setProperty("--w-size",`${e.width}%`),t.style.setProperty("--h-size",`${e.height}%`);let i;switch(e.type){case"image":case"gif":case"avif":i=document.createElement("img"),i.src=e.content;break;case"video":i=document.createElement("video"),i.src=e.content,i.autoplay=!0,i.loop=!0,i.muted=!0;break;case"url":i=document.createElement("iframe"),i.src=e.content;break;default:i=document.createElement("p"),i.textContent=e.content}if(t.appendChild(i),"scroll"===e.animType){i.classList.add("anim-scroll"),i.style.setProperty("--anim-duration",`${e.animSpeed}s`),i.style.setProperty("--anim-name",`scroll-${e.animDir}`)}let n="none";if("none"!==e.filterType){const t={"blur":"px","hue-rotate":"deg"}[e.filterType]||"%";n=`${e.filterType}(${e.filterValue}${t})`}return t.style.setProperty("--filter",n),t}
  savePlaylistToFile() {const e="data:text/json;charset=utf-8,"+encodeURIComponent(JSON.stringify(this.playlist,null,2)),t=document.createElement("a");t.setAttribute("href",e),t.setAttribute("download","hud-playlist.json"),document.body.appendChild(t),t.click(),t.remove()}
  loadPlaylistFromFile(e) {const t=e.target.files[0];if(!t)return;const i=new FileReader;i.onload=e=>{try{const t=JSON.parse(e.target.result);if(!Array.isArray(t))throw new Error("Invalid playlist format.");{this.clearPlaylist(),this.playlist=t;let e=0,i=0;this.playlist.forEach(t=>{t.id=t.id||Date.now()+ ++e,t.layers.forEach(e=>{e.id=e.id||Date.now()+ ++i})}),this.updatePlaylistUI(),alert("Playlist loaded successfully!")}}catch(e){console.error("Failed to load playlist:",e),alert("Error: Could not load file.")}},i.readAsText(t),e.target.value=""}


  /** 
   * Loads a new "ultra long play" showcase, generated programmatically 
   * from the imported MEDIA_ASSETS library and using the new `fact` metadata.
   */
  loadDefaultPlaylist() {
    this.stop();
    this.clearPlaylist();
    const findAsset = (name) => MEDIA_ASSETS.find(a => a.name === name);

    let newPlaylist = [];

    // --- Defensive Check Helper ---
    // This ensures we don't crash if an asset name is misspelled.
    const checkAndAddScene = (sceneData, assetNames) => {
        for(const name of assetNames) {
            if (!findAsset(name)) {
                console.error(`CRITICAL ERROR: Asset "${name}" not found in library. Skipping scene "${sceneData.name}".`);
                alert(`Asset "${name}" missing. Scene generation skipped.`);
                return; // Do not add the scene
            }
        }
        newPlaylist.push(sceneData);
    }
    
    // --- Scene 1: Intro with facts ---
    checkAndAddScene({
        id: 1, name: "SYSTEM BOOT", duration: 7000, transition: "fade", layers: [
            { id: 101, type: findAsset("BAM LOGO")?.type, content: findAsset("BAM LOGO")?.url, x: 50, y: 35, width: 40, height: 40 },
            { id: 102, type: "text", content: "ORDINAL DATABASE SYNCED", x: 50, y: 70, width: 100, height: 10 },
            { id: 103, type: "text", content: `INIT FACT: ${findAsset("BAM LOGO")?.fact}`, x: 50, y: 88, width: 90, height: 20, animType: "scroll", animDir: "left", animSpeed: 12 }
        ]
    }, ["BAM LOGO"]);

    // --- Scene 2: Programmatically generate scenes for a whole collection ---
    const hashOnes = MEDIA_ASSETS.filter(a => a.collection === 'Hash Ones');
    hashOnes.forEach((asset, index) => {
        checkAndAddScene({
            id: 20 + index, name: `Showcase: ${asset.name}`, duration: 8000, transition: "slide-up", layers: [
                { id: 200 + index, type: asset.type, content: asset.url, x: 35, y: 50, width: 60, height: 80 },
                { id: 250 + index, type: "text", content: `${asset.name}\n${asset.rarity}`, x: 80, y: 25, width: 35, height: 20 },
                { id: 280 + index, type: "text", content: `DATA: ${asset.fact}`, x: 80, y: 65, width: 38, height: 50, animType: "scroll", animDir: "up", animSpeed: 15 }
            ]
        }, [asset.name]); // Asset name is dynamic here
    });

    // --- Scene 3: Highlight PUNX collection with video and facts ---
    checkAndAddScene({
        id: 3, name: "COLLECTION: PUNX", duration: 10000, transition: "slide-down", layers: [
            { id: 301, type: findAsset("PUNX LOGO HI-RES")?.type, content: findAsset("PUNX LOGO HI-RES")?.url, x: 50, y: 50, width: 100, height: 100, filterType: "saturate", filterValue: "30" },
            { id: 302, type: findAsset("PUNX #1")?.type, content: findAsset("PUNX #1")?.url, x: 50, y: 40, width: 50, height: 50 },
            { id: 303, type: "text", content: `PUNX ON ORDINALS // ${findAsset("PUNX #1")?.fact} // ${findAsset("PUNX LOGO HI-RES")?.fact}`, x: 50, y: 85, width: 100, height: 10, animType: "scroll", animDir: "left", animSpeed: "18" }
        ]
    }, ["PUNX LOGO HI-RES", "PUNX #1"]);
    
    this.playlist = newPlaylist;
    this.sceneCounter = this.playlist.length;
    this.updatePlaylistUI();
  }
}

window.hudApp = new HUDApp();