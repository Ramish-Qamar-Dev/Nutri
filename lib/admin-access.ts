import { GENERATION_URL,providerFailure } from './gemini-provider.mjs';
type Identity = {userId:string;email:string};
export function adminEmails(config?:string) {
  return [...new Set((config??'').split(',').map(email=>email.trim().toLowerCase()).filter(email=>/^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/.test(email)))];
}
export function adminAccess(user:Identity|null,config?:string):'signed-out'|'forbidden'|'admin' {
  if(!user?.userId||!user.email)return 'signed-out';
  return adminEmails(config).includes(user.email.trim().toLowerCase())?'admin':'forbidden';
}
export const ADMIN_HEADERS={'Cache-Control':'private, no-store, max-age=0','X-Content-Type-Options':'nosniff'};

export async function testProvider(apiKey:string|undefined,send:typeof fetch=fetch) {
  if(!apiKey)return {ok:false,message:'No Gemini key is saved. Add a key in the AI service settings.'};
  try{
    const response=await send(GENERATION_URL,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':apiKey},body:JSON.stringify({contents:[{parts:[{text:'Return the JSON object {"ok":true}.'}]}],generationConfig:{responseMimeType:'application/json',responseSchema:{type:'OBJECT',properties:{ok:{type:'BOOLEAN'}},required:['ok']},maxOutputTokens:256,thinkingConfig:{thinkingLevel:'minimal'}}}),signal:AbortSignal.timeout(30_000)});
    if(!response.ok)return {ok:false,...await providerFailure(response)};
    const data=await response.json() as {candidates?:{finishReason?:string;content?:{parts?:{text?:string;thought?:boolean}[]}}[]};
    const candidate=data.candidates?.[0];
    const raw=candidate?.content?.parts?.filter(p=>!p.thought).map(p=>p.text??'').join('')??'';
    let valid=false;try{valid=JSON.parse(raw).ok===true;}catch{}
    if(candidate?.finishReason!=='STOP'||!valid)return {ok:false,code:'PROVIDER_TEST_INCOMPLETE',message:'Google accepted the request but did not finish a valid test response. Please retry.'};
    return {ok:true,message:'Google successfully generated a structured response with the saved key. Text generation works now; photo analysis and future quota are not guaranteed.'};
  }catch(error){
    if(error instanceof Error&&['TimeoutError','AbortError'].includes(error.name))return {ok:false,code:'PROVIDER_TIMEOUT',message:'Google did not finish the generation test within 30 seconds. Try again shortly.'};
    return {ok:false,code:'PROVIDER_CONNECTION_FAILED',message:'The server could not complete the Google generation test. Check outbound network access and try again.'};
  }
}
