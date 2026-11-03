import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const processes = [
  spawn(process.execPath, ['src/server.js'], { cwd: path.join(root,'server'), stdio:'inherit' }),
  spawn(process.execPath, [path.join(root,'client/node_modules/vite/bin/vite.js'), '--host', '127.0.0.1'], { cwd:path.join(root,'client'), stdio:'inherit' })
]
let closing = false
function stop(code=0) { if(closing) return; closing=true; for(const child of processes) child.kill(); process.exit(code) }
for(const child of processes) { child.on('error', error=>{console.error(error);stop(1)}); child.on('exit', code=>stop(code||0)) }
process.on('SIGINT',()=>stop()); process.on('SIGTERM',()=>stop())


