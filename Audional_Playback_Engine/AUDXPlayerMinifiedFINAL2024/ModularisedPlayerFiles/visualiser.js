// visualiser.js
console.log("Visulaiser.js loaded");let isChannel11Active=!1;function randomWithSeed(t){const e=1e4*Math.sin(t);return e-Math.floor(e)}function calculateCCI2(t){const e=100*randomWithSeed(seed+t);return Math.floor(e)+1}document.addEventListener("internalAudioPlayback",(function(t){const{action:e,channelIndex:s,step:i}=t.detail;"stop"===e?(cci2=initialCCI2,isChannel11Active=!1,console.log(`Stop received. CCI2 reset to initial value ${initialCCI2}`),immediateVisualUpdate()):"activeStep"===e&&(cci2=calculateCCI2(s),console.log(`Received channel playback: Channel ${s}. CCI2 updated to ${cci2} based on seed ${seed}.`))}));let needImmediateUpdate=!1;function immediateVisualUpdate(){needImmediateUpdate=!0}AudionalPlayerMessages.onmessage=t=>{if("stop"===t.data.action)cci2=initialCCI2,isChannel11Active=!1,console.log(`Stop received. CCI2 reset to initial value ${initialCCI2}`);else{const{channelIndex:e}=t.data;cci2=calculateCCI2(e),console.log(`Received channel playback: Channel ${e}. CCI2 updated to ${cci2} based on seed ${seed}.`)}};let scaleFactor=3,S=window.innerWidth,R=100*scaleFactor,H=2*R,RS=2*Math.PI/2e3/1e3,SR=100*scaleFactor,OR=100*scaleFactor,cv=document.getElementById("cv"),cx=cv.getContext("2d");cv.width=S,cv.height=S;const workerScript="\nself.onmessage = function(e) {\n    const { id, vertices, pivot, angle } = e.data;\n    const updatedVertices = vertices.map(v => {\n        let x = v.x - pivot.x,\n            y = v.y - pivot.y,\n            x1 = x * Math.cos(angle) - y * Math.sin(angle),\n            y1 = x * Math.sin(angle) + y * Math.cos(angle);\n        return { x: x1 + pivot.x, y: y1 + pivot.y, z: v.z };\n    });\n\n    postMessage({ id, updatedVertices });\n};\n",blob=new Blob([workerScript],{type:"application/javascript"}),workerScriptURL=URL.createObjectURL(blob),rotationWorker=new Worker(workerScriptURL);function sendRotationRequest(t,e,s,i){rotationWorker.postMessage({id:t,vertices:e,pivot:s,angle:i})}function generateVerticesRequest(t,e,s,i){rotationWorker.postMessage({taskType:"generateVertices",data:{id:t,c:e,r:s,s:i}})}rotationWorker.onmessage=function(t){const{id:e,updatedVertices:s}=t.data;"cy"===e?cp.cy.updateVertices(s):e.startsWith("sp")&&cp[e].updateVertices(s)};class Cy{constructor(t,e,s,i){this.c=t,this.r=e,this.h=s,this.s=i,this.gV(),this.gF()}updateVertices(t){this.v=t}gV(){this.v=[];for(let t=0;t<=this.s;t++){let e=this.c.y-this.h/2+t/this.s*this.h;for(let t=0;t<=this.s;t++){let s=t/this.s*2*Math.PI,i=this.c.x+this.r*Math.cos(s),c=this.c.z+this.r*Math.sin(s);this.v.push({x:i,y:e,z:c})}}}gF(){this.f=[];for(let t=0;t<this.s;t++)for(let e=0;e<this.s;e++){let s=t*(this.s+1)+e,i=s+1,c=s+this.s+1,a=c+1;this.f.push([s,i,c]),this.f.push([i,a,c])}}rP(t,e){sendRotationRequest(this.id,this.v,t,e)}}class Sp{constructor(t,e,s){this.c=t,this.r=e,this.s=s,this.gV(),this.gF()}updateVertices(t){this.v=t}gV(){this.v=[];for(let t=0;t<=this.s;t++){let e=t/this.s*Math.PI;for(let t=0;t<=this.s;t++){let s=t/this.s*2*Math.PI,i=this.c.x+this.r*Math.sin(e)*Math.cos(s),c=this.c.y+this.r*Math.sin(e)*Math.sin(s),a=this.c.z+this.r*Math.cos(e);this.v.push({x:i,y:c,z:a})}}}gF(){this.f=[];for(let t=0;t<this.s;t++)for(let e=0;e<this.s;e++){let s=t*(this.s+1)+e,i=s+1,c=s+this.s+1,a=c+1;this.f.push([s,i,c]),this.f.push([i,a,c])}}rP(t,e){sendRotationRequest(this.id,this.v,t,e)}}class Cp{constructor(t,e,s,i){this.c=t,this.r=e,this.h=s,this.s=i,this.cy=new Cy(t,e,s,i),this.sp1=new Sp({x:t.x-e,y:t.y,z:t.z},e,i),this.sp2=new Sp({x:t.x+e,y:t.y,z:t.z},e,i)}updateVertices(t){this.v=t}rP(t,e){sendRotationRequest("cy",this.cy.v,t,e),sendRotationRequest("sp1",this.sp1.v,t,e),sendRotationRequest("sp2",this.sp2.v,t,e)}}let t,cp=new Cp({x:S/2,y:S/2,z:0},R,H,30),os1=new Sp({x:S/2-OR,y:S/2,z:0},SR,30),os2=new Sp({x:S/2+OR,y:S/2,z:0},SR,30);function d(e){let s;if(cx.clearRect(0,0,S,S),void 0===t)s=0;else{s=RS*(e-t)*100}t=e,cp.rP(cp.c,s),cp.drawObjectD2(cp.cy,e),cp.drawObjectD2(cp.sp1,e),cp.drawObjectD2(cp.sp2,e),requestAnimationFrame(d)}cp.drawObjectD2=function(t,e){for(let s of t.f){let i=s.map((e=>t.v[e])),c=i.map((t=>({x:t.x,y:t.y})));cx.beginPath(),cx.moveTo(c[0].x,c[0].y);for(let t=1;t<c.length;t++)cx.lineTo(c[t].x,c[t].y);cx.closePath();let a=180*Math.atan2(c[0].y-S/2,c[0].x-S/2)/Math.PI,n=getColors(a,e,i);cx.fillStyle=n[cci2%n.length],cx.fill(),cx.strokeStyle="black",cx.stroke()}},requestAnimationFrame(d);
async function ensureAudioContextState(){window.audioCtx&&"suspended"===audioCtx.state&&(await audioCtx.resume(),console.log("AudioContext resumed"))}document.addEventListener("DOMContentLoaded",ensureAudioContextState),document.addEventListener("click",(async()=>{await ensureAudioContextState(),togglePlayback()}));