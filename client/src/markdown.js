import { marked } from 'marked'
import DOMPurify from 'dompurify'
export const imagePattern = /\[\[image:([a-zA-Z0-9-]+)(?:\|width=(\d+))?\]\]/g
function checkpointAttrs(value) {return Object.fromEntries([...value.matchAll(/([\w-]+)\s*=\s*["']([^"']*)["']/g)].map(m=>[m[1],m[2]]))}
export function checkpoints(content='') {return [...String(content).matchAll(/<!--\s*sf:checkpoint\b([\s\S]*?)-->/gi)].map(m=>checkpointAttrs(m[1])).filter(a=>/^[\w-]+$/.test(a.id)).map(a=>({id:a.id,title:a.title||a.id}))}
export function imageIds(content='') {return [...new Set([...String(content).matchAll(imagePattern)].map(m=>m[1]))]}
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
export function renderMarkdown(content='') {
 let source=String(content).replace(imagePattern,(_,id,width)=>`<figure><img src="/api/uploads/${id}/file" alt="任务图片" loading="lazy" style="width:${Math.min(2400,Math.max(40,Number(width)||600))}px;max-width:100%;height:auto" /></figure>`)
 source=source.replace(/<!--\s*sf:checkpoint\b([\s\S]*?)-->/gi,(_,value)=>{const a=checkpointAttrs(value);return a.id?`<div class="checkpoint-marker"><span>◉ 验收检查点</span><strong>${escape(a.title||a.id)}</strong><code>${escape(a.id)}</code></div>`:''})
 return DOMPurify.sanitize(marked.parse(source,{breaks:true,gfm:true}),{FORBID_TAGS:['style','iframe','form']})
}
