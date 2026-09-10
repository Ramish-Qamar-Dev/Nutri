import type { Metadata } from 'next';
import { env } from 'cloudflare:workers';
import { currentAdmin,database,hasApiKey } from '@/lib/admin-store';
import { AdminLogin } from '@/components/admin-login';
import { AdminDashboard } from '@/components/admin-dashboard';
import type { SavedPlan,AuditEvent } from '@/lib/admin-types';
import './admin.css';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'NutriLens Admin',robots:{index:false,follow:false}};
export default async function AdminPage(){
 try{
  const admin=await currentAdmin();if(!admin)return <AdminLogin/>;
  const plans=(await database().prepare('SELECT * FROM subscription_plans ORDER BY updated_at DESC').all<SavedPlan>()).results;
  const events=(await database().prepare('SELECT id,action,target,created_at FROM admin_audit WHERE created_at>? ORDER BY created_at DESC LIMIT 30').bind(Date.now()-90*86400000).all<AuditEvent>()).results;
  return <AdminDashboard email={admin.email} configured={await hasApiKey()} vaultReady={/^[a-f0-9]{64}$/i.test(env.ADMIN_VAULT_KEY??'')} plans={plans} events={events}/>;
 }catch{return <AdminLogin available={false}/>;}
}
