"use client";
import { useEffect, useRef, useState } from "react";
import { Camera, Check, FlipHorizontal2, ImagePlus, LoaderCircle, RotateCcw, ShieldCheck } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cameraErrorMessage, stopCamera } from "../lib/camera";
type Props={onClose:()=>void;onCapture:(file:File)=>void;onUpload:()=>void};
export function CameraCapture({onClose,onCapture,onUpload}:Props) {
  const video=useRef<HTMLVideoElement>(null);
  const stream=useRef<MediaStream|null>(null);
  const [facing,setFacing]=useState<"environment"|"user">("environment");
  const [attempt,setAttempt]=useState(0);
  const [ready,setReady]=useState(false);
  const [error,setError]=useState("");
  const [multipleCameras,setMultipleCameras]=useState(false);
  const [capturing,setCapturing]=useState(false);
  const [shot,setShot]=useState<{file:File;url:string}|null>(null);
  const mounted=useRef(true);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  useEffect(()=>()=>{if(shot)URL.revokeObjectURL(shot.url);},[shot]);
  useEffect(()=>{
    let cancelled=false;let owned:MediaStream|null=null;
    setReady(false);setError("");
    if(!window.isSecureContext || !navigator.mediaDevices?.getUserMedia){setError("Live capture isn’t available in this browser. Use HTTPS or localhost in a supported browser, or upload a photo below.");return;}
    async function start(){
      try{
        const media=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:facing},width:{ideal:1600},height:{ideal:1200}}});
        if(cancelled){stopCamera(media);return;}
        owned=media;stream.current=media;
        const player=video.current;if(!player){stopCamera(media);return;}
        player.srcObject=media;
        for(const track of media.getVideoTracks())track.addEventListener("ended",()=>{if(!cancelled){setReady(false);setError("The camera was disconnected. Reconnect it and try again.");}},{once:true});
        await player.play();
        if(!cancelled && player.videoWidth>0)setReady(true);
        const devices=await navigator.mediaDevices.enumerateDevices().catch(()=>[]);
        if(!cancelled)setMultipleCameras(devices.filter(d=>d.kind==="videoinput").length>1);
      }catch(e){stopCamera(owned);if(!cancelled){setReady(false);setError(cameraErrorMessage(e));}}
    }
    void start();
    return()=>{cancelled=true;stopCamera(owned);if(stream.current===owned)stream.current=null;};
  },[facing,attempt]);
  async function capture(){
    const player=video.current;if(!player||!player.videoWidth||!ready||capturing)return;
    setCapturing(true);setError("");
    try{
      const scale=Math.min(1,1600/Math.max(player.videoWidth,player.videoHeight));
      const canvas=document.createElement("canvas");canvas.width=Math.round(player.videoWidth*scale);canvas.height=Math.round(player.videoHeight*scale);
      const ctx=canvas.getContext("2d");if(!ctx)throw Error("Capture unavailable");ctx.drawImage(player,0,0,canvas.width,canvas.height);
      const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error("Capture failed")),"image/jpeg",.9));
      if(!mounted.current)return;
      const file=new File([blob],`meal-${new Date().toISOString().replace(/[:.]/g,"-")}.jpg`,{type:"image/jpeg"});
      setShot({file,url:URL.createObjectURL(blob)});stopCamera(stream.current);stream.current=null;setReady(false);
    }catch{if(mounted.current)setError("The photo couldn’t be captured. Please try again.");}
    finally{if(mounted.current)setCapturing(false);}
  }
  return <Dialog open onOpenChange={v=>{if(!v)onClose();}}><DialogContent className="camera-dialog"><DialogHeader><DialogTitle>{shot?"How does your meal look?":"Take a meal photo"}</DialogTitle><DialogDescription>{shot?"Check that the food is clear before using this photo.":"Allow camera access, fit the whole plate in the frame, then take a photo."}</DialogDescription></DialogHeader><div className="camera-view">{shot?<img src={shot.url} alt="Your captured meal, ready to review"/>:<><video ref={video} autoPlay muted playsInline aria-label="Live camera preview" onLoadedData={()=>{if(video.current?.videoWidth)setReady(true);}} style={{transform:facing==="user"?"scaleX(-1)":undefined}}/>{!ready&&!error&&<div className="camera-wait" role="status"><LoaderCircle className="spin" size={28}/><p>Waiting for camera access…</p></div>}{ready&&<span className="camera-live"><span/> Camera on</span>}</>}</div>{error&&<div role="alert" className="camera-error"><p>{error}</p><button className="text-button" onClick={()=>setAttempt(a=>a+1)}>Try camera again <RotateCcw size={14}/></button></div>}<div className="camera-controls">{shot?<><button className="secondary-button" onClick={()=>{setShot(null);setAttempt(a=>a+1);}}><RotateCcw size={16}/>Retake</button><button className="primary-button" onClick={()=>onCapture(shot.file)}><Check size={17}/>Use this photo</button></>:<>{multipleCameras&&<button className="secondary-button" disabled={capturing} onClick={()=>setFacing(f=>f==="user"?"environment":"user")}><FlipHorizontal2 size={17}/>Switch camera</button>}<button className="primary-button" disabled={!ready||capturing} onClick={()=>void capture()}><Camera size={18}/>{capturing?"Capturing…":"Take photo"}</button></>}</div><button className="text-button camera-upload" onClick={onUpload}><ImagePlus size={16}/>Choose an existing photo instead</button><p className="camera-privacy"><ShieldCheck size={15}/>Video stays on your device. The camera stops after capture or when you close this window. Your chosen photo is sent only when you select Analyze.</p></DialogContent></Dialog>;
}
