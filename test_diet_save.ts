import { db } from './server/db.ts';
import { savedDietPlans } from './shared/schema.ts';
import { desc } from 'drizzle-orm';
import { eq } from 'drizzle-orm';

async function verify() {
  const all = await db.select().from(savedDietPlans).orderBy(desc(savedDietPlans.createdAt)).limit(5);
  console.log("Recent 5 Diet Plans saved in DB:");
  all.forEach((p: any) => {
    let parsed: any = null;
    try { parsed = JSON.parse(p.planData); } catch {}
    
    console.log(`ID: ${p.id} | User: ${p.userId} | Source: ${parsed?.source || 'unknown'} | Items: ${parsed?.items?.length || 0}`);
  });
  process.exit(0);
}
verify().catch(console.error);
