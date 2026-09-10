"use client";

import { useEffect, useRef, useState } from "react";

import { ArrowRight, Camera, Check, ChevronRight, Flame, ImagePlus, Info, Leaf, Minus, Plus, RotateCcw, ShieldCheck, Sparkles, Sprout, Upload, Utensils, X, LoaderCircle, Box, ChartNoAxesCombined } from "lucide-react";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";

import { flushSync } from "react-dom";





import { Textarea } from "@/components/ui/textarea";

import { MealExplorer } from "../components/meal-explorer";

import { CameraCapture } from "../components/camera-capture";

import { NutritionDetails } from "../components/nutrition-details";

import type { MealAnalysis, MealFood } from "@/lib/meal-analysis";

const sampleImage = "/sample-meal.jpg";

const SAMPLE_FOODS: MealFood[] = [

  { name: "Salmon", category: "Protein & fats", grams: 100, protein: 20, carbs: 0, fat: 13, fiber: 0, color: "#ed906e", box:[410,280,700,485], benefit:"Contributes protein and fat to this sample meal.", consideration:"Preparation and added oil affect the calorie estimate." },

  { name: "Cooked quinoa", category: "Grains", grams: 150, protein: 6, carbs: 32, fat: 3, fiber: 4, color: "#c4b482", box:[165,440,390,660], benefit:"Contributes carbohydrate, protein, and fiber.", consideration:"Cooked portion weight affects how much energy it contributes." },

  { name: "Edamame", category: "Plant protein", grams: 60, protein: 7, carbs: 5, fat: 3, fiber: 3, color: "#83a550", box:[250,285,440,460], benefit:"Adds plant protein and fiber to the meal.", consideration:"Sauces or oil added to the beans are not included unless entered separately." },

  { name: "Vegetables & mango", category: "Plants & fiber", grams: 150, protein: 2, carbs: 18, fat: 0, fiber: 4, color: "#c080b0", box:[290,520,840,760], benefit:"Adds variety and fiber to this sample.", consideration:"This grouped estimate cannot distinguish the exact amount of each plant." },

  { name: "Dressing", category: "Added fats", grams: 15, protein: 0, carbs: 3, fat: 5, fiber: 0, color: "#d8a342", box:null, benefit:"Adds flavor and contributes dietary fat.", consideration:"An unseen dressing amount can meaningfully change the energy estimate." },

];

