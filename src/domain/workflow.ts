import { z } from 'zod'

export const personSchema = z.enum(['field', 'manager', 'janet'])
export type Person = z.infer<typeof personSchema>
export type Role = 'purchasing' | 'requester' | 'approver'
export type Team = 'Requester team' | 'Management' | 'Purchasing team'
export type Profile = { name: string; title: string; role: Role; team: Team; manager?: Person }
export const people: Record<Person, Profile> = {
  field: { name: 'Sarah Johnson', title: 'Field Programs Specialist', role: 'requester', team: 'Requester team', manager: 'manager' },
  manager: { name: 'Jennifer Davis', title: 'Manager', role: 'approver', team: 'Management' },
  janet: { name: 'Janet', title: 'Purchasing', role: 'purchasing', team: 'Purchasing team' },
}
/** Plain-language team descriptions shown in the Help tab. */
export const teams: { team: Team; person: Person; summary: string; does: string[]; sees: string }[] = [
  {
    team: 'Requester team', person: 'field', summary: 'Asks for what the work needs.',
    does: ['Creates and edits drafts', 'Submits requests with items, supplier and need-by date', 'Follows progress until delivery'],
    sees: 'Only their own requests. Drafts stay private until submitted.',
  },
  {
    team: 'Management', person: 'manager', summary: 'Approves larger purchases.',
    does: ['Approves or rejects requests of $1,000 or more', 'Gives a reason when rejecting'],
    sees: 'Submitted requests from their team. Never other people’s drafts.',
  },
  {
    team: 'Purchasing team', person: 'janet', summary: 'Buys, receives and releases.',
    does: ['Records the purchase order or card reference', 'Records deliveries, including partial ones', 'Inspects raw materials before release'],
    sees: 'Every submitted request. Never other people’s drafts.',
  },
]
export const requesters = personSchema.options.filter(p => people[p].role === 'requester')
export function managerOf(requester: Person): Person {
  const manager = people[requester].manager
  if (!manager) throw new Error(`${people[requester].name} has no assigned manager.`)
  return manager
}
export function initials(person: Person): string {
  return people[person].name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase()
}
export const categories = ['Packaging', 'Field supplies', 'QA equipment', 'Raw material', 'Facility supplies'] as const
export const vendors = ['Demo Packaging Supply', 'Demo Field Supplies', 'Demo QA Equipment', 'Demo Materials Supply', 'Demo Facility Supplies']
export const stages = ['Draft', 'Pending approval', 'Ready to purchase', 'Rejected'] as const
export const statuses = [...stages, 'Ordered', 'Partially received', 'Inspection hold', 'Completed'] as const
export type Status = typeof statuses[number]
export const activities = ['Open', 'Closed'] as const
export type Activity = typeof activities[number]
const date = z.iso.date()
const cents = z.number().int().positive().max(100_000_000)
const quantity = z.number().int().positive().max(1_000_000)
const text = z.string().trim().min(1).max(500)
export const lineSchema = z.object({
  id: text, description: text, quantity, unit: text, unitCents: cents,
  category: z.enum(categories),
})
export type Line = z.infer<typeof lineSchema>
const eventSchema = z.object({
  id: text, at: z.iso.datetime(), actor: personSchema, message: text,
  audience: z.array(personSchema),
})
const receiptSchema = z.object({
  id: text, date, packingRef: text, recipient: text, location: text, receiver: personSchema,
  lines: z.array(z.object({
    lineId: text, quantity, disposition: z.enum(['Not required', 'Held', 'Passed']),
    notes: z.string().max(500), inspectedAt: z.iso.datetime().optional(),
  })).min(1),
})
export const requestSchema = z.object({
  id: text, title: text, requester: personSchema, createdAt: z.iso.datetime(),
  needBy: date, justification: text, vendor: text, quoteRef: z.string().max(200),
  lines: z.array(lineSchema).min(1).max(50),
  stage: z.enum(stages),
  approval: z.object({ decision: z.enum(['Approved', 'Rejected', 'Not required']), actor: personSchema, at: z.iso.datetime(), reason: z.string().max(500) }).optional(),
  purchase: z.object({ vendor: text, date, expected: date, method: z.enum(['Purchase order', 'Credit card']), reference: text }).optional(),
  receipts: z.array(receiptSchema),
  events: z.array(eventSchema).min(1),
})
export type Request = z.infer<typeof requestSchema>
export type Receipt = z.infer<typeof receiptSchema>
export const datasetSchema = z.object({ version: z.literal(1), seededAt: z.iso.datetime(), requests: z.array(requestSchema).min(1).max(1000) })
export type Dataset = z.infer<typeof datasetSchema>
export type Draft = Pick<Request, 'title' | 'needBy' | 'justification' | 'vendor' | 'quoteRef' | 'lines'>
export const draftSchema = requestSchema.pick({ title: true, needBy: true, justification: true, vendor: true, quoteRef: true, lines: true })

