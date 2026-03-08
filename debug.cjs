require("dotenv").config();const u=process.env.DATABASE_URL;console.log("LEN:",u.length);console.log("START:",u.slice(0,30));console.log("END:",u.slice(-30))
