import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
for(const folder of ['client','server']) {
  const result=spawnSync(process.env.npm_execpath ? process.execPath : 'npm',process.env.npm_execpath ? [process.env.npm_execpath,'install','--no-audit','--no-fund','--workspaces=false'] : ['install','--no-audit','--no-fund'],{cwd:path.join(root,folder),stdio:'inherit',shell:!process.env.npm_execpath&&process.platform==='win32'})
  if(result.status!==0)process.exit(result.status||1)
}
