import assert from 'node:assert/strict';
import { handleAnalysis as handleWithServerKey } from '../lib/meal-analysis.ts';
const serverKey='AQ.test-key-for-local-validation-only';
const handleAnalysis=(request,send)=>handleWithServerKey(request,send,serverKey);
const input={image:'/9j/AA==',mimeType:'image/jpeg',notes:'one small bowl'};
const analysis={isFood:true,title:'Grain bowl',foods:[{name:'Rice',category:'Grains',grams:150,protein:4,carbs:42,fat:1,fiber:1,box:[10,20,800,900],benefit:'Provides carbohydrate.',consideration:'The portion is estimated.'}],balance:'A grain-based meal.',suggestion:'Add a variety of vegetables.',uncertainty:'Portion size is approximate.',advantages:['Includes a grain source.'],disadvantages:['Photo portions are uncertain.']};
const request=(body=input,extra={})=>new Request('http://localhost:5173/api/analyze',{method:'POST',headers:{'Content-Type':'application/json',...extra},body:JSON.stringify(body)});
let upstreamCalls=0;
const ok=async(url,options)=>{upstreamCalls++;assert.equal(url,'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent');assert.equal(options.headers['x-goog-api-key'],serverKey);const sent=JSON.parse(options.body);assert.equal(sent.contents[0].parts[1].inlineData.mimeType,'image/jpeg');assert.equal(sent.generationConfig.responseMimeType,'application/json');return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(analysis)}]}}]});};
const success=await handleAnalysis(request(),ok);assert.equal(success.status,200);assert.deepEqual((await success.json()).analysis,analysis);assert.match(success.headers.get('cache-control'),/no-store/);
const invalid=await handleAnalysis(request({...input,apiKey:''}),ok);assert.equal(invalid.status,400);assert.equal(upstreamCalls,1);
assert.equal((await handleAnalysis(request(input,{origin:'https://another.example'}),ok)).status,403);
assert.equal((await handleAnalysis(request({...input,mimeType:'text/html'}),ok)).status,400);
assert.equal((await handleAnalysis(request({...input,image:'a'.repeat(4_600_000)}),ok)).status,400);
for(const code of [401,403,429,500]){const result=await handleAnalysis(request(),async()=>Response.json({secret:serverKey},{status:code}));assert.equal(result.status,[401,403].includes(code)?503:code===500?502:code);assert.ok(!(await result.text()).includes(serverKey));}
const modelReply=(data,finishReason='STOP')=>async()=>Response.json({candidates:[{finishReason,content:{parts:[{text:JSON.stringify(data)}]}}]});
assert.equal((await handleAnalysis(request(),modelReply({...analysis,isFood:false,foods:[]}))).status,422);
assert.equal((await handleAnalysis(request(),modelReply({unexpected:true}))).status,502);
assert.equal((await handleAnalysis(request(),modelReply(analysis,'MAX_TOKENS'))).status,422);
assert.equal((await handleAnalysis(request(),modelReply({...analysis,foods:[{...analysis.foods[0],protein:900}]}))).status,502);
assert.equal((await handleAnalysis(request(),async()=>{throw new DOMException('timed out','TimeoutError')})).status,504);
assert.equal((await handleAnalysis(request(),async()=>Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:'not json'}]}}]}))).status,502);
console.log('Gemini handler: success, invalid key, origin, image, size, provider errors, quota, no food, schema, incomplete output, nutrient bounds, timeout, and malformed output passed. Provider calls mocked; live credentials not supplied.');

assert.equal((await handleAnalysis(request(),modelReply({...analysis,foods:[{...analysis.foods[0],box:[900,0,10,1000]}]}))).status,502);
assert.equal((await handleAnalysis(request(),modelReply({...analysis,foods:[{...analysis.foods[0],box:[0,0,1001,1000]}]}))).status,502);
assert.equal((await handleAnalysis(request(),modelReply({...analysis,advantages:[] ,foods:[{...analysis.foods[0],box:null}]}))).status,200);
assert.equal((await handleAnalysis(request(),modelReply({...analysis,advantages:['x'.repeat(251)]}))).status,502);
console.log('Extended response: located ingredients, invalid/reversed regions, unlocated ingredients, and bounded meal observations passed.');

// Transport restrictions must not be reported as unreadable model estimates.
for (const code of ['EACCES','EPERM','ENOTFOUND','ECONNRESET']) {
  const response = await handleAnalysis(request(),async()=>{throw new TypeError('fetch failed',{cause:{code}});});
  assert.equal(response.status,503);
  const data=await response.json();
  assert.equal(data.code,['EACCES','EPERM'].includes(code)?'NETWORK_ACCESS_BLOCKED':'PROVIDER_CONNECTION_FAILED');
  assert.ok(!JSON.stringify(data).includes(serverKey));
}
for (const reply of [async()=>new Response('invalid gateway response'),async()=>Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:'invalid meal JSON'}]}}]})]) {
  const response=await handleAnalysis(request(),reply);
  assert.equal(response.status,502);
  assert.equal((await response.json()).code,'INVALID_PROVIDER_RESPONSE');
}
console.log('Network restrictions, connection failures, and unreadable provider responses are reported separately without exposing credentials.');

const unconfigured=await handleWithServerKey(request(),()=>{throw new Error('Provider must not be called without server credentials');});
assert.equal(unconfigured.status,503);
assert.equal((await unconfigured.json()).code,'ANALYSIS_NOT_CONFIGURED');
const injected=await handleAnalysis(request({...input,apiKey:'client-key-must-not-be-accepted'}),ok);
assert.equal(injected.status,400);
console.log('Server-only credentials: missing configuration fails closed; client-supplied keys are rejected.');

let overloadCalls=0;
const recovered=await handleAnalysis(request(),async(...args)=>{overloadCalls++;return overloadCalls===1?new Response('{}',{status:503}):ok(...args);});
assert.equal(recovered.status,200);assert.equal(overloadCalls,2);
let persistentCalls=0;
assert.equal((await handleAnalysis(request(),async()=>{persistentCalls++;return new Response('{}',{status:503});})).status,502);assert.equal(persistentCalls,2);
const retired=await handleAnalysis(request(),async()=>new Response('{}',{status:404}));assert.equal((await retired.json()).code,'PROVIDER_MODEL_UNAVAILABLE');
console.log('Model retirement is identified; overload retry succeeds or stops after two attempts.');