export function localDate(value = new Date()): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
}
export function money(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value / 100)
}
export function dateLabel(date: string): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(date.length === 10 ? `${date}T12:00:00` : date))
}
export function total(request: Pick<Request, 'lines'>): number {
  return request.lines.reduce((sum, line) => sum + line.quantity * line.unitCents, 0)
}
export function received(request: Request, lineId: string): number {
  return request.receipts.flatMap(r => r.lines).filter(l => l.lineId === lineId).reduce((sum, l) => sum + l.quantity, 0)
}
export function outstanding(request: Request): number {
  return request.lines.reduce((sum, l) => sum + l.quantity - received(request, l.id), 0)
}
export function hasHold(request: Request): boolean {
  return request.receipts.some(r => r.lines.some(l => l.disposition === 'Held'))
}
export function status(request: Request): Status {
  if (!request.purchase) return request.stage
  if (!request.receipts.length) return 'Ordered'
  if (outstanding(request)) return 'Partially received'
  return hasHold(request) ? 'Inspection hold' : 'Completed'
}
/** Open = still in progress. Closed = completed or rejected. */
export function activity(request: Request): Activity {
  const s = status(request)
  return s === 'Completed' || s === 'Rejected' ? 'Closed' : 'Open'
}
export function overdue(request: Request, today = localDate()): boolean {
  return !!request.purchase && request.purchase.expected < today && outstanding(request) > 0
}
export function nextStep(request: Request): { owner: string; action: string } {
  switch (status(request)) {
    case 'Draft': return { owner: people[request.requester].name, action: 'Complete and submit request' }
    case 'Pending approval': return { owner: people[managerOf(request.requester)].name, action: 'Manager review of purchase request' }
    case 'Ready to purchase': return { owner: 'Janet', action: 'Record purchase' }
    case 'Ordered': return { owner: 'Janet', action: overdue(request) ? 'Follow up on overdue delivery' : 'Await delivery' }
    case 'Partially received': return { owner: 'Janet', action: hasHold(request) ? 'Review hold / receive remaining items' : 'Receive remaining items' }
    case 'Inspection hold': return { owner: 'Janet', action: 'Record manual inspection' }
    case 'Completed': return { owner: people[request.requester].name, action: 'Delivered and documented' }
    case 'Rejected': return { owner: people[request.requester].name, action: 'Review rejection reason' }
  }
}
/** Who may see a request. Drafts are private to the requester who created them. */
export function visibleTo(request: Request, persona: Person): boolean {
  if (request.stage === 'Draft') return request.requester === persona
  const role = people[persona].role
  if (role === 'purchasing') return true
  if (role === 'requester') return request.requester === persona
  return managerOf(request.requester) === persona
}
/** When a finished (completed or rejected) request was closed. */
export function closedAt(request: Request): string | undefined {
  return activity(request) === 'Closed' ? request.events.at(-1)?.at : undefined
}

