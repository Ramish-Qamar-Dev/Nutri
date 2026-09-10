import assert from 'node:assert/strict';
const origin='http://localhost:5173';
const publicPage=await fetch(origin+'/admin');assert.equal(publicPage.status,200);
const anonymous=await fetch(origin+'/api/admin/connection',{method:'POST',headers:{origin}});assert.equal(anonymous.status,401);assert.match(anonymous.headers.get('cache-control'),/no-store/);
const forged=await fetch(origin+'/api/admin/connection',{method:'POST',headers:{origin,'oai-authenticated-user-id':'forged','oai-authenticated-user-email':'owner@example.com'}});assert.equal(forged.status,401);
const simulated=await fetch(origin+'/api/admin/plans',{headers:{cookie:'__sites_local_auth=1'}});assert.equal(simulated.status,401);
console.log('Admin entry and anonymous/forged/simulated identity rejection passed. Password-session workflows are tested in admin-integration.mjs.');
