import { redirect } from 'next/navigation';
import { adminExists } from '@/lib/admin-store';
import { AdminLogin } from '@/components/admin-login';
import '../admin.css';
export const dynamic='force-dynamic';
export default async function SetupPage(){let exists=false,available=true;try{exists=await adminExists();}catch{available=false;}if(exists)redirect('/admin');return <AdminLogin setup available={available}/>;}
