
self.onmessage = async (e)=>{
  if(e.data.type==='loadImage'){
    const url=e.data.url;
    try{
      const resp = await fetch(url,{mode:'cors'});
      const blob = await resp.blob();
      const bitmap = await createImageBitmap(blob);
      self.postMessage({type:'image',bitmap},[bitmap]);
    }catch(err){
      self.postMessage({type:'error',message:err.message});
    }
  }
};
