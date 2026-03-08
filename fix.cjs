require("dotenv").config();const u=process.env.DATABASE_URL;const fixed=u.replace("SCC!#vbi5ZMpWEx","SCC%21%23vbi5ZMpWEx");try{new URL(fixed);console.log("VALID")}catch(e){console.log("INVALID")}
