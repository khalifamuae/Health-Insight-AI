require("dotenv").config();const fs=require("fs");let f=fs.readFileSync(".env","utf8");f=f.replace(/="/g,"=").replace(/"
/g,String.fromCharCode(10));fs.writeFileSync(".env",f);console.log("DONE")
