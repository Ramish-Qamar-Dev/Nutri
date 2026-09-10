import { env } from 'cloudflare:workers';
import { z } from 'zod';
import { normalizeApiKey,apiKeyInputError } from '@/lib/api-key-input';
import { currentAdmin,database,auditStatement,limited } from '@/lib/admin-store';
import { seal } from '@/lib/admin-crypto';
import { AdminError,bodyJSON,failure,reply,sameOrigin } from '@/lib/admin-http';
export async function POST(request:Request){try{
  sameOrigin(request);
  const admin=await currentAdmin();if(!admin)throw new AdminError(401,'Sign in to continue.');
  if(await limited('key:'+admin.id,10))throw new AdminError(429,'Too many key changes. Please wait before trying again.');
  const parsed=z.object({apiKey:z.string().max(1024)}).strict().safeParse(await bodyJSON(request));
  if(!parsed.success)throw new AdminError(400,'Paste only the full Gemini API key, without other dashboard content.');
  const apiKey=normalizeApiKey(parsed.data.apiKey);
  const inputError=apiKeyInputError(apiKey);
  if(inputError)throw new AdminError(400,inputError);
  if(!env.ADMIN_VAULT_KEY)throw new AdminError(503,'Secure key storage needs its server encryption key configured.');
  const encrypted=seal(apiKey,env.ADMIN_VAULT_KEY);
  await database().batch([database().prepare("INSERT INTO service_secrets(name,ciphertext,updated_at) VALUES('gemini',?,?) ON CONFLICT(name) DO UPDATE SET ciphertext=excluded.ciphertext,updated_at=excluded.updated_at").bind(encrypted,Date.now()),auditStatement(admin.id,'api_key_updated','gemini')]);
  return reply({ok:true,message:'API key encrypted and saved. It is ready for the connection test.'});
}catch(error){return failure(error);}}