export type JourneyState = 'done' | 'current' | 'upcoming' | 'skipped' | 'rejected'
export type JourneyStep = { key: string; label: string; owner: Person; state: JourneyState; at?: string; note?: string }
/** The whole lifecycle of a request, with who owns each stage and where it is now. */
export function journey(request: Request): JourneyStep[] {
  const s = status(request)
  const manager = managerOf(request.requester)
  const rejected = s === 'Rejected'
  const after = (state: JourneyState): JourneyState => rejected ? 'skipped' : state
  const submittedAt = request.stage === 'Draft' ? undefined : request.events.find(e => e.message.startsWith('Submitted'))?.at
  const approval = request.approval
  const ordered = request.lines.reduce((sum, l) => sum + l.quantity, 0)
  const got = ordered - (request.purchase ? outstanding(request) : ordered)
  const lastReceipt = request.receipts.at(-1)?.date
  const steps: JourneyStep[] = [
    { key: 'request', label: 'Request', owner: request.requester, state: request.stage === 'Draft' ? 'current' : 'done', at: submittedAt ?? request.createdAt, note: request.stage === 'Draft' ? 'Draft' : 'Submitted' },
    approval?.decision === 'Not required'
      ? { key: 'approval', label: 'Approval', owner: manager, state: 'skipped', note: 'Not needed under $1,000' }
      : approval?.decision === 'Approved'
        ? { key: 'approval', label: 'Approval', owner: manager, state: 'done', at: approval.at, note: 'Approved' }
        : approval?.decision === 'Rejected'
          ? { key: 'approval', label: 'Approval', owner: manager, state: 'rejected', at: approval.at, note: 'Rejected' }
          : { key: 'approval', label: 'Approval', owner: manager, state: s === 'Pending approval' ? 'current' : 'upcoming', note: total(request) >= 100_000 ? 'Required at $1,000+' : 'Not needed under $1,000' },
    { key: 'purchase', label: 'Purchase', owner: 'janet', state: request.purchase ? 'done' : after(s === 'Ready to purchase' ? 'current' : 'upcoming'), at: request.purchase?.date, note: request.purchase?.method },
    { key: 'receive', label: 'Receive', owner: 'janet', state: !request.purchase ? after('upcoming') : outstanding(request) > 0 ? 'current' : 'done', at: request.purchase && !outstanding(request) ? lastReceipt : undefined, note: request.purchase ? `${got} of ${ordered} received` : undefined },
  ]
  if (request.lines.some(l => l.category === 'Raw material')) {
    const inspected = request.receipts.flatMap(r => r.lines).map(l => l.inspectedAt).filter((v): v is string => !!v).sort().at(-1)
    const fullyReleased = request.purchase && !outstanding(request) && !hasHold(request)
    steps.push({ key: 'inspect', label: 'Inspect', owner: 'janet', state: hasHold(request) ? 'current' : fullyReleased ? 'done' : after('upcoming'), at: fullyReleased ? inspected : undefined, note: hasHold(request) ? 'Material on hold' : 'Raw material check' })
  }
  steps.push({ key: 'complete', label: 'Complete', owner: request.requester, state: s === 'Completed' ? 'done' : after('upcoming'), at: s === 'Completed' ? closedAt(request) : undefined, note: s === 'Completed' ? 'Delivered' : undefined })
  return steps
}

/** True when an open request is waiting on this person: they own a current stage of its journey. */
export function awaitingAction(request: Request, persona: Person): boolean {
  return activity(request) === 'Open' && journey(request).some(step => step.state === 'current' && step.owner === persona)
}

