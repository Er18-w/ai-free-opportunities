import fs from 'node:fs/promises';import path from 'node:path';import {root,copyDir,readJson,sha256} from './lib.mjs';
const dist=path.join(root,'dist');await fs.rm(dist,{recursive:true,force:true});await fs.mkdir(path.join(dist,'data'),{recursive:true});await copyDir(path.join(root,'src'),dist);
for(const name of ['catalog.json','sources.json','changes.json'])await fs.copyFile(path.join(root,'data',name),path.join(dist,'data',name));
const catalog=await readJson('data/catalog.json');const manifest={releaseId:`${new Date().toISOString().replace(/[:.]/g,'-')}-${sha256(JSON.stringify(catalog.items)).slice(0,8)}`,builtAt:new Date().toISOString(),contentRevision:sha256(JSON.stringify(catalog.items)),publicCount:catalog.items.length};await fs.writeFile(path.join(dist,'release.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(`构建完成：dist/，公开 ${catalog.items.length} 条机会。`);
