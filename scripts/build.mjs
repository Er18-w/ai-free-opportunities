import fs from 'node:fs/promises';
import path from 'node:path';
import {root,copyDir,readJson,sha256} from './lib.mjs';

const dist=path.join(root,'dist');
await fs.rm(dist,{recursive:true,force:true});
await fs.mkdir(path.join(dist,'data'),{recursive:true});
await copyDir(path.join(root,'src'),dist);
const [catalog,campaigns,radar,sources,sourceMap,changes]=await Promise.all(['catalog','campaigns','radar','sources','source-map','changes'].map(name=>readJson(`data/${name}.json`)));
for(const name of ['catalog.json','campaigns.json','radar.json','sources.json','source-map.json','changes.json'])await fs.copyFile(path.join(root,'data',name),path.join(dist,'data',name));

const manifest={releaseId:`${new Date().toISOString().replace(/[:.]/g,'-')}-${sha256(JSON.stringify(catalog.items)).slice(0,8)}`,builtAt:new Date().toISOString(),contentRevision:sha256(JSON.stringify([catalog.items,campaigns.items,radar.items])),publicCount:catalog.items.length,campaignCount:campaigns.items.filter(item=>item.status==='active').length,radarCount:radar.items.length,sourceCount:sources.items.length};
await fs.writeFile(path.join(dist,'release.json'),JSON.stringify(manifest,null,2)+'\n');

const [html,css,js]=await Promise.all([
  fs.readFile(path.join(root,'src/index.html'),'utf8'),
  fs.readFile(path.join(root,'src/assets/styles.css'),'utf8'),
  fs.readFile(path.join(root,'src/assets/app.js'),'utf8')
]);
const embedded=JSON.stringify({catalog,campaigns,radar,sources,sourceMap,changes}).replace(/</g,'\\u003c');
const standalone=html
  .replace('<link rel="stylesheet" href="./assets/styles.css">',`<style>${css}</style>`)
  .replace('<script type="module" src="./assets/app.js"></script>',`<script>globalThis.__AI_OPPORTUNITY_DATA__=${embedded};</script><script type="module">${js}</script>`);
await fs.writeFile(path.join(dist,'standalone.html'),standalone);
await fs.writeFile(path.join(root,'standalone.html'),standalone);
console.log(`构建完成：当前福利 ${campaigns.items.filter(item=>item.status==='active').length} 条，推荐 ${catalog.items.length} 条，雷达 ${radar.items.length} 条，${sourceMap.items.length} 个重点监控对象，${sources.items.length} 条搜索路径；已生成 standalone.html。`);