export function demand(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}
function unique(values: string[], label: string) {
  demand(new Set(values).size === values.length, `${label} must be unique.`)
}
export function validateRequest(request: Request) {
  unique(request.lines.map(l => l.id), 'Line identifiers')
  unique(request.events.map(e => e.id), 'Activity identifiers')
  unique(request.receipts.map(r => r.id), 'Receipt identifiers')
  demand(people[request.requester].role === 'requester', 'Requests must belong to a requester.')
  demand(vendors.includes(request.vendor), 'Choose a fictional demo supplier.')
  demand(Number.isSafeInteger(total(request)) && total(request) <= 100_000_000, 'Request total must not exceed $1,000,000.')
  const approval = request.approval
  if (request.stage === 'Ready to purchase') {
    demand(approval?.decision === (total(request) >= 100_000 ? 'Approved' : 'Not required'), 'Approval does not match the approval policy.')
  } else if (request.stage === 'Rejected') {
    demand(total(request) >= 100_000 && approval?.decision === 'Rejected' && approval.reason.trim(), 'Rejected requests need a manager decision and reason.')
  } else {
    demand(!approval && !request.purchase && !request.receipts.length, 'Draft or pending requests cannot have downstream activity.')
    if (request.stage === 'Pending approval') demand(total(request) >= 100_000, 'Below-threshold requests do not need approval.')
  }
  if (approval && approval.decision !== 'Not required') demand(approval.actor === managerOf(request.requester), 'Only the requester\'s manager can approve or reject.')
  if (approval) demand(approval.at >= request.createdAt, 'Approval cannot precede creation.')
  if (request.purchase) {
    demand(request.stage === 'Ready to purchase', 'Purchase requires approval eligibility.')
    demand(approval && request.purchase.date >= localDate(new Date(approval.at)), 'Purchase cannot precede approval.')
    demand(request.purchase.expected >= request.purchase.date, 'Expected delivery cannot precede purchase.')
    demand(vendors.includes(request.purchase.vendor), 'Choose a fictional demo supplier.')
  } else demand(request.receipts.length === 0, 'Receipts require a purchase.')
  for (const receipt of request.receipts) {
    unique(receipt.lines.map(l => l.lineId), 'Receipt lines')
    demand(receipt.receiver === 'janet', 'Only purchasing records receipts.')
    demand(request.purchase && receipt.date >= request.purchase.date, 'Receipt cannot precede purchase.')
    for (const item of receipt.lines) {
      const line = request.lines.find(l => l.id === item.lineId)
      demand(line, 'Receipt references an unknown line.')
      demand(line.category === 'Raw material' ? item.disposition !== 'Not required' : item.disposition === 'Not required', 'Inspection disposition does not match the material.')
      if (item.disposition === 'Passed') demand(item.notes.trim() && item.inspectedAt && localDate(new Date(item.inspectedAt)) >= receipt.date, 'Inspection release needs dated notes.')
    }
  }
  for (const line of request.lines) demand(received(request, line.id) <= line.quantity, 'Receipt quantity exceeds the order.')
  demand(request.events.every((e, i) => e.at >= request.createdAt && (!i || e.at >= request.events[i - 1].at)), 'Activity dates must be chronological.')
}
export function parseDataset(raw: unknown): Dataset {
  const result = datasetSchema.safeParse(raw)
  demand(result.success, 'Stored demo data is invalid or incompatible. Reset demo data to recover.')
  const data = result.data
  unique(data.requests.map(r => r.id), 'Request identifiers')
  data.requests.forEach(validateRequest)
  return data
}

export type Action =
  | { type: 'edit'; draft: Draft }
  | { type: 'submit' }
  | { type: 'approve' }
  | { type: 'reject'; reason: string }
  | { type: 'order'; purchase: NonNullable<Request['purchase']> }
  | { type: 'receive'; receipt: Receipt }
  | { type: 'inspect'; receiptId: string; lineId: string; pass: boolean; notes: string }

