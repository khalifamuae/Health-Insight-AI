require("dotenv").config();console.log("VARS:",Object.keys(process.env).filter(k=>k==="DATABASE_URL"||k==="OPENAI_API_KEY"||k==="REPL_ID"||k==="REPLIT_DOMAINS").length)
