const State = (()=> {
  const listeners=new Set();
  let state={bpm:120,channels:[],playing:false,currentStep:0};
  const emit=()=>listeners.forEach(l=>l(state));
  return{
    get:()=>state,
    subscribe:(fn)=>{listeners.add(fn);return()=>listeners.delete(fn);},
    update:(patch)=>{state={...state,...patch};emit();},
    updateChannel:(i,patch)=>{state.channels[i]={...state.channels[i],...patch};emit();},
    addChannel:(ch)=>{state.channels.push(ch);emit();}
  };
})();
export default State;
