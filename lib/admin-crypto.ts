import { randomBytes,scrypt,timingSafeEqual,createHash,createCipheriv,createDecipheriv } from 'node:crypto';
const options={N:16384,r:8,p:5,maxmem:32*1024*1024};
export const token=()=>randomBytes(32).toString('base64url');
export const digest=(value:string)=>createHash('sha256').update(value).digest('hex');
export const constantEqual=(a:string,b:string)=>timingSafeEqual(Buffer.from(digest(a),'hex'),Buffer.from(digest(b),'hex'));
const derive=(password:string,salt:string)=>new Promise<Buffer>((resolve,reject)=>scrypt(password,salt,32,options,(error,key)=>error?reject(error):resolve(key)));
export async function hashPassword(password:string){const salt=randomBytes(16).toString('hex');return `scrypt-v1$${salt}$${(await derive(password,salt)).toString('hex')}`;}
export async function verifyPassword(password:string,hash:string){const [version,salt,expected]=hash.split('$');if(version!=='scrypt-v1'||!/^[a-f0-9]{32}$/.test(salt??'')||!/^[a-f0-9]{64}$/.test(expected??''))return false;return timingSafeEqual(await derive(password,salt),Buffer.from(expected,'hex'));}
function vaultKey(key:string){if(!/^[a-f0-9]{64}$/i.test(key))throw new Error('Vault configuration unavailable');return Buffer.from(key,'hex');}
export function seal(value:string,key:string){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',vaultKey(key),iv);cipher.setAAD(Buffer.from('nutrilens:gemini:v1'));const encrypted=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);return ['v1',iv.toString('hex'),cipher.getAuthTag().toString('hex'),encrypted.toString('hex')].join('.');}
export function unseal(value:string,key:string){const [version,iv,tag,data]=value.split('.');if(version!=='v1'||!iv||!tag||!data)throw new Error('Invalid encrypted value');const decipher=createDecipheriv('aes-256-gcm',vaultKey(key),Buffer.from(iv,'hex'));decipher.setAAD(Buffer.from('nutrilens:gemini:v1'));decipher.setAuthTag(Buffer.from(tag,'hex'));return Buffer.concat([decipher.update(Buffer.from(data,'hex')),decipher.final()]).toString('utf8');}
