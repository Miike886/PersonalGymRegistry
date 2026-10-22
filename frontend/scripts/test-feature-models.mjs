import assert from 'node:assert/strict'
// Node >=22.18 strips TS types; execute actual pure helpers without generated artifacts.
process.env.TZ='America/Mexico_City'
const {attendanceDays,utcTime,localDay}=await import('../attendance-model.ts')
assert.equal(localDay(utcTime('2026-01-01T02:00:00Z')),'2025-12-31')
assert.equal(localDay(utcTime('2026-01-01T02:00:00')),'2025-12-31')
const session=(id,started_at,ended_at='2026-01-02T00:00:00Z')=>({id,started_at,ended_at,routine:{name:'PUSH'}})
const days=attendanceDays([session(1,'2026-01-01T02:00:00Z'),session(2,'2025-12-31T23:00:00Z'),session(3,'2026-01-02T23:00:00Z',null)])
assert.equal(days.size,1);assert.equal(days.get('2025-12-31').length,2)
assert.equal(attendanceDays([session(2,'2025-12-31T23:00:00Z')]).get('2025-12-31').length,1)
assert.equal(localDay(new Date(2026,2,0)),'2026-02-28')
assert.equal(localDay(new Date(2024,2,0)),'2024-02-29')
console.log('PASS: attendance UTC/local boundaries, multiple sessions, active exclusion, deletion and leap-year dates.')
