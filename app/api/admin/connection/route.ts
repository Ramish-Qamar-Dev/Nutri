import { currentAdmin,effectiveApiKey,limited } from '@/lib/admin-store';
import { testProvider } from '@/lib/admin-access';
import { AdminError,failure,reply,sameOrigin } from '@/lib/admin-http';
export async function POST(request:Request){try{sameOrigin(request);const user=await currentAdmin();if(!user)throw new AdminError(401,'Sign in to continue.');if(await limited('connection:'+user.id,10))throw new AdminError(429,'Please wait before testing again.');return reply(await testProvider(await effectiveApiKey()));}catch(error){return failure(error);}}
