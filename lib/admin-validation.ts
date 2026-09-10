import { z } from 'zod';
export const loginSchema=z.object({email:z.string().trim().email().max(254).transform(v=>v.toLowerCase()),password:z.string().min(1).max(128)}).strict();
export const setupSchema=loginSchema.extend({password:z.string().min(15,'Use at least 15 characters.').max(128),setupToken:z.string().trim().min(32).max(128)}).strict();
export const planSchema=z.object({id:z.string().uuid().optional(),version:z.number().int().positive().optional(),name:z.string().trim().min(1).max(80),amountMinor:z.number().int().min(0).max(100000000),currency:z.enum(['USD','PKR','EUR','GBP','AED']),interval:z.enum(['monthly','yearly']),analysisLimit:z.number().int().min(1).max(100000),description:z.string().trim().max(500),status:z.enum(['draft','archived'])}).strict();
