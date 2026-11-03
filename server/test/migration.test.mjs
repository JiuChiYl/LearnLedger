import test from 'node:test'
import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

test('legacy SQLite migration preserves tasks and previous rewards',()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'studyforge-migration-'))
  const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
  try {
    const legacy=new DatabaseSync(path.join(directory,'studyforge.sqlite'))
    legacy.exec(`CREATE TABLE tasks(id INTEGER PRIMARY KEY AUTOINCREMENT,title TEXT NOT NULL,description TEXT DEFAULT '',content TEXT DEFAULT '',subject TEXT DEFAULT '通用',difficulty TEXT DEFAULT '入门',status TEXT DEFAULT 'draft',source TEXT DEFAULT 'manual',points INTEGER DEFAULT 20,tags TEXT DEFAULT '[]',due_date TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP,updated_at TEXT DEFAULT CURRENT_TIMESTAMP);CREATE TABLE coin_transactions(id INTEGER PRIMARY KEY AUTOINCREMENT,amount INTEGER NOT NULL,reason TEXT NOT NULL,task_id INTEGER,created_at TEXT DEFAULT CURRENT_TIMESTAMP);INSERT INTO tasks(title,content,status,points) VALUES('旧任务','<!-- sf:checkpoint id="old" -->','active',40);INSERT INTO coin_transactions(amount,reason,task_id) VALUES(40,'旧奖励',1);`)
    legacy.close()
    const result=spawnSync(process.execPath,['--input-type=module','-e',"const {db}=await import('./src/db.js'); const task=db.prepare('SELECT * FROM tasks WHERE id=1').get(); const reward=db.prepare('SELECT * FROM task_rewards WHERE task_id=1').get(); console.log(JSON.stringify({title:task.title,status:task.status,duration:task.duration,reward:reward.amount,total:db.prepare('SELECT SUM(amount) AS total FROM coin_transactions').get().total}));db.close();"],{cwd:root,env:{...process.env,DATA_DIR:directory},encoding:'utf8'})
    assert.equal(result.status,0,result.stderr)
    const data=JSON.parse(result.stdout.trim())
    assert.deepEqual(data,{title:'旧任务',status:'published',duration:30,reward:40,total:40})
  } finally {if(!directory.startsWith(os.tmpdir()))throw new Error('Unexpected cleanup target');fs.rmSync(directory,{recursive:true,force:true})}
})
