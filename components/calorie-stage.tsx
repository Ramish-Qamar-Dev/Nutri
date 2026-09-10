"use client";
import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Hand, Minus, Plus, RotateCcw } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { calorieGeometry, wrapRotation } from "../lib/calorie-geometry";

type Part={name:string;kcal:number;color:string};
export function CalorieStage({parts,selected,onSelect}:{parts:Part[];selected:number;onSelect:(index:number)=>void}) {
  const [rotation,setRotation]=useState(-35),[elevation,setElevation]=useState(48),[zoom,setZoom]=useState(1),[separated,setSeparated]=useState(false);
  const drag=useRef<{id:number;x:number;y:number;angle:number;moved:boolean}|null>(null);
  const suppressClick=useRef(false);
  const {faces,targets}=calorieGeometry(parts.map(p=>p.kcal),rotation,elevation,zoom,separated,selected);
  const total=parts.reduce((sum,p)=>sum+p.kcal,0),active=parts[selected];
  const reset=()=>{setRotation(-35);setElevation(48);setZoom(1);setSeparated(false);};
  return <div className="model-stage enhanced-stage">
    <div className="model-stage-heading"><span>YOUR MEAL IN 3D</span><button className="stage-reset" onClick={reset}><RotateCcw size={14}/>Reset view</button></div>
    <div className="stage-gesture-hint"><Hand size={14}/>Drag sideways to rotate · tap an ingredient</div>
    <svg viewBox="0 0 640 460" className="calorie-model touch-model" role="group" aria-label="Rotatable three-dimensional ingredient calorie model"
      onPointerDown={e=>{if(e.button!==0)return;suppressClick.current=false;drag.current={id:e.pointerId,x:e.clientX,y:e.clientY,angle:rotation,moved:false};}}
      onPointerMove={e=>{const d=drag.current;if(!d||d.id!==e.pointerId)return;const dx=e.clientX-d.x,dy=e.clientY-d.y;if(!d.moved&&Math.abs(dx)>6&&Math.abs(dx)>Math.abs(dy)){d.moved=true;e.currentTarget.setPointerCapture(e.pointerId);}if(d.moved){suppressClick.current=true;setRotation(wrapRotation(d.angle+dx*.65));}}}
      onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}
      onClick={e=>{if(suppressClick.current){e.preventDefault();suppressClick.current=false;return;}const index=(e.target as Element).getAttribute('data-ingredient');if(index!==null)onSelect(Number(index));}}>
      <defs><radialGradient id="stage-ground"><stop stopColor="#9bae68" stopOpacity=".15"/><stop offset="1" stopColor="#9bae68" stopOpacity="0"/></radialGradient></defs>
      <ellipse cx="320" cy="286" rx="290" ry="130" fill="url(#stage-ground)"/>
      <ellipse cx="320" cy="266" rx="240" ry="120" fill="none" stroke="#c9deab" strokeOpacity=".12" strokeDasharray="3 9"/>
      {faces.map((face,i)=><path key={i} d={face.path} fill={parts[face.ingredient].color} data-ingredient={face.ingredient} style={{filter:`brightness(${face.shade})`}} stroke={parts[face.ingredient].color} strokeWidth=".4"/>)}
      {targets.map(target=><path key={target.ingredient} d={target.path} fill="transparent" stroke={target.ingredient===selected?'#f1f7de':'transparent'} strokeWidth="1.6" data-ingredient={target.ingredient} className="model-hit-region" role="button" tabIndex={0} aria-pressed={target.ingredient===selected} aria-label={`${parts[target.ingredient].name}: ${Math.round(parts[target.ingredient].kcal)} kcal`} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(target.ingredient);}}}/>)}
      <g pointerEvents="none"><text x="320" y="218" textAnchor="middle" fill="#f0f6eb" fontSize="28" fontWeight="500">{Math.round(total)}</text><text x="320" y="238" textAnchor="middle" fill="#c0cdb4" fontSize="13">kcal total</text></g>
      {total===0&&<text x="320" y="330" textAnchor="middle" fill="#c0cdb4" fontSize="15">Add an ingredient amount to build the model.</text>}
    </svg>
    <div className="selected-ingredient-dock" aria-live="polite"><span style={{background:active.color}}/><div><strong>{active.name}</strong><small>{total?Math.round(active.kcal/total*100):0}% of meal energy</small></div><b>{Math.round(active.kcal)}<small> kcal</small></b></div>
    <div className="stage-controls"><div className="stage-button-group"><button aria-label="Rotate left" onClick={()=>setRotation(wrapRotation(rotation-20))}><ArrowLeft size={18}/></button><span>Rotate</span><button aria-label="Rotate right" onClick={()=>setRotation(wrapRotation(rotation+20))}><ArrowRight size={18}/></button></div><div className="stage-button-group"><button aria-label="Zoom out" disabled={zoom<=.8} onClick={()=>setZoom(v=>Math.max(.8,v-.1))}><Minus size={18}/></button><span>{Math.round(zoom*100)}%</span><button aria-label="Zoom in" disabled={zoom>=1.1} onClick={()=>setZoom(v=>Math.min(1.1,v+.1))}><Plus size={18}/></button></div></div>
    <div className="stage-angle"><span>Viewing angle</span><Slider aria-label="Model viewing angle" min={30} max={60} step={1} value={[elevation]} onValueChange={v=>setElevation(v[0])}/><span>{elevation}°</span></div>
    <label className="stage-separate" htmlFor="separate-ingredients"><span>Separate ingredients<small>See each contribution more clearly</small></span><Switch id="separate-ingredients" checked={separated} onCheckedChange={setSeparated}/></label>
    <p className="model-disclaimer">Estimated calorie shares, visualized in 3D. Shapes represent energy, not the actual shape or volume of food.</p>
  </div>;
}
