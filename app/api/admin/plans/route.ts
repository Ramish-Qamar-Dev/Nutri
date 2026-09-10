import { currentAdmin,database,auditStatement } from '@/lib/admin-store';
import { AdminError,bodyJSON,failure,reply } from '@/lib/admin-http';
import { planSchema } from '@/lib/admin-validation';
export async function GET(){try{if(!await currentAdmin())throw new AdminError(401,'Sign in to continue.');return reply({plans:(await database().prepare('SELECT * FROM subscription_plans ORDER BY updated_at DESC').all()).results});}catch(error){return failure(error);}}
export async function POST(request:Request){try{
  const admin=await currentAdmin();if(!admin)throw new AdminError(401,'Sign in to continue.');
  const parsed=planSchema.safeParse(await bodyJSON(request));if(!parsed.success)throw new AdminError(400,'Check the plan name, price, currency, interval, and analysis allowance.');
  const data=parsed.data,id=data.id??crypto.randomUUID();
  if(data.id){
    if(!data.version)throw new AdminError(400,'Refresh the plan before editing.');
    const result=await database().prepare('UPDATE subscription_plans SET name=?,amount_minor=?,currency=?,interval=?,analysis_limit=?,description=?,status=?,version=version+1,updated_at=? WHERE id=? AND version=? RETURNING id').bind(data.name,data.amountMinor,data.currency,data.interval,data.analysisLimit,data.description,data.status,Date.now(),id,data.version).first();
    if(!result)throw new AdminError(409,'This plan changed in another session. Refresh before editing.');
  }else{
    if((await database().prepare('SELECT COUNT(*) as count FROM subscription_plans').first<{count:number}>())!.count>=100)throw new AdminError(400,'Keep the catalog to 100 plans or fewer.');
    await database().prepare('INSERT INTO subscription_plans(id,name,amount_minor,currency,interval,analysis_limit,description,status,version,updated_at) VALUES(?,?,?,?,?,?,?,?,1,?)').bind(id,data.name,data.amountMinor,data.currency,data.interval,data.analysisLimit,data.description,data.status,Date.now()).run();
  }
  await auditStatement(admin.id,data.id?'plan_updated':'plan_created',id).run();return reply({ok:true,id,customerVisible:false});
}catch(error){return failure(error);}}
