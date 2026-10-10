import fs from 'node:fs/promises';import path from 'node:path';import crypto from 'node:crypto';import {fileURLToPath} from 'node:url';
export const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const readJson=async relative=>JSON.parse(await fs.readFile(path.join(root,relative),'utf8'));
export const writeJson=async(relative,value)=>{const target=path.join(root,relative);await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,JSON.stringify(value,null,2)+'\n','utf8');};
export const sha256=value=>crypto.createHash('sha256').update(value).digest('hex');
export const ensureInside=(base,target)=>{const resolved=path.resolve(base,target);if(resolved!==base&&!resolved.startsWith(base+path.sep))throw new Error(`路径越界: ${target}`);return resolved;};
export const copyDir=async(source,target)=>{await fs.mkdir(target,{recursive:true});for(const entry of await fs.readdir(source,{withFileTypes:true})){const from=path.join(source,entry.name),to=path.join(target,entry.name);entry.isDirectory()?await copyDir(from,to):await fs.copyFile(from,to);}};
