import { describe, expect, it } from 'vitest'
import { activity, closedAt, hasHold, journey, localDate, managerOf, newDraft, outstanding, overdue, parseDataset, people, status, total, transition, visibleTo } from './workflow'
import type { Action, Draft } from './workflow'
import { seedData } from '../data/seed'

const now = '2026-11-13T17:00:00.000Z'
const today = localDate(new Date(now))
const draft = (unitCents = 10000, quantity = 10, raw = false): Draft => ({
  title: 'Demo supply request', justification: 'Field demonstration', needBy: '2099-01-01',
  vendor: 'Demo Packaging Supply', quoteRef: '',
  lines: [{ id: 'L1', description: 'Demo item', quantity, unit: 'each', unitCents, category: raw ? 'Raw material' : 'Packaging' }],
})
function submitted(unitCents = 10000, quantity = 10, raw = false) {
  return transition(newDraft(draft(unitCents, quantity, raw), 'field', 'TEST', now), { type: 'submit' }, 'field', 'submit', now)
}
function ordered(raw = false) {
  let r = submitted(10000, 10, raw)
  r = transition(r, { type: 'approve' }, 'manager', 'approve', now)
  return transition(r, { type: 'order', purchase: { vendor: r.vendor, date: today, expected: today, method: 'Purchase order', reference: 'DEMO-PO' } }, 'janet', 'order', now)
}
const receipt = (quantity: number, id = 'receipt', raw = false): Action => ({
  type: 'receive',
  receipt: { id, date: today, packingRef: `DEMO-${id}`, recipient: 'Demo Recipient', location: 'Demo Receiving', receiver: 'janet', lines: [{ lineId: 'L1', quantity, disposition: raw ? 'Held' : 'Not required', notes: '' }] },
})
describe('approval and purchase rules', () => {
  it.each([[99999, 'Ready to purchase'], [100000, 'Pending approval'], [100001, 'Pending approval']])('routes a computed total of %i cents to %s', (value, expected) => {
    const r = submitted(value, 1)
    expect(total(r)).toBe(value)
    expect(status(r)).toBe(expected)
  })
  it('uses the sum of all lines and locks submitted amounts', () => {
    const d = draft(50000, 1)
    d.lines.push({ ...d.lines[0], id: 'L2' })
    const r = transition(newDraft(d, 'field', 'T', now), { type: 'submit' }, 'field', 'submit', now)
    expect(status(r)).toBe('Pending approval')
    expect(() => transition(r, { type: 'edit', draft: draft(100) }, 'field', 'edit', now)).toThrow('draft')
  })
  it('requires the correct persona and a rejection reason; blocks rejected purchases', () => {
    const r = submitted()
    expect(() => transition(r, { type: 'approve' }, 'field', 'a', now)).toThrow('manager')
    expect(() => transition(r, { type: 'approve' }, 'janet', 'a', now)).toThrow('Jennifer Davis')
    expect(r.events.at(-1)?.audience).toContain('manager')
    expect(() => transition(r, { type: 'reject', reason: ' ' }, 'manager', 'r', now)).toThrow('reason')
    const rejected = transition(r, { type: 'reject', reason: 'Duplicate equipment' }, 'manager', 'reject', now)
    expect(status(rejected)).toBe('Rejected')
    expect(() => transition(rejected, { type: 'order', purchase: ordered().purchase! }, 'janet', 'order', now)).toThrow('eligible')
    expect(() => transition(r, { type: 'order', purchase: ordered().purchase! }, 'janet', 'order', now)).toThrow('eligible')
  })
  it('does not duplicate a retried approval or order', () => {
    const approved = transition(submitted(), { type: 'approve' }, 'manager', 'approve', now)
    expect(transition(approved, { type: 'approve' }, 'manager', 'approve', now)).toBe(approved)
    const r = ordered()
    expect(transition(r, { type: 'order', purchase: r.purchase! }, 'janet', 'order', now)).toBe(r)
    expect(() => transition(r, { type: 'order', purchase: r.purchase! }, 'janet', 'different-order', now)).toThrow('unpurchase')
  })
  it('rejects invalid quantities, unsafe totals, and future purchase dates', () => {
    expect(() => newDraft(draft(0), 'field', 'T', now)).toThrow()
    expect(() => newDraft(draft(100, 1.5), 'field', 'T', now)).toThrow()
    expect(() => newDraft(draft(100000000, 2), 'field', 'T', now)).toThrow('total')
    const approved = transition(submitted(), { type: 'approve' }, 'manager', 'a', now)
    expect(() => transition(approved, { type: 'order', purchase: { ...ordered().purchase!, date: '2099-01-01', expected: '2099-01-02' } }, 'janet', 'o', now)).toThrow('future')
  })
})
describe('receiving and human inspection', () => {
  it('receives four of ten, rejects seven more, then completes with six', () => {
    const first = transition(ordered(), receipt(4), 'janet', 'receive-1', now)
    expect(status(first)).toBe('Partially received')
    expect(outstanding(first)).toBe(6)
    expect(() => transition(first, receipt(7, 'second'), 'janet', 'receive-2', now)).toThrow('exceeds')
    const last = transition(first, receipt(6, 'second'), 'janet', 'receive-2', now)
    expect(status(last)).toBe('Completed')
    expect(outstanding(last)).toBe(0)
    expect(transition(first, receipt(4), 'janet', 'receive-1', now)).toBe(first)
    expect(() => transition(first, receipt(4), 'janet', 'different-token', now)).toThrow('already')
  })
  it('blocks empty, zero, negative, and unknown-line receipts', () => {
    expect(() => transition(ordered(), receipt(0), 'janet', 'r', now)).toThrow()
    expect(() => transition(ordered(), receipt(-1), 'janet', 'r', now)).toThrow()
    const action = receipt(2)
    if (action.type !== 'receive') throw new Error('test setup')
    action.receipt.lines = []
    expect(() => transition(ordered(), action, 'janet', 'r', now)).toThrow()
    action.receipt.lines = [{ lineId: 'unknown', quantity: 1, disposition: 'Not required', notes: '' }]
    expect(() => transition(ordered(), action, 'janet', 'r', now)).toThrow('Unknown')
  })
  it('rejects future receipts and receipts before the purchase', () => {
    const action = receipt(2)
    if (action.type !== 'receive') throw new Error('test setup')
    action.receipt.date = '2099-01-01'
    expect(() => transition(ordered(), action, 'janet', 'r', now)).toThrow('future')
    action.receipt.date = '2020-01-01'
    expect(() => transition(ordered(), action, 'janet', 'r', now)).toThrow('precede')
  })
  it('never auto-releases raw material and requires human notes for a pass', () => {
    const held = transition(ordered(true), receipt(10, 'raw', true), 'janet', 'receive', now)
    expect(status(held)).toBe('Inspection hold')
    expect(overdue(held, '2099-01-01')).toBe(false)
    const decision: Action = { type: 'inspect', receiptId: 'raw', lineId: 'L1', pass: true, notes: '' }
    expect(() => transition(held, decision, 'janet', 'i', now)).toThrow('notes')
    const issue = transition(held, { ...decision, pass: false, notes: 'Document mismatch; remain held.' }, 'janet', 'issue', now)
    expect(hasHold(issue)).toBe(true)
    const released = transition(issue, { ...decision, notes: 'Demo human visual/document review complete.' }, 'janet', 'pass', now)
    expect(status(released)).toBe('Completed')
    expect(hasHold(released)).toBe(false)
    const invalid = receipt(1, 'bypass', false)
    expect(() => transition(ordered(true), invalid, 'janet', 'bypass', now)).toThrow('hold')
  })
  it('keeps partially received material incomplete after an early inspection pass', () => {
    let r = transition(ordered(true), receipt(4, 'first', true), 'janet', 'r1', now)
    r = transition(r, { type: 'inspect', receiptId: 'first', lineId: 'L1', pass: true, notes: 'Reviewed first batch.' }, 'janet', 'i1', now)
    expect(status(r)).toBe('Partially received')
    expect(hasHold(r)).toBe(false)
    r = transition(r, receipt(6, 'second', true), 'janet', 'r2', now)
    expect(status(r)).toBe('Inspection hold')
  })
  it('handles mixed ordinary and raw lines without releasing the held line', () => {
    const input = draft(10000, 10, true)
    input.lines.push({ ...input.lines[0], id: 'L2', category: 'Packaging' })
    let mixed = newDraft(input, 'field', 'MIXED', now)
    mixed = transition(mixed, { type: 'submit' }, 'field', 's', now)
    mixed = transition(mixed, { type: 'approve' }, 'manager', 'a', now)
    mixed = transition(mixed, { type: 'order', purchase: ordered().purchase! }, 'janet', 'o', now)
    const action = receipt(10, 'mixed', true)
    if (action.type !== 'receive') throw new Error('test setup')
    action.receipt.lines.push({ lineId: 'L2', quantity: 10, disposition: 'Not required', notes: '' })
    const r = transition(mixed, action, 'janet', 'r', now)
    expect(status(r)).toBe('Inspection hold')
    expect(r.receipts[0].lines[1].disposition).toBe('Not required')
  })
  it('only considers outstanding past-due shipments overdue', () => {
    const r = ordered()
    expect(overdue(r, today)).toBe(false)
    expect(overdue(r, '2099-01-01')).toBe(true)
    expect(overdue(transition(r, receipt(10), 'janet', 'r', now), '2099-01-01')).toBe(false)
  })
})
describe('website-informed scenario consistency', () => {
  it('seeds all supported states with valid approvals, quantities, chronology and totals', () => {
    const data = seedData(new Date(now))
    expect(parseDataset(data)).toEqual(data)
    expect(data.requests).toHaveLength(9)
    expect(data.requests.map(total)).toEqual([48000, 36000, 120000, 125000, 150000, 120000, 180000, 165000, 30000])
    expect(new Set(data.requests.map(status))).toEqual(new Set(['Draft', 'Ready to purchase', 'Pending approval', 'Ordered', 'Partially received', 'Completed', 'Inspection hold', 'Rejected']))
    expect(data.requests.filter(r => overdue(r, today)).map(r => r.id)).toEqual(['DEMO-004'])
    expect(data.requests.filter(hasHold).map(r => r.id)).toEqual(['DEMO-007'])
    expect(data.requests.filter(r => r.purchase).every(r => r.approval)).toBe(true)
  })
  it('assigns realistic managers and shows one manager-approved request in purchasing', () => {
    const data = seedData(new Date(now))
    expect(Object.values(people).map(p => p.name).join(' ')).not.toMatch(/Demo|Requester/)
    for (const r of data.requests) {
      if (r.approval && r.approval.decision !== 'Not required') expect(r.approval.actor).toBe(managerOf(r.requester))
    }
    const purchasing = data.requests.filter(r => status(r) === 'Ready to purchase')
    expect(purchasing.map(r => r.approval?.decision).sort()).toEqual(['Approved', 'Not required'])
    const approved = purchasing.find(r => r.approval?.decision === 'Approved')!
    expect(approved.events.map(e => e.message)).toContain(`Approved by manager ${people[managerOf(approved.requester)].name}`)
  })
  it('has three teams with one person each and end-to-end samples', () => {
    const data = seedData(new Date(now))
    expect(Object.values(people).map(p => p.team)).toEqual(['Requester team', 'Management', 'Purchasing team'])
    expect(managerOf('field')).toBe('manager')
    const mine = data.requests.filter(r => r.requester === 'field')
    expect(mine).toHaveLength(data.requests.length)
    expect(mine.some(r => status(r) === 'Pending approval')).toBe(true)
    expect(mine.some(r => r.approval?.decision === 'Approved')).toBe(true)
  })
  it('classifies in-progress work as Open and finished requests as Closed', () => {
    const data = seedData(new Date(now))
    const inactive = data.requests.filter(r => activity(r) === 'Closed')
    expect(inactive.map(status).every(s => s === 'Completed' || s === 'Rejected')).toBe(true)
    expect(inactive.length).toBeGreaterThan(0)
    expect(data.requests.length - inactive.length).toBeGreaterThan(0)
  })
  it('rejects corrupt versions and contradictory receipt/approval data', () => {
    const data = seedData(new Date(now))
    expect(() => parseDataset({ ...data, version: 2 })).toThrow('incompatible')
    data.requests[6].receipts[0].lines[0].quantity = 11
    expect(() => parseDataset(data)).toThrow('exceeds')
    const other = seedData(new Date(now))
    other.requests[4].approval = undefined
    expect(() => parseDataset(other)).toThrow('Approval')
  })
})
describe('draft privacy', () => {
  it('shows drafts only to their creator and submitted requests to the right teams', () => {
    const d = newDraft(draft(), 'field', 'PRIVATE', now)
    expect(visibleTo(d, 'field')).toBe(true)
    expect(visibleTo(d, 'manager')).toBe(false)
    expect(visibleTo(d, 'janet')).toBe(false)
    const s = submitted()
    expect(['field', 'manager', 'janet'].every(p => visibleTo(s, p as 'field'))).toBe(true)
  })
})
describe('request journey', () => {
  const states = (r: Parameters<typeof journey>[0]) => Object.fromEntries(journey(r).map(s => [s.key, s.state]))
  it('marks the draft as the current stage', () => {
    expect(states(newDraft(draft(), 'field', 'D', now))).toEqual({ request: 'current', approval: 'upcoming', purchase: 'upcoming', receive: 'upcoming', complete: 'upcoming' })
  })
  it('skips approval below the threshold and waits on the manager above it', () => {
    expect(states(submitted(100, 1))).toMatchObject({ request: 'done', approval: 'skipped', purchase: 'current' })
    expect(states(submitted())).toMatchObject({ approval: 'current', purchase: 'upcoming' })
    expect(journey(submitted()).find(s => s.key === 'approval')?.owner).toBe('manager')
  })
  it('stops the journey at a rejection', () => {
    const rejected = transition(submitted(), { type: 'reject', reason: 'Not needed' }, 'manager', 'reject', now)
    expect(states(rejected)).toEqual({ request: 'done', approval: 'rejected', purchase: 'skipped', receive: 'skipped', complete: 'skipped' })
    expect(closedAt(rejected)).toBe(now)
  })
  it('adds an inspection stage for raw materials and completes after release', () => {
    const held = transition(ordered(true), receipt(10, 'raw', true), 'janet', 'receive', now)
    expect(states(held)).toEqual({ request: 'done', approval: 'done', purchase: 'done', receive: 'done', inspect: 'current', complete: 'upcoming' })
    const released = transition(held, { type: 'inspect', receiptId: 'raw', lineId: 'L1', pass: true, notes: 'Reviewed.' }, 'janet', 'pass', now)
    expect(states(released)).toMatchObject({ inspect: 'done', complete: 'done' })
  })
  it('keeps receiving current for a partial delivery', () => {
    const partial = transition(ordered(), receipt(4), 'janet', 'r1', now)
    const step = journey(partial).find(s => s.key === 'receive')
    expect(step).toMatchObject({ state: 'current', owner: 'janet', note: '4 of 10 received' })
  })
})
