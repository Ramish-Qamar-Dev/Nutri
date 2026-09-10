import { handleAnalysis } from "@/lib/meal-analysis";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { currentAdmin,effectiveApiKey,limited } from '@/lib/admin-store';
import { digest } from '@/lib/admin-crypto';
export async function POST(request:Request){
 try{
  const admin=await currentAdmin(),user=admin??await getChatGPTUser();
  if(!user)return Response.json({error:'Please sign in to analyze your meal.',code:'SIGN_IN_REQUIRED'},{status:401,headers:{'Cache-Control':'no-store'}});
  const key=await effectiveApiKey();
  if(key){
   const id='id' in user?user.id:user.userId;
   if(await limited('analysis:user:'+digest(id),20,86400000)||await limited('analysis:global',100,86400000))return Response.json({error:'The analysis limit has been reached. Please try again after your daily window resets.'},{status:429,headers:{'Cache-Control':'no-store'}});
  }
  return handleAnalysis(request,fetch,key);
 }catch{return Response.json({error:'Photo analysis is temporarily unavailable. Please try again later.'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
