import os from 'node:os';
import {syncBuiltinESMExports} from 'node:module';
const original=os.userInfo;
os.userInfo=(options)=>{try{return original(options);}catch(error){if(error.code!=='ERR_SYSTEM_ERROR')throw error;return {username:process.env.USERNAME??'local',homedir:process.env.USERPROFILE??process.cwd(),shell:null,uid:-1,gid:-1};}};
syncBuiltinESMExports();
