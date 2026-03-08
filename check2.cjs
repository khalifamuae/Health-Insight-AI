require("dotenv").config();try{new URL(process.env.DATABASE_URL);console.log("VALID")}catch(e){console.log("INVALID")}
