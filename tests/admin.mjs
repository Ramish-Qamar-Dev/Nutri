import assert from 'node:assert/strict';
import {adminAccess,adminEmails,testProvider,ADMIN_HEADERS} from '../lib/admin-access.ts';
const admin={userId:'verified-owner',email:'owner@example.com'};
assert.equal(adminAccess(null,'owner@example.com'),'signed-out');
assert.equal(adminAccess({...admin,userId:''},'owner@example.com'),'signed-out');
assert.equal(adminAccess(admin,undefined),'forbidden');
assert.equal(adminAccess(admin,''),'forbidden');
assert.equal(adminAccess(admin,'other@example.com'),'forbidden');
assert.equal(adminAccess(admin,'owner@example.com.attacker.test'),'forbidden');
assert.equal(adminAccess(admin,'OWNER@example.com'),'admin');
assert.equal(adminAccess({...admin,email:'OWNER@EXAMPLE.COM'},'owner@example.com'),'admin');
assert.deepEqual(adminEmails(' owner@example.com,OWNER@example.com, invalid ,second@example.com'),['owner@example.com','second@example.com']);
assert.match(ADMIN_HEADERS['Cache-Control'],/no-store/);
let called=false;
assert.equal((await testProvider(undefined,async()=>{called=true;})).ok,false);assert.equal(called,false);
const key='test-provider-secret-do-not-return';
const result=await testProvider(key,async(url,options)=>{assert.equal(url,'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent');assert.equal(options.headers['x-goog-api-key'],key);assert.equal(options.method,'POST');assert.equal(JSON.parse(options.body).generationConfig.responseMimeType,'application/json');return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:'{"ok":true}'}]}}]});});
assert.equal(result.ok,true);
assert.match(result.message,/successfully generated/);
for(const status of [400,401,403,429,500]){const failure=await testProvider(key,async()=>new Response(key,{status}));assert.equal(failure.ok,false);assert.ok(!JSON.stringify(failure).includes(key));}
const failure=await testProvider(key,async()=>{throw new Error(key);});assert.equal(failure.ok,false);assert.ok(!JSON.stringify(failure).includes(key));
console.log('Admin checks passed: fail-closed allowlist, exact membership, empty configuration, case normalization, safe provider diagnostics and no credential leakage.');

for(const [status,message,code] of [[403,'Your API key was reported as leaked: '+key,'PROVIDER_KEY_BLOCKED'],[400,'User location is not supported','PROVIDER_REGION_UNAVAILABLE'],[429,'Quota exceeded '+key,'PROVIDER_QUOTA'],[404,'Model not found','PROVIDER_MODEL_UNAVAILABLE']]){
 const result=await testProvider(key,async()=>Response.json({error:{message}},{status}));assert.equal(result.code,code);assert.equal(result.ok,false);assert.ok(!JSON.stringify(result).includes(key));
}
assert.equal((await testProvider(key,async()=>Response.json({}))).ok,false);
assert.equal((await testProvider(key,async()=>{throw new DOMException('timeout','TimeoutError');})).code,'PROVIDER_TIMEOUT');
console.log('Generation checks passed: structured response, rejection categories, empty response, timeout, and credential redaction.');