export default function Home() {

  const [view,setView] = useState("capture");
  function goView(next:string) {
    if(!["capture","explore","report"].includes(next))return;
    setView(next);
    const hash=next==="explore"?"meal-explorer":next==="report"?"nutrition-details":"capture";
    if(window.location.hash!==`#${hash}`)window.history.pushState(null,"",`#${hash}`);
    window.scrollTo({top:0,behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"});
  }
  useEffect(()=>{
    function sync(){const hash=window.location.hash;setView(hash==="#meal-explorer"?"explore":hash==="#nutrition-details"?"report":"capture");}
    sync();window.addEventListener("hashchange",sync);window.addEventListener("popstate",sync);
    return()=>{window.removeEventListener("hashchange",sync);window.removeEventListener("popstate",sync);};
  },[]);
  const [analysis, setAnalysis] = useState<MealAnalysis | null>(null);

  const foods: MealFood[] = analysis?.foods ?? SAMPLE_FOODS;





  const [loading, setLoading] = useState(false);

  const [notes, setNotes] = useState("");

  const analysisAbort = useRef<AbortController | null>(null);

  const [portion, setPortion] = useState(1);

  const [weights, setWeights] = useState(foods.map(f => f.grams));

  const [cameraOpen, setCameraOpen] = useState(false);

  const [photo, setPhoto] = useState<string | null>(null);

  const [fileName, setFileName] = useState("");

  const [error, setError] = useState("");

  const [dragging, setDragging] = useState(false);

  const input = useRef<HTMLInputElement>(null);

  const uploadId = useRef(0);

  const totals = foods.reduce((sum, f, i) => {

    const m = (weights[i] / f.grams) * portion;

    return { protein: sum.protein + f.protein * m, carbs: sum.carbs + f.carbs * m, fat: sum.fat + f.fat * m, fiber: sum.fiber + f.fiber * m };

  }, { protein: 0, carbs: 0, fat: 0, fiber: 0 });

  const kcal = Math.round(totals.protein * 4 + totals.carbs * 4 + totals.fat * 9);

  const proteinPct = kcal ? Math.round(totals.protein * 4 / kcal * 100) : 0;

  const carbsPct = kcal ? Math.round(totals.carbs * 4 / kcal * 100) : 0;

  const fatPct = kcal ? 100 - proteinPct - carbsPct : 0;

  const hasPlants = foods.some((f,i)=>["Plants & fiber","Plant protein"].includes(f.category)&&weights[i]>0);

  const hasProtein = foods.some((f,i)=>["Protein & fats","Plant protein"].includes(f.category)&&weights[i]>0);

  const hasGrains = foods.some((f,i)=>f.category==="Grains"&&weights[i]>0);

  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo); }, [photo]);

  useEffect(() => {

    type Tool = { name: string; description: string; inputSchema: object; annotations: { readOnlyHint: boolean; untrustedContentHint: boolean }; execute: (input: unknown) => unknown };

    const context = (document as Document & {modelContext?: {registerTool: (tool: Tool, options: {signal: AbortSignal}) => void | Promise<void>}}).modelContext;

    if (!context?.registerTool) return;

    const lifecycle = new AbortController();

    try {

      void Promise.resolve(context.registerTool({

        name: "configure_sample_meal",

        description: "Open the illustrative sample meal and set its portion multiplier and ingredient base weights. Does not analyze uploaded photos.",

        inputSchema: {type:"object",properties:{portion:{type:"number",minimum:0.25,maximum:2,multipleOf:0.25},grams:{type:"array",items:{type:"number",minimum:0,maximum:1000},minItems:5,maxItems:5}},required:["portion","grams"],additionalProperties:false},

        annotations:{readOnlyHint:false,untrustedContentHint:false},

        execute(value: unknown) {

          const x=value as {portion:number;grams:number[]};

          if (!x || typeof x !== "object" || Object.keys(x).some(k=>k!=="portion"&&k!=="grams") || !Number.isFinite(x.portion) || x.portion<0.25 || x.portion>2 || x.portion*4%1!==0 || !Array.isArray(x.grams) || x.grams.length!==5 || x.grams.some(g=>!Number.isFinite(g)||g<0||g>1000)) throw new Error("Use portion 0.25–2 in quarter steps and exactly five gram amounts from 0 to 1000, ordered salmon, quinoa, edamame, vegetables/mango, dressing.");

          flushSync(()=>{uploadId.current++;analysisAbort.current?.abort();setLoading(false);setAnalysis(null);setPhoto(null);setFileName("");setNotes("");setError("");setPortion(x.portion);setWeights([...x.grams]);});

          const calories=SAMPLE_FOODS.reduce((sum,f,i)=>sum+(f.protein*4+f.carbs*4+f.fat*9)*x.grams[i]/f.grams*x.portion,0);

          return {mode:"illustrative_sample",portion:x.portion,grams:x.grams,calories:Math.round(calories)};

        }

      },{signal:lifecycle.signal})).catch(()=>{});

    } catch { /* This optional browser capability must not interrupt the demo. */ }

    return ()=>lifecycle.abort();

  }, []);

  async function upload(file?: File) {

    if (!file) return;

    const currentUpload = ++uploadId.current;

    setError("");

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setError("Please choose a JPG, PNG, or WebP image."); return; }

    if (file.size > 10 * 1024 * 1024) { setError("This photo is too large. Choose an image under 10 MB."); return; }

    const url = URL.createObjectURL(file);

    const valid = await new Promise<boolean>(resolve => { const img = new Image(); img.onload = () => resolve(true); img.onerror = () => resolve(false); img.src = url; });

    if (currentUpload !== uploadId.current) { URL.revokeObjectURL(url); return; }

    if (!valid) { URL.revokeObjectURL(url); setError("We couldn’t open that image. Please try another photo."); return; }

    analysisAbort.current?.abort(); setLoading(false); setAnalysis(null); setPhoto(url); setFileName(file.name); setNotes(""); setPortion(1); setWeights(SAMPLE_FOODS.map(f=>f.grams));

  }

  function resetSample() { uploadId.current++; analysisAbort.current?.abort(); setLoading(false); setAnalysis(null); setPhoto(null); setFileName(""); setNotes(""); setError(""); setPortion(1); setWeights(SAMPLE_FOODS.map(f => f.grams)); }



  async function analyze() {



    if (!photo || loading) return;

    const controller = new AbortController();

    analysisAbort.current?.abort(); analysisAbort.current = controller;

    const currentUpload = uploadId.current;

    setLoading(true); setError("");

    try {

      const img = await new Promise<HTMLImageElement>((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(new Error("The photo could not be opened. Try uploading it again."));i.src=photo;});

      if (controller.signal.aborted) return;

      const scale = Math.min(1,1600/Math.max(img.width,img.height));

      const canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));

      const ctx=canvas.getContext("2d");if(!ctx)throw new Error("This browser cannot prepare the photo.");

      ctx.fillStyle="#ffffff";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);

      const image=canvas.toDataURL("image/jpeg",0.85).split(",")[1];

      if (!image || image.length>4_200_000) throw new Error("Choose a smaller photo and try again.");

      const result=await fetch("/api/analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({image,mimeType:"image/jpeg",notes}),signal:controller.signal});

      const data=await result.json() as {analysis?:MealAnalysis;error?:string};

      if(!result.ok || !data.analysis)throw new Error(data.error || "The analysis could not be completed. Please try again.");

      if(currentUpload!==uploadId.current || controller.signal.aborted)return;

      setAnalysis(data.analysis);setWeights(data.analysis.foods.map(f=>f.grams));setPortion(1);

      goView("explore");

    } catch(e) { if(!controller.signal.aborted && currentUpload===uploadId.current)setError(e instanceof Error?e.message:"The analysis could not be completed. Please try again."); }

    finally {if(analysisAbort.current===controller){setLoading(false);analysisAbort.current=null;}}

  }

  useEffect(()=>()=>{analysisAbort.current?.abort();uploadId.current++;},[]);

  const readyToExplore=!photo||!!analysis;
  const screenCopy=view==="capture"?{number:"01",eyebrow:"THE MEAL STUDIO",title:<>Your plate.<br/><em>A new perspective.</em></>,description:"Capture a moment. Discover the nutrition within."}:view==="explore"?{number:"02",eyebrow:"THE EXPLORER",title:<>See your meal<br/><em>in another dimension.</em></>,description:"Rotate. Select. Discover what every ingredient contributes."}:{number:"03",eyebrow:"THE NUTRITION REPORT",title:<>The details.<br/><em>The bigger picture.</em></>,description:"Compare ingredients and understand the balance of your meal."};
  return <Tabs value={view} onValueChange={goView} className="app-shell cinema-app">
    <div className="cinema-backdrop" aria-hidden="true"><img src={photo??sampleImage} alt=""/></div>

    <header className="topbar">

      <button className="brand" onClick={()=>goView("capture")} aria-label="NutriLens capture view"><span className="brand-icon"><Sprout size={23}/></span>nutrilens<span className="brand-period">.</span></button>

      <TabsList className="screen-tabs" aria-label="App views"><TabsTrigger value="capture"><Camera size={16}/><span>Capture</span></TabsTrigger><TabsTrigger value="explore"><Box size={16}/><span>3D Explorer</span></TabsTrigger><TabsTrigger value="report"><ChartNoAxesCombined size={16}/><span>Nutrition</span></TabsTrigger></TabsList>

      <span className="app-preview-label">MEAL STUDIO</span>

    </header>

    <main id="analyzer">

      <div className="cinema-heading"><div><div className="eyebrow"><span className="scene-number">{screenCopy.number} / 03</span>{screenCopy.eyebrow}</div><h1>{screenCopy.title}</h1><p>{screenCopy.description}</p></div><div className="scene-status"><span>{analysis?"YOUR ANALYZED MEAL":photo?"YOUR NEXT DISCOVERY":"SAMPLE EXPERIENCE"}</span><strong>{analysis?.title??(photo?"Ready for a closer look":"Salmon rainbow bowl")}</strong><small>{analysis?"Photo estimates · editable portions":photo?"Your photo is ready to analyze":"Explore the sample or capture your own meal"}</small></div></div>
      {readyToExplore&&<div className="meal-hud"><div><span>ENERGY</span><strong>{kcal}<small> kcal</small></strong></div><div><span>PROTEIN</span><strong>{Math.round(totals.protein)}<small> g</small></strong></div><div><span>CARBS</span><strong>{Math.round(totals.carbs)}<small> g</small></strong></div><div><span>FAT</span><strong>{Math.round(totals.fat)}<small> g</small></strong></div><div className="hud-portion"><label>Portion <strong>{portion}×</strong></label><Slider aria-label="Meal portion multiplier" value={[portion]} min={.25} max={2} step={.25} onValueChange={v=>setPortion(v[0])}/></div></div>}
      <TabsContent value="capture" forceMount hidden={view!=="capture"} className="cinematic-screen capture-screen">
      <ol className="journey-steps" aria-label="Meal analysis steps"><li className={photo?"complete":"current"}><span>{photo?<Check size={15}/>:"1"}</span><div><strong>Capture your meal</strong><small>Take a photo or upload one</small></div></li><li className={analysis?"complete":photo?"current":""}><span>{analysis?<Check size={15}/>:"2"}</span><div><strong>Discover its nutrition</strong><small>Add portion details, then analyze</small></div></li><li className={analysis?"current":""}><span>3</span><div><strong>Explore in 3D</strong><small>Rotate, select, and adjust portions</small></div></li></ol>

      {!photo && <div className="sample-explanation"><Sparkles size={17}/><p><strong>You’re exploring a sample meal.</strong> Explore its calories and ingredients, or add your own photo to get started.</p><button onClick={()=>goView("explore")}>Explore sample <ArrowRight size={14}/></button></div>}

      <div className="workspace">

        <section className="meal-column" aria-labelledby="meal-title">

          <div className="section-heading"><h2 id="meal-title"><span className="step">01</span>Your meal</h2><span className="muted small">A photo is the first step</span></div>

          <div className={`upload-zone ${dragging ? "dragging" : ""}`} onDragOver={e => {e.preventDefault(); setDragging(true);}} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); void upload(e.dataTransfer.files[0]); }}>

            <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Upload a meal photo" className="sr-only" onChange={e => {void upload(e.target.files?.[0]); e.target.value = "";}}/>

            <span className="upload-icon"><ImagePlus size={27} strokeWidth={1.5}/></span>

            <h3>What’s on your plate?</h3><p>Drop your food photo here</p>

            <div className="photo-source-actions"><button className="primary-button" onClick={() => setCameraOpen(true)}><Camera size={17}/>Take a photo</button><button className="secondary-button" onClick={() => input.current?.click()}><Upload size={16}/>Upload photo</button></div>

            <span className="file-types">JPG, PNG or WebP · up to 10 MB</span>

          </div>

          {error && <div role="alert" className="error-message">{error}{/sign in/i.test(error)&&<a className="text-button" href="/signin-with-chatgpt?return_to=/">Sign in to continue <ArrowRight size={14}/></a>}</div>}

          <p className="photo-tip"><Info size={15}/>For a clearer estimate, photograph the whole plate in good light.</p>

          <div className="photo-card">

            <div className="photo-wrap"><img src={photo ?? sampleImage} alt={photo ? "Your uploaded meal" : "Colorful salmon poke bowl with vegetables and grains"}/><span className="photo-label"><Camera size={14}/>{photo ? "Your photo" : "Sample meal"}</span>{photo && <button className="remove-photo" aria-label="Remove uploaded photo" onClick={resetSample}><X size={17}/></button>}</div>

            <div className="photo-caption"><div><h3>{analysis?.title ?? (photo ? "Your meal is ready to analyze" : "Salmon rainbow bowl")}</h3><p>{photo ? fileName : "Salmon, quinoa, edamame & colorful plants"}</p></div>{!photo && <span className="round-icon"><Utensils size={18}/></span>}</div>

          </div>

          {photo ? <div className="upload-actions"><label className="notes-label" htmlFor="meal-notes">Anything the photo doesn’t show? <span>Optional</span></label><Textarea id="meal-notes" value={notes} onChange={e=>setNotes(e.target.value)} maxLength={500} placeholder="e.g. 1 cup cooked rice, a teaspoon of olive oil…" className="meal-notes"/><button disabled={loading} className="primary-button full-width" onClick={()=>void analyze()}>{loading ? <LoaderCircle size={17} className="spin"/> : <Sparkles size={17}/>} {loading ? "Taking a closer look…" : analysis ? "Analyze meal again" : "Analyze my meal"}{!loading && <ArrowRight size={17}/>}</button><p className="small muted">Analyzing securely sends your photo and notes to our AI provider, Google Gemini. Estimates can be adjusted afterward.</p>{loading && <button className="text-button" onClick={()=>{analysisAbort.current?.abort();setLoading(false);}}>Cancel analysis</button>}<button className="text-button" onClick={resetSample}>Return to sample meal <RotateCcw size={14}/></button></div> : <div className="photo-hint"><ShieldCheck size={17}/><p>Your photo stays in this tab until you choose to analyze it.</p></div>}

        </section>

        <section className="results-column" id="meal-results" tabIndex={-1} aria-labelledby="results-title">

          <div className="section-heading"><h2 id="results-title"><span className="step">02</span>Nutrition at a glance</h2><span className="sample-badge">{analysis ? "AI estimate" : photo ? "Awaiting analysis" : "Sample results"}</span></div>

          {photo && !analysis ? <div className="awaiting-card" aria-live="polite"><span className="upload-icon"><Sparkles size={28}/></span><h2>{loading ? "Looking at your plate…" : "A closer look at your meal"}</h2><p>{loading ? "The AI is identifying foods and estimating their portions and nutrients. This can take a moment." : "Analyze your photo for an ingredient breakdown, estimated nutrients, and an interactive 3D view."}</p><div className="waiting-features"><span><Flame size={18}/> Calories</span><span><Utensils size={18}/> Macronutrients</span><span><Leaf size={18}/> Meal balance</span></div><button className="primary-button waiting-analyze" disabled={loading} onClick={()=>void analyze()}>{loading?"Analyzing your meal…":"Analyze my meal"}<ArrowRight size={16}/></button><button className="secondary-button" onClick={resetSample}>Try the sample analysis <ArrowRight size={16}/></button><p className="small muted">Your results will appear here after you analyze the photo.</p></div> : <>

            <div className="nutrition-card" aria-busy={loading}>

              <div className="nutrition-top"><div><span className="overline">ESTIMATED ENERGY</span><div className="calorie-value">{kcal}<span>kcal</span></div><p className="small muted">For the selected portion</p></div><div className="macro-donut" role="img" aria-label={`Energy split: protein ${proteinPct}%, carbs ${carbsPct}%, fat ${fatPct}%`} style={{background: kcal ? `conic-gradient(#acd575 0 ${proteinPct}%, #dfa14a ${proteinPct}% ${proteinPct + carbsPct}%, #a5b7e4 ${proteinPct + carbsPct}% 100%)` : "#354336"}}><div><Utensils size={24}/><span>Macro split</span></div></div></div>

              <div className="macro-grid">{[{label:"Protein",value:totals.protein,pct:proteinPct,color:"#acd575"},{label:"Carbs",value:totals.carbs,pct:carbsPct,color:"#dfa14a"},{label:"Fat",value:totals.fat,pct:fatPct,color:"#a5b7e4"}].map(m => <div className="macro" key={m.label}><span className="macro-label"><i style={{background:m.color}}/>{m.label}</span><strong>{Math.round(m.value)}<span>g</span></strong><span className="small muted">{m.pct}% of energy</span></div>)}</div>


            </div>

            <div className="balance-card"><div className="balance-top"><span className="balance-icon"><Leaf size={23}/></span><div><div className="overline">THE BALANCE PICTURE</div><h3>{analysis ? "Your meal, in perspective." : hasPlants && hasProtein && hasGrains ? "A little variety goes a long way." : "Make room for more variety."}</h3></div><Sparkles size={21} className="balance-sparkle"/></div><p>{analysis ? analysis.balance : hasPlants && hasProtein && hasGrains ? "This sample brings together protein, grains, and colorful plants. That variety is a useful starting point for a balanced meal." : "Try combining a protein source with grains and a variety of vegetables. Adjust food amounts in the Explorer or Nutrition view to explore the mix."}</p><div className="balance-tags"><span><Check size={13}/>{hasProtein ? "Protein sources" : "Add some protein"}</span><span><Leaf size={13}/>{Math.round(totals.fiber)}g estimated fiber</span></div><div className="balance-tip"><span>ONE THING TO CONSIDER</span><p>{analysis?.suggestion || "Dressing and cooking oils can change the estimate. Check the amount if you know it."}</p>{analysis && <p className="balance-adjustment">Meal perspective describes the original photo. Edited amounts change the nutrition totals above.</p>}</div></div>

          </>}

        </section>

      </div>

      {readyToExplore&&<div className="next-scene"><div><span>NEXT CHAPTER</span><h2>Go beyond the numbers.</h2></div><button className="primary-button" onClick={()=>goView("explore")}>Enter the 3D Explorer <ArrowRight size={18}/></button></div>}
      </TabsContent>
      <TabsContent value="explore" forceMount hidden={view!=="explore"} className="cinematic-screen explorer-screen">
        {readyToExplore?<><MealExplorer key={photo??"sample"} foods={foods} weights={weights} portion={portion} image={photo??sampleImage} analysis={analysis} onWeightChange={(index,value)=>setWeights(w=>w.map((v,i)=>i===index?value:v))}/><div className="next-scene"><div><span>THE COMPLETE PICTURE</span><h2>Every nutrient. Side by side.</h2></div><button className="primary-button" onClick={()=>goView("report")}>Open nutrition report <ArrowRight size={18}/></button></div></>:<div className="scene-empty"><Box size={42}/><h2>Your meal’s story starts with an analysis.</h2><p>{loading?"Your photo is being analyzed. Your explorer will open when it is ready.":"Return to Capture to analyze your photo, or explore the sample first."}</p><button className="primary-button" onClick={()=>goView("capture")}>Back to Capture <ArrowRight size={17}/></button><button className="text-button" onClick={resetSample}>Explore the sample instead</button></div>}
      </TabsContent>
      <TabsContent value="report" forceMount hidden={view!=="report"} className="cinematic-screen report-screen">
        {readyToExplore?<><NutritionDetails foods={foods} weights={weights} portion={portion} analysis={analysis} onWeightChange={(index,value)=>setWeights(w=>w.map((v,i)=>i===index?value:v))} onReset={()=>{setWeights(foods.map(f=>f.grams));setPortion(1);}}/><div className="next-scene"><div><span>A FRESH PERSPECTIVE</span><h2>Ready for your next meal?</h2></div><button className="primary-button" onClick={()=>goView("capture")}>Return to Capture <Camera size={18}/></button></div></>:<div className="scene-empty"><ChartNoAxesCombined size={42}/><h2>Your detailed report will appear here.</h2><p>Analyze your meal photo to compare its estimated nutrients.</p><button className="primary-button" onClick={()=>goView("capture")}>Back to Capture <ArrowRight size={17}/></button></div>}
      </TabsContent>
    </main>

    {cameraOpen && <CameraCapture onClose={()=>setCameraOpen(false)} onCapture={file=>{setCameraOpen(false);void upload(file);}} onUpload={()=>{setCameraOpen(false);input.current?.click();}}/>}

    <footer><button className="brand" onClick={()=>goView("capture")}><Sprout size={19}/>nutrilens.</button><span>Food curiosity, without the judgment.</span><a href="https://unsplash.com/photos/a-bowl-of-food-on-a-plate-Be2IMDyTDII" target="_blank" rel="noreferrer">Photo by Oskar Kadaksoo <ChevronRight size={12}/></a></footer>

  </Tabs>;

}
