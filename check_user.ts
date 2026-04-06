import { db } from './server/db';
import { userProfiles } from './shared/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const users = await db.select().from(userProfiles).where(eq(userProfiles.email, 'khluaek@gmail.com'));
  if (users.length > 0) {
    console.log(users[0]);
  } else {
    console.log('User not found');
  }
  process.exit(0);
}
main();
