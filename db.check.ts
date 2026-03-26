import { db } from './server/db';
import { subscriberConnections, userProfiles } from './shared/schema';
import { eq } from 'drizzle-orm';

async function test() {
  const conns = await db.select({
    connId: subscriberConnections.id,
    ownerId: subscriberConnections.ownerId,
    clientId: subscriberConnections.clientId,
    clientFirstName: userProfiles.firstName,
    clientLastName: userProfiles.lastName
  })
  .from(subscriberConnections)
  .leftJoin(userProfiles, eq(subscriberConnections.clientId, userProfiles.id));
  
  const allUsers = await db.select({
    id: userProfiles.id,
    email: userProfiles.email,
    firstName: userProfiles.firstName,
    lastName: userProfiles.lastName
  }).from(userProfiles);

  console.log("CONNECTIONS: ", JSON.stringify(conns, null, 2));
  console.log("ALL USERS: ", JSON.stringify(allUsers, null, 2));
  process.exit();
}
test();
