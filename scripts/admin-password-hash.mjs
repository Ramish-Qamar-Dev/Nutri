// Offline owner recovery. Requires an interactive terminal; never accepts a
// password in CLI arguments or prints the password.
import {emitKeypressEvents} from 'node:readline';
import {randomBytes,scrypt} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
if(!process.stdin.isTTY)throw new Error('Run this command in an interactive terminal.');
emitKeypressEvents(process.stdin);process.stdin.setRawMode(true);process.stdin.resume();
function hidden(prompt){return new Promise(resolve=>{let value='';process.stdout.write(prompt);const listener=(text,key)=>{if(key?.ctrl&&key.name==='c'){process.stdin.setRawMode(false);process.exit(1);}if(key?.name==='return'){process.stdin.off('keypress',listener);process.stdout.write('\n');resolve(value);}else if(key?.name==='backspace')value=Array.from(value).slice(0,-1).join('');else if(text&&!key?.ctrl&&!key?.meta)value+=text;};process.stdin.on('keypress',listener);});}
try{const password=await hidden('New owner password (input hidden): ');const confirm=await hidden('Confirm password (input hidden): ');if(password!==confirm||password.length<15||password.length>128)throw new Error('Passwords must match and contain 15–128 characters.');const salt=randomBytes(16).toString('hex');const hash=await new Promise((resolve,reject)=>scrypt(password,salt,32,{N:16384,r:8,p:5,maxmem:32*1024*1024},(error,result)=>error?reject(error):resolve(result.toString('hex'))));const file=path.resolve('work/admin-recovery.sql');mkdirSync(path.dirname(file),{recursive:true});writeFileSync(file,`UPDATE admin_accounts SET password_hash='scrypt-v1$${salt}$${hash}' WHERE id='owner';\nDELETE FROM admin_sessions WHERE admin_id='owner';\n`,{mode:0o600});process.stdout.write('Recovery SQL saved to work/admin-recovery.sql. Apply only to the intended database using your privileged operator access, then remove this file.\n');}finally{process.stdin.setRawMode(false);process.stdin.pause();}
