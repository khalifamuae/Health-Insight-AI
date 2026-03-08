require("dotenv").config();const u=process.env.DATABASE_URL;const p=u.split("@")[0].split(":").slice(2).join(":");const encoded=p.replace(/[(]/g,"%28").replace(/[+]/g,"%2B").replace(/[?]/g,"%3F");const fixed=u.replace(p,encoded);require("fs").writeFileSync(".env","DATABASE_URL="+fixed+"
");console.log("DONE")
