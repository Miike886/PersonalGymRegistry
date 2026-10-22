// Real API + Vite proxy + browser, using only an isolated temporary SQLite database.
import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { mkdtemp, mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const frontend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const backend = path.resolve(frontend, '../backend')
const python = path.join(backend, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python')
const directory = await mkdtemp(path.join(tmpdir(), 'gym-login-e2e-'))
const database = path.join(directory, 'test.db').replaceAll('\\', '/')
const password = 'browser-test-password-only-928!'
const origin = 'http://localhost:4179'
const environment = {
  ...process.env, DATABASE_URL:'sqlite:///' + database,
  APP_ENV:'development', OWNER_USERNAME:'browser-owner',
  CORS_ORIGINS:origin, ALLOWED_HOSTS:'localhost,127.0.0.1',
}

function pythonCommand(args) {
  const result = spawnSync(python, args, {cwd:backend, env:environment, encoding:'utf8', timeout:30000, windowsHide:true})
  if (result.status !== 0) throw new Error(result.stderr || 'Test Python command failed')
  return result.stdout.trim()
}
environment.OWNER_PASSWORD_HASH = pythonCommand(['-c', 'from app.auth import password_hasher; print(password_hasher.hash("' + password + '"))'])
let apiServer, frontendServer, browser
let serverErrors = ''
function start(command, args, cwd, env) {
  const child = spawn(command, args, {cwd, env, windowsHide:true, stdio:['ignore','pipe','pipe']})
  child.on('error', error => {serverErrors += error.message})
  child.stderr.on('data', bytes => {serverErrors += bytes.toString()})
  return child
}
async function ready(url, child) {
  for(let attempt=0; attempt<80; attempt++) {
    if(child.exitCode !== null) throw new Error('Test server exited: ' + serverErrors)
    try { if((await fetch(url)).ok) return } catch {}
    await new Promise(resolve=>setTimeout(resolve,200))
  }
  throw new Error('Test server did not start: '+serverErrors)
}
async function stop(child) {
  if(!child || child.exitCode !== null) return
  const exited = new Promise(resolve=>child.once('exit',resolve))
  if(process.platform==='win32') spawnSync('taskkill.exe',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'})
  else child.kill()
  await exited
}
try {
  pythonCommand(['-m','alembic','upgrade','head'])
  pythonCommand(['seed.py'])
  pythonCommand(['-c',"from datetime import timedelta; from app.auth import utcnow; from app.database import SessionLocal; from app.models import Workout,WorkoutExercise,WorkoutSet,Exercise; db=SessionLocal(); exercise=db.query(Exercise).first(); rows=[Workout(routine_id=1,started_at=utcnow()-timedelta(days=d),ended_at=utcnow()-timedelta(days=d)+timedelta(hours=1)) for d in [3,1]]; db.add_all(rows); db.flush(); items=[WorkoutExercise(workout_id=w.id,exercise_id=exercise.id,exercise_name_snapshot=exercise.name,position=1) for w in rows]; db.add_all(items); db.flush(); db.add_all([WorkoutSet(workout_exercise_id=item.id,position=p,reps=8,load_value=load,load_unit=unit,set_type=kind,weight_type='EXTERNAL') for item in items for p,load,unit,kind in [(1,30,'lb','WORKING'),(2,20,'kg','WORKING'),(3,999,'lb','WARMUP')]]); db.commit(); db.close()"])
  apiServer=start(python,['-m','uvicorn','app.main:app','--host','127.0.0.1','--port','8319'],backend,environment)
  await ready('http://127.0.0.1:8319/health',apiServer)
  frontendServer=start(process.execPath,[path.join(frontend,'node_modules/vite/bin/vite.js'),'preview','--host','localhost','--port','4179','--strictPort'],frontend,{...process.env,API_PROXY_TARGET:'http://127.0.0.1:8319'})
  await ready(origin,frontendServer)
  browser=await chromium.launch(process.platform==='win32' ? {channel:'msedge'} : {})
  let context=await browser.newContext({viewport:{width:375,height:900},serviceWorkers:'block'})
  let page=await context.newPage()
  const errors=[]
  const monitor=target=>{
    target.on('pageerror',error=>errors.push(error.message))
    target.on('dialog',dialog=>dialog.accept())
  }
  monitor(page)
  await page.goto(origin)
  await page.getByRole('heading',{name:'Iniciar sesión',exact:true}).waitFor()
  assert.equal((await context.request.get(origin+'/api/workouts')).status(),401)
  assert.equal((await context.request.get('http://127.0.0.1:8319/workouts')).status(),401)
  await page.getByLabel('Usuario',{exact:true}).fill('browser-owner')
  await page.getByLabel('Contraseña',{exact:true}).fill('wrong-password')
  await page.getByRole('button',{name:'Entrar a mi espacio'}).click()
  await page.getByRole('alert').filter({hasText:'Usuario o contraseña incorrectos'}).waitFor()
  await page.getByLabel('Contraseña',{exact:true}).fill(password)
  await page.getByRole('button',{name:'Entrar a mi espacio'}).click()
  await page.getByRole('button',{name:/PUSH.*Empuje/}).waitFor()
  const cookies=await context.cookies()
  const session=cookies.find(cookie=>cookie.name==='gym_session')
  assert.ok(session?.httpOnly && session.sameSite==='Lax')
  assert.ok(session.expires > Date.now()/1000+29*86400)
  assert.equal(await page.evaluate(()=>document.cookie.includes('gym_session')),false)
  assert.equal(await page.evaluate(()=>localStorage.length),0)
  const storage=await context.storageState()
  await context.close()
  context=await browser.newContext({storageState:storage,viewport:{width:375,height:900},serviceWorkers:'block'})
  page=await context.newPage()
  monitor(page)
  await page.goto(origin)
  await page.getByRole('button',{name:/PUSH.*Empuje/}).waitFor()
  assert.equal(await page.getByRole('heading',{name:'Iniciar sesión',exact:true}).count(),0)
  assert.equal((await context.request.post(origin+'/api/auth/logout',{headers:{Origin:'https://attacker.example'}})).status(),403)
  await page.getByRole('button',{name:/PUSH.*Empuje/}).click()
  const exercise=page.locator('.exercise-card').first()
  await exercise.getByLabel(/Peso:/).fill('27.5')
  await exercise.getByLabel(/Repeticiones:/).fill('9')
  await page.getByRole('button',{name:'Explorar app',exact:true}).click()
  await page.getByRole('button',{name:'Historial',exact:true}).click()
  await page.locator('.history-card').first().click()
  await page.getByRole('heading',{name:'Empuje.',exact:true}).waitFor()
  await page.getByRole('button',{name:/Retomar PUSH/}).click()
  await page.getByRole('button',{name:'Explorar app',exact:true}).click()
  await page.getByRole('button',{name:'Calendario',exact:true}).click()
  await page.getByRole('heading',{name:'Tu constancia.',exact:true}).waitFor()
  await mkdir(path.join(frontend,'node_modules/.cache'),{recursive:true})
  for(const width of [320,375,768,1440]){
    await page.setViewportSize({width,height:900})
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
    if(width===375||width===1440)await page.screenshot({path:path.join(frontend,'node_modules/.cache/calendar-'+width+'.png'),fullPage:true})
  }
  await page.setViewportSize({width:375,height:900})
  if(!await page.locator('.calendar-grid .attended').count())await page.getByRole('button',{name:'Mes anterior'}).click()
  await page.locator('.calendar-grid .attended').first().click()
  await page.locator('.calendar-selection .history-card').first().click()
  await page.getByRole('heading',{name:'Empuje.',exact:true}).waitFor()
  await page.getByRole('button',{name:/Retomar PUSH/}).click()
  assert.equal(await exercise.getByLabel(/Peso:/).inputValue(),'27.5')
  assert.equal(await exercise.getByLabel(/Repeticiones:/).inputValue(),'9')
  await page.reload()
  await page.getByRole('heading',{name:'Tu entrenamiento',exact:true}).waitFor()
  assert.equal(await exercise.getByLabel(/Peso:/).inputValue(),'27.5')
  assert.equal(await exercise.getByLabel(/Repeticiones:/).inputValue(),'9')
  await page.getByRole('button',{name:'Explorar app',exact:true}).click()
  await page.getByRole('button',{name:'Progreso',exact:true}).click()
  await page.getByRole('heading',{name:'Tu progreso.',exact:true}).waitFor()
  await page.getByLabel('Tipo de carga del análisis',{exact:true}).selectOption('EXTERNAL')
  await page.getByLabel('Unidad del análisis',{exact:true}).selectOption('lb')
  await page.getByText('Datos y sesiones (2)',{exact:true}).click()
  assert.equal(await page.locator('.chart-table tbody tr').count(),2)
  assert.equal(await page.locator('.chart-table tbody tr').first().locator('td').nth(1).innerText(),'30')
  await page.getByLabel('Unidad del análisis',{exact:true}).selectOption('kg')
  assert.equal(await page.locator('.chart-table tbody tr').first().locator('td').nth(1).innerText(),'20')
  await page.getByLabel('Unidad del análisis',{exact:true}).selectOption('lb')
  for(const width of [320,375,768,1440]){
    await page.setViewportSize({width,height:900})
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
    if(width===375||width===1440)await page.screenshot({path:path.join(frontend,'node_modules/.cache/progress-'+width+'.png'),fullPage:true})
  }
  await page.locator('.chart-table tbody button').first().click()
  await page.getByRole('heading',{name:'Empuje.',exact:true}).waitFor()
  await page.getByRole('button',{name:/Retomar PUSH/}).click()
  pythonCommand(['-c','from datetime import timedelta; from app.auth import OwnerSession, utcnow; from app.database import SessionLocal; db=SessionLocal(); db.query(OwnerSession).update({OwnerSession.expires_at:utcnow()-timedelta(seconds=1)}); db.commit(); db.close()'])
  await exercise.getByRole('button',{name:'Registrar serie'}).click()
  await page.getByRole('heading',{name:'Iniciar sesión',exact:true}).waitFor()
  assert.equal(pythonCommand(['-c','from app.database import SessionLocal; from app.models import WorkoutSet; db=SessionLocal(); print(db.query(WorkoutSet).count()); db.close()']),'6')
  await page.getByLabel('Usuario',{exact:true}).fill('browser-owner')
  await page.getByLabel('Contraseña',{exact:true}).fill(password)
  await page.getByRole('button',{name:'Entrar a mi espacio'}).click()
  await exercise.getByLabel(/Peso:/).waitFor()
  assert.equal(await exercise.getByLabel(/Peso:/).inputValue(),'27.5')
  assert.equal(await exercise.getByLabel(/Repeticiones:/).inputValue(),'9')
  await exercise.getByRole('button',{name:'Registrar serie'}).click()
  await page.getByRole('timer',{name:'Tiempo de descanso restante'}).waitFor()
  assert.equal(pythonCommand(['-c','from app.database import SessionLocal; from app.models import WorkoutSet; db=SessionLocal(); print(db.query(WorkoutSet).count()); db.close()']),'7')
  await page.reload()
  await page.getByRole('heading',{name:'Tu entrenamiento',exact:true}).waitFor()
  await page.getByRole('timer',{name:'Tiempo de descanso restante'}).waitFor()
  assert.match(await page.getByRole('timer',{name:'Tiempo de sesión'}).innerText(),/^\d{2}:\d{2}:\d{2}$/)
  await page.getByRole('button',{name:'Omitir descanso',exact:true}).click()
  await page.getByRole('timer',{name:'Tiempo de descanso restante'}).waitFor({state:'detached'})
  await page.reload()
  await page.getByRole('heading',{name:'Tu entrenamiento',exact:true}).waitFor()
  assert.equal(await page.getByRole('timer',{name:'Tiempo de descanso restante'}).count(),0)
  await page.getByRole('button',{name:'Cerrar sesión',exact:true}).click()
  await page.getByRole('heading',{name:'Iniciar sesión',exact:true}).waitFor()
  assert.equal((await context.request.get(origin+'/api/workouts')).status(),401)
  assert.equal(await page.locator('.exercise-card').count(),0)
  assert.equal(await page.evaluate(()=>Object.keys(sessionStorage).some(key=>key.startsWith('gym:session-draft:'))),false)
  assert.equal(pythonCommand(['-c','from app.database import SessionLocal; from app.models import Workout; db=SessionLocal(); print(db.query(Workout).filter(Workout.ended_at.is_(None)).count()); db.close()']),'1')
  await mkdir(path.join(frontend,'node_modules/.cache'),{recursive:true})
  for(const width of [320,375,430,768,1440]) {
    await page.setViewportSize({width,height:900})
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
    if(width===375||width===1440) await page.screenshot({path:path.join(frontend,'node_modules/.cache/owner-login-'+width+'.png'),fullPage:true})
  }
  await page.getByLabel('Usuario',{exact:true}).fill('browser-owner')
  await page.getByLabel('Contraseña',{exact:true}).fill(password)
  await page.getByRole('button',{name:'Entrar a mi espacio'}).click()
  await page.getByRole('button',{name:'Cancelar entrenamiento',exact:true}).click()
  await page.getByRole('button',{name:/FREE.*Libre/}).click()
  await page.getByRole('button',{name:'＋ Agregar o sustituir ejercicio',exact:true}).click()
  await page.getByLabel('Nombre del ejercicio',{exact:true}).fill('Ejercicio libre de prueba')
  await page.getByLabel('Cómo registrarás la carga',{exact:true}).selectOption('PER_HAND')
  await page.getByRole('button',{name:'Crear y agregar ejercicio',exact:true}).click()
  await page.getByRole('heading',{name:'Ejercicio libre de prueba',exact:true}).waitFor()
  const catalog=await (await context.request.get(origin+'/api/exercises')).json()
  assert.equal(catalog.find(item=>item.name==='Ejercicio libre de prueba')?.load_convention,'PER_HAND')
  assert.deepEqual(errors,[])
  console.log('PASS: real login/proxy, anonymous denial, wrong password, persistent browser session, CSRF, expired-session re-login with preserved inputs, recording/recovery, logout, five responsive widths.')
} catch(error) {
  console.error(error)
  throw error
} finally {
  await browser?.close()
  await stop(frontendServer)
  await stop(apiServer)
  await rm(directory,{recursive:true,force:true,maxRetries:10,retryDelay:200})
}
