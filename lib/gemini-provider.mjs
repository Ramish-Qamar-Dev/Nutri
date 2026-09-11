export const GENERATION_URL='https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent';

// Classify upstream errors without returning provider text, credentials, or request data.
export async function providerFailure(response) {
  let message='';
  try { const data=await response.json(); message=String(data?.error?.message??'').toLowerCase(); } catch {}
  if(message.includes('leaked'))return {code:'PROVIDER_KEY_BLOCKED',message:'Google blocked this key because it was reported as exposed. Create a new Gemini key and replace the saved key here.'};
  if(/location|region|country/.test(message)&&/support|allow|available/.test(message))return {code:'PROVIDER_REGION_UNAVAILABLE',message:'Google does not allow generation from this server location or account region. Review regional availability in Google AI Studio.'};
  if(response.status===429)return {code:'PROVIDER_QUOTA',message:'Google rejected generation because of a quota or rate limit. Review this project’s Gemini API quota and billing in Google AI Studio.'};
  if(response.status===404)return {code:'PROVIDER_MODEL_UNAVAILABLE',message:'Google cannot generate with the selected model. Update the service model.'};
  if([401,403].includes(response.status))return {code:'PROVIDER_ACCESS_DENIED',message:'Google denied generation. Check the saved key, its API restrictions, and access to the Generative Language API.'};
  if(response.status===400)return {code:'PROVIDER_REQUEST_REJECTED',message:'Google rejected the generation request. Check the key and the model’s supported request settings.'};
  return {code:'PROVIDER_UNAVAILABLE',message:'Google’s generation service is temporarily unavailable. Try again shortly.'};
}
