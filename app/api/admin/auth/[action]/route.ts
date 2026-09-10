import { env } from 'cloudflare:workers';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { adminEmails } from '@/lib/admin-access';
import { AdminError,bodyJSON,failure,reply,sameOrigin } from '@/lib/admin-http';
import { ADMIN_COOKIE,adminExists,auditStatement,cleanup,cookieOptions,currentAdmin,database,limited,type Admin } from '@/lib/admin-store';
import { constantEqual,digest,hashPassword,token,verifyPassword } from '@/lib/admin-crypto';
import { loginSchema,setupSchema } from '@/lib/admin-validation';

export async function POST(request:Request,context:{params:Promise<{action:string}>}){
  try{
    sameOrigin(request);
    const {action}=await context.params,db=database();
    if(action==='logout'){
      const raw=(await cookies()).get(ADMIN_COOKIE)?.value;
      if(raw)await db.prepare('DELETE FROM admin_sessions WHERE token_hash=?').bind(digest(raw)).run();
      (await cookies()).set(ADMIN_COOKIE,'',{...cookieOptions,maxAge:0});return reply({ok:true});
    }
    if(!['login','setup','setup-check','password'].includes(action))throw new AdminError(404,'Unknown action.');
    if(await limited('auth:ip:'+digest(request.headers.get('cf-connecting-ip')??'local'),20)||await limited('auth:global',100))throw new AdminError(429,'Too many attempts. Please wait 15 minutes before trying again.');
    const body=await bodyJSON(request);
    if(action==='setup-check'){
      if(await adminExists())throw new AdminError(409,'Administrator setup is already complete. Sign in instead.');
      if(!env.ADMIN_SETUP_TOKEN)throw new AdminError(503,'The server setup token is not configured. Contact the deployment administrator.');
      const parsed=z.object({setupToken:z.string().trim().min(32).max(128)}).strict().safeParse(body);
      if(!parsed.success||!constantEqual(parsed.data.setupToken,env.ADMIN_SETUP_TOKEN))throw new AdminError(403,'The setup token is incorrect. Copy only the token value from your private setup file.');
      const emails=adminEmails(env.ADMIN_EMAILS);
      if(!emails.length)throw new AdminError(503,'No owner email is configured on the server.');
      return reply({ok:true,email:emails[0]});
    }
    if(action==='password'){
      const user=await currentAdmin();if(!user)throw new AdminError(401,'Sign in to continue.');
      const values=z.object({currentPassword:z.string().min(1).max(128),newPassword:z.string().min(15).max(128)}).strict().safeParse(body);
      if(!values.success)throw new AdminError(400,'Use a new password with 15–128 characters.');
      const account=await db.prepare('SELECT password_hash FROM admin_accounts WHERE id=?').bind(user.id).first<{password_hash:string}>();
      if(!account||!await verifyPassword(values.data.currentPassword,account.password_hash))throw new AdminError(401,'Current password is incorrect.');
      await db.batch([db.prepare('UPDATE admin_accounts SET password_hash=? WHERE id=?').bind(await hashPassword(values.data.newPassword),user.id),db.prepare('DELETE FROM admin_sessions WHERE admin_id=?').bind(user.id),auditStatement(user.id,'password_changed')]);
      (await cookies()).set(ADMIN_COOKIE,'',{...cookieOptions,maxAge:0});return reply({ok:true});
    }
    if(action==='setup'){
      if(await adminExists())throw new AdminError(409,'Administrator setup is already complete. Sign in instead.');
      const parsed=setupSchema.safeParse(body);
      if(!parsed.success)throw new AdminError(400,'Enter a valid email, setup token, and password with 15–128 characters.');
      const data=parsed.data;
      if(!env.ADMIN_SETUP_TOKEN)throw new AdminError(503,'The server setup token is not configured.');
      if(!constantEqual(data.setupToken,env.ADMIN_SETUP_TOKEN))throw new AdminError(403,'The setup token is incorrect. Copy only the token value from your private setup file.');
      if(!adminEmails(env.ADMIN_EMAILS).includes(data.email))throw new AdminError(403,'This email is not authorized. Use Verify setup token to fill in the owner email.');
      const hash=await hashPassword(data.password);
      const result=await db.prepare("INSERT INTO admin_accounts(id,email,password_hash,created_at) VALUES('owner',?,?,?) ON CONFLICT(id) DO NOTHING RETURNING id").bind(data.email,hash,Date.now()).first();
      if(!result)throw new AdminError(409,'Administrator setup is already complete.');
      await auditStatement('owner','account_created').run();return reply({ok:true});
    }
    const parsed=loginSchema.safeParse(body);if(!parsed.success)throw new AdminError(400,'Enter your email and password.');
    if(await limited('auth:email:'+digest(parsed.data.email),10))throw new AdminError(429,'Too many attempts. Please wait 15 minutes before trying again.');
    const account=await db.prepare('SELECT id,email,password_hash FROM admin_accounts WHERE email=?').bind(parsed.data.email).first<Admin>();
    const dummy='scrypt-v1$'+'0'.repeat(32)+'$'+'0'.repeat(64);
    const valid=await verifyPassword(parsed.data.password,account?.password_hash??dummy);
    if(!account||!valid)throw new AdminError(401,'Email or password is incorrect.');
    const raw=token(),now=Date.now();
    await cleanup();
    const created=await db.prepare('INSERT INTO admin_sessions(token_hash,admin_id,expires_at,last_seen) SELECT ?,id,?,? FROM admin_accounts WHERE id=? AND password_hash=? RETURNING token_hash').bind(digest(raw),now+8*60*60*1000,now,account.id,account.password_hash).first();
    if(!created)throw new AdminError(401,'Account credentials changed. Sign in again.');
    await auditStatement(account.id,'signed_in').run();
    (await cookies()).set(ADMIN_COOKIE,raw,cookieOptions);return reply({ok:true});
  }catch(error){return failure(error);}
}