export function newDraft(draft: Draft, actor: Person, id: string, at = new Date().toISOString()): Request {
  demand(people[actor].role === 'requester', 'Switch to a requester to create a request.')
  const parsed = draftSchema.parse(draft)
  const request: Request = {
    ...parsed, id, requester: actor, createdAt: at, stage: 'Draft', receipts: [],
    events: [{ id: `${id}-created`, at, actor, message: 'Draft created', audience: [actor] }],
  }
  validateRequest(request)
  return request
}
export function transition(current: Request, action: Action, actor: Person, operationId: string, at = new Date().toISOString()): Request {
  if (current.events.some(e => e.id === operationId)) return current
  const request = structuredClone(current)
  const today = localDate(new Date(at))
  let message: string
  let audience: Person[] = [request.requester]
  if (action.type === 'edit' || action.type === 'submit') {
    demand(actor === request.requester && request.stage === 'Draft', 'Only the requester can change their draft.')
    if (action.type === 'edit') {
      Object.assign(request, draftSchema.parse(action.draft))
      message = 'Draft updated'
    } else {
      demand(request.needBy >= today, 'Choose a need-by date of today or later before submitting.')
      request.stage = total(request) >= 100_000 ? 'Pending approval' : 'Ready to purchase'
      if (request.stage === 'Ready to purchase') request.approval = { decision: 'Not required', actor, at, reason: 'Below the illustrative $1,000 threshold.' }
      audience = [request.requester, request.stage === 'Pending approval' ? managerOf(request.requester) : 'janet']
      message = request.stage === 'Pending approval' ? `Submitted for approval - assigned to ${people[managerOf(request.requester)].name}` : 'Submitted - manager approval not required'
    }
  } else if (action.type === 'approve' || action.type === 'reject') {
    demand(request.stage === 'Pending approval', 'Only pending requests can be approved or rejected.')
    demand(actor === managerOf(request.requester), `Only the requester's manager, ${people[managerOf(request.requester)].name}, can decide this request.`)
    const reason = action.type === 'reject' ? action.reason.trim() : ''
    demand(action.type !== 'reject' || reason.length > 0, 'Enter a rejection reason.')
    request.stage = action.type === 'approve' ? 'Ready to purchase' : 'Rejected'
    request.approval = { decision: action.type === 'approve' ? 'Approved' : 'Rejected', actor, at, reason }
    message = action.type === 'approve' ? `Approved by manager ${people[actor].name}` : `Rejected by manager ${people[actor].name}: ${reason}`
    audience = [request.requester, 'janet']
  } else {
    demand(actor === 'janet', 'Switch to Janet (Purchasing) to perform this action.')
    if (action.type === 'order') {
      demand(request.stage === 'Ready to purchase' && !request.purchase, 'Only eligible, unpurchased requests can be ordered.')
      demand(action.purchase.date <= today, 'Purchase date cannot be in the future.')
      request.purchase = action.purchase
      message = `${action.purchase.method} recorded: ${action.purchase.reference}`
    } else if (action.type === 'receive') {
      demand(request.purchase && outstanding(request) > 0, 'This request has no outstanding ordered quantities.')
      demand(!request.receipts.some(r => r.id === action.receipt.id), 'This receipt has already been recorded.')
      demand(action.receipt.date <= today, 'Receipt date cannot be in the future.')
      for (const item of action.receipt.lines) {
        const line = request.lines.find(l => l.id === item.lineId)
        demand(line, 'Unknown receipt line.')
        demand(item.disposition === (line.category === 'Raw material' ? 'Held' : 'Not required') && !item.inspectedAt, 'New raw-material receipts must start on hold.')
      }
      request.receipts.push(action.receipt)
      message = `Receipt recorded: ${action.receipt.packingRef}${hasHold(request) ? ' - inspection required before release' : ''}`
      audience = [request.requester, 'janet']
    } else {
      const receipt = request.receipts.find(r => r.id === action.receiptId)
      const line = receipt?.lines.find(l => l.lineId === action.lineId)
      demand(receipt && line?.disposition === 'Held', 'Only held receipt lines can be inspected.')
      demand(action.notes.trim(), 'Record inspection notes before making a decision.')
      line.notes = action.notes.trim()
      line.inspectedAt = at
      line.disposition = action.pass ? 'Passed' : 'Held'
      message = `${action.pass ? 'Inspection passed; material released' : 'Inspection issue; hold retained'} (${receipt.packingRef}): ${line.notes}`
      audience = [request.requester, 'janet']
    }
  }
  request.events.push({ id: operationId, at, actor, message, audience })
  const parsed = requestSchema.parse(request)
  validateRequest(parsed)
  return parsed
}
