"use client";
import { useState } from "react";
import { Box, Camera, Check, CircleAlert, Flame, Info, RotateCcw, Rotate3D, Leaf } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CalorieStage } from "./calorie-stage";
import { Input } from "@/components/ui/input";
import { mealParts } from "@/lib/meal-model";
import type { MealFood, MealAnalysis } from "@/lib/meal-analysis";

type Props={foods:MealFood[];weights:number[];portion:number;image:string;analysis:MealAnalysis|null;onWeightChange:(index:number,grams:number)=>void};
const rounded=(n:number)=>Math.round(n*10)/10;
export function MealExplorer({foods,weights,portion,image,analysis,onWeightChange}:Props) {
  const [selected,setSelected]=useState(0);
  const [view,setView]=useState("model");
  const parts=mealParts(foods,weights,portion);
  const active=parts[Math.min(selected,parts.length-1)];
  const total=parts.reduce((sum,p)=>sum+p.kcal,0);
  const selectedIndex=active?.index ?? 0;
  if(!active)return null;
  const ratio=total?active.kcal/total*100:0;
  const fiber=parts.reduce((sum,p)=>sum+p.fiber,0);
  const protein=parts.reduce((sum,p)=>sum+p.protein,0);
  const groups=new Set(parts.filter(p=>p.grams>0).map(p=>p.category)).size;
  const advantages=analysis?.advantages ?? [
    `The selected portion includes approximately ${rounded(protein)} g of protein across its ingredients.`,
    `The ingredients contribute around ${rounded(fiber)} g of fiber.`,
    `This portion includes ${groups} different food categories.`,
  ];
  const disadvantages=analysis?.disadvantages ?? [
    `Dressing contributes about ${Math.round(parts.filter(p=>p.category==="Added fats").reduce((sum,p)=>sum+p.kcal,0))} kcal. An unmeasured amount changes the estimate.`,
    "The food photograph cannot confirm added salt or sugar, or reveal every cooking ingredient.",
    "The portion is illustrative; real meal amounts may be different.",
  ];
  return <section className="meal-explorer" id="meal-explorer" aria-labelledby="explorer-title">
    <div className="explorer-heading"><div><span className="eyebrow"><Box size={15}/> ANOTHER DIMENSION TO YOUR MEAL</span><h2 id="explorer-title">Every ingredient has a story.</h2><p>Select a part to see where the calories come from.</p></div><span className="sample-badge">{analysis ? "AI estimates" : "Interactive sample"}</span></div>
    <div className="explorer-grid">
      <Tabs value={view} onValueChange={setView} className="model-panel">
        <div className="model-toolbar"><TabsList aria-label="Meal visualization"><TabsTrigger value="model"><Box size={15}/>3D calorie model</TabsTrigger><TabsTrigger value="photo"><Camera size={15}/>Photo map</TabsTrigger></TabsList></div>
        <TabsContent value="model">
          <CalorieStage parts={parts} selected={selectedIndex} onSelect={setSelected}/>
        </TabsContent>
        <TabsContent value="photo"><div className="photo-map"><img src={image} alt="Meal with estimated food regions"/>{parts.map(p=>p.box && <button key={p.index} className={`photo-region ${p.index===selectedIndex?"selected":""}`} style={{top:`${p.box[0]/10}%`,left:`${p.box[1]/10}%`,height:`${(p.box[2]-p.box[0])/10}%`,width:`${(p.box[3]-p.box[1])/10}%`,borderColor:p.color}} onClick={()=>setSelected(p.index)} aria-label={`${p.name}, ${Math.round(p.kcal)} kcal`} aria-pressed={p.index===selectedIndex}><span style={{background:p.color}}>{p.index+1} · {Math.round(p.kcal)} kcal</span></button>)}</div><p className="map-note"><Info size={15}/>{active.box ? "Regions are approximate and can overlap. Select a numbered region or an ingredient below." : `${active.name} cannot be reliably located in the photo. Its estimated calories are still included in the model.`}</p></TabsContent>
        <div className="ingredient-legend" aria-label="Select an ingredient">{parts.map(p=><button key={p.index} onClick={()=>setSelected(p.index)} aria-pressed={p.index===selectedIndex} className={p.index===selectedIndex?"active":""}><span className="ingredient-number" style={{background:p.color}}>{p.index+1}</span><span>{p.name}</span><strong>{Math.round(p.kcal)} <small>kcal</small></strong></button>)}</div>
      </Tabs>
      <aside className="ingredient-detail" aria-live="polite"><div className="detail-label"><span style={{background:active.color}}/> INGREDIENT {selectedIndex+1} OF {parts.length}</div><h3>{active.name}</h3><p className="detail-category">{active.category}</p><div className="detail-energy"><Flame size={23}/><strong>{Math.round(active.kcal)}</strong><span>kcal</span></div><p className="energy-share">{rounded(ratio)}% of this meal’s estimated energy</p><div className="share-track"><div style={{width:`${ratio}%`,background:active.color}}/></div><dl className="detail-nutrients">{[["Protein",active.protein],["Carbohydrates",active.carbs],["Fat",active.fat],["Fiber",active.fiber]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{rounded(Number(value))}<span> g</span></dd></div>)}</dl><div className="detail-portion"><label htmlFor="selected-food-grams">Base amount</label><div><Input id="selected-food-grams" type="number" min={0} max={1000} step={5} value={weights[selectedIndex]} onChange={e=>onWeightChange(selectedIndex,Math.min(1000,Math.max(0,Number(e.target.value)||0)))}/><span>g</span></div><p>{rounded(active.grams)} g with your {portion}× portion · {Math.round((foods[selectedIndex].protein*4+foods[selectedIndex].carbs*4+foods[selectedIndex].fat*9)/foods[selectedIndex].grams*100)} kcal per 100 g</p></div><div className="ingredient-note"><Check size={16}/><div><strong>What it contributes</strong><p>{active.benefit || "See the estimated macro and fiber contribution above."}</p></div></div><div className="ingredient-note caution"><CircleAlert size={16}/><div><strong>What to consider</strong><p>{active.consideration || "Portion size and preparation affect this estimate."}</p></div></div></aside>
    </div>
    <div className="tradeoff-heading"><h2>A balanced view of the meal</h2><p>{analysis ? "Gemini’s observations about the original photo. Reanalyze after changing the meal; editing portions updates numbers only." : "Sample observations with the current portion amounts."}</p></div>
    <div className="tradeoff-grid"><article className="meal-advantages"><span className="tradeoff-icon"><Leaf size={22}/></span><h3>Advantages</h3><p className="tradeoff-subtitle">What this meal brings to the table</p><ul>{advantages.map((text,i)=><li key={i}><Check size={16}/><span>{text}</span></li>)}</ul></article><article className="meal-disadvantages"><span className="tradeoff-icon"><CircleAlert size={22}/></span><h3>Potential disadvantages</h3><p className="tradeoff-subtitle">Trade-offs and things to check</p><ul>{disadvantages.map((text,i)=><li key={i}><Info size={16}/><span>{text}</span></li>)}</ul></article></div>
  </section>;
}
