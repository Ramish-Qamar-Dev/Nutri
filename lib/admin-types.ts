export type SavedPlan={id:string;name:string;amount_minor:number;currency:'USD'|'PKR'|'EUR'|'GBP'|'AED';interval:'monthly'|'yearly';analysis_limit:number;description:string;status:'draft'|'archived';version:number;updated_at:number};
export type AuditEvent={id:string;action:string;target:string;created_at:number};
