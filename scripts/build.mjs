import {cp, mkdir, rm} from "node:fs/promises"; import {join} from "node:path";
await rm("dist", {recursive:true,force:true}); await mkdir("dist",{recursive:true});
await cp("public","dist",{recursive:true}); await cp("index.html","dist/index.html");
await mkdir("dist/data",{recursive:true}); await cp("data/puzzle-seed.json","dist/data/puzzle-seed.json");
