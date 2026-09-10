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
  if(!apiKey)return {ok:false,message:'No server API key is configured. Add GEMINI_API_KEY in the hosting settings first.'};
  try{
    // Model metadata only: no meal image, generation request, or customer data.
    const response=await send('https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest',{headers:{'x-goog-api-key':apiKey},signal:AbortSignal.timeout(12_000)});
    if(response.ok)return {ok:true,message:'Google accepted the server key and returned model information. Meal generation and available quota have not been tested.'};
    if([400,401,403].includes(response.status))return {ok:false,message:'Google rejected the configured key. Check the key and its restrictions in the provider console.'};
    if(response.status===429)return {ok:false,message:'Google reported a quota or rate limit. Review provider usage before retrying.'};
    return {ok:false,message:'The provider could not confirm model availability. Check the model and try again later.'};
  }catch{return {ok:false,message:'The server could not reach Google. Check outbound network access and try again.'};}
}
