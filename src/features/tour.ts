import type { Person } from '../domain/workflow'

export type WorkspaceView = 'Overview' | 'Requests' | 'Approvals' | 'Purchasing' | 'Receiving'
type Scene = { kind: 'detail'; id: string } | { kind: 'draft'; id: string } | { kind: 'notifications' } | { kind: 'reset' }
export type TourStep = {
  id: string
  title: string
  description: string
  chapter: string
  target: string
  persona: Person
  view: WorkspaceView
  scene?: Scene
  filter?: 'Overdue' | 'On hold'
}

export const tourSteps: TourStep[] = [
  {
    id: 'welcome', chapter: 'Your workspace', title: 'From request to receipt',
    description: 'Take a read-only look at every capability. We will switch roles and open real demo screens using temporary sample data. Your saved requests and current workspace will be restored when you finish or exit.',
    target: 'welcome', persona: 'janet', view: 'Overview',
  },
  {
    id: 'personas', chapter: 'Your workspace', title: 'See each person’s part',
    description: 'Viewing as switches between Janet, two requesters, and the manager. Requesters see their own requests; the manager makes approval decisions; Janet purchases and receives. These demo roles are not real authentication.',
    target: 'personas', persona: 'janet', view: 'Overview',
  },
  {
    id: 'overview', chapter: 'Your workspace', title: 'Know what needs attention',
    description: 'These live counts show pending approvals, ready-to-purchase requests, overdue deliveries, and inspection holds. Each card opens its filtered queue. The numbers are calculated from the requests, not fixed display values.',
    target: 'metrics', persona: 'janet', view: 'Overview',
  },
  {
    id: 'queue', chapter: 'Your workspace', title: 'Every request has a next step',
    description: 'The queue puts overdue deliveries and inspection holds first. This late label-stock order shows its requester, age, status, next action, owner, amount, and expected arrival. A fully received inspection hold is not an overdue shipment.',
    target: 'request-DEMO-005', persona: 'janet', view: 'Receiving', filter: 'Overdue',
  },
  {
    id: 'filters', chapter: 'Requests', title: 'Find the right request',
    description: 'Search by request ID, item, or supplier, then narrow by status, category, supplier, or requester. The Requests view includes drafts, rejected requests, and completed work as well as active purchases.',
    target: 'filters', persona: 'janet', view: 'Requests',
  },
  {
    id: 'new-request', chapter: 'Requests', title: 'Start with the requester',
    description: 'We are now viewing as Demo Requester - Operations. New request opens a purchase form, and this list is scoped to that requester. For the next steps we will open a sample draft without saving anything.',
    target: 'new-request', persona: 'operations', view: 'Requests',
  },
  {
    id: 'request-info', chapter: 'Requests', title: 'Give purchasing the context',
    description: 'Capture the title, need-by date, preferred supplier, and business justification. Quote references are simulated metadata, not uploaded files. The sample supplies support PhycoTerra programs; suppliers and prices are fictional.',
    target: 'request-info', persona: 'operations', view: 'Requests', scene: { kind: 'draft', id: 'DEMO-001' },
  },
  {
    id: 'line-items', chapter: 'Requests', title: 'Build a clear itemized request',
    description: 'Add or remove items with a category, unit, whole-number quantity, and USD unit price. Positive values and valid prices are required. Raw-material categories trigger a manual inspection requirement during receiving.',
    target: 'request-lines', persona: 'operations', view: 'Requests', scene: { kind: 'draft', id: 'DEMO-001' },
  },
  {
    id: 'submit', chapter: 'Requests', title: 'Save a draft or send it forward',
    description: 'Save draft keeps the request editable. Submit validates it and applies the illustrative $1,000 approval threshold to the sum of all lines. Submitted quantities and prices lock; totals exclude tax and freight. Nothing is submitted by this tour.',
    target: 'request-submit', persona: 'operations', view: 'Requests', scene: { kind: 'draft', id: 'DEMO-001' },
  },
  {
    id: 'bypass', chapter: 'Approvals & purchasing', title: 'Small purchases keep moving',
    description: 'This $360 request is below the illustrative threshold, so it is ready to purchase without manager approval. The policy bypass is explicitly recorded. Exactly $1,000 or more needs a manager; this is not a confirmed company policy.',
    target: 'approval-result', persona: 'janet', view: 'Purchasing', scene: { kind: 'detail', id: 'DEMO-002' },
  },
  {
    id: 'approval', chapter: 'Approvals & purchasing', title: 'A clear manager decision',
    description: 'As the manager, review the requested items and locked amount, then approve or reject. Approval unlocks purchasing. Rejection requires a reason. Other demo roles cannot take these actions.',
    target: 'approval-actions', persona: 'manager', view: 'Approvals', scene: { kind: 'detail', id: 'DEMO-003' },
  },
  {
    id: 'rejection', chapter: 'Approvals & purchasing', title: 'Keep rejection reasons visible',
    description: 'This printer request was rejected because existing demo equipment is sufficient. The reason remains with the request and its timeline. Rejected requests cannot be purchased or resubmitted in this prototype.',
    target: 'approval-result', persona: 'manager', view: 'Requests', scene: { kind: 'detail', id: 'DEMO-013' },
  },
  {
    id: 'purchase', chapter: 'Approvals & purchasing', title: 'Record a PO or card purchase',
    description: 'Back as Janet, record one supplier, a purchase date, expected arrival, and a PO or credit-card purchase reference. This does not send an order, charge a card, or write to QuickBooks. Never enter payment credentials.',
    target: 'purchase-form', persona: 'janet', view: 'Purchasing', scene: { kind: 'detail', id: 'DEMO-008' },
  },
  {
    id: 'receiving', chapter: 'Receiving & inspection', title: 'Receive only what arrived',
    description: 'Four of ten tote fittings have arrived; six remain. Record a partial or final delivery with its packing-list reference, date, recipient, and location. Zero-only receipts and quantities above the remaining order are blocked.',
    target: 'receipt-form', persona: 'janet', view: 'Receiving', scene: { kind: 'detail', id: 'DEMO-006' },
  },
  {
    id: 'inspection', chapter: 'Receiving & inspection', title: 'A human controls material release',
    description: 'These four raw-material demo units are held. Record manual review notes and either keep the hold or explicitly pass and release this receipt. Later deliveries need their own inspection. No certificate matching is automated.',
    target: 'inspection', persona: 'janet', view: 'Receiving', scene: { kind: 'detail', id: 'DEMO-011' },
  },
  {
    id: 'completion', chapter: 'Receiving & inspection', title: 'Close the loop on delivery',
    description: 'This completed, two-line request records what arrived, who received it, and its delivery destination. Completion requires all ordered quantities and no held material. References and history remain available after the active queue is cleared.',
    target: 'receipt-history', persona: 'janet', view: 'Requests', scene: { kind: 'detail', id: 'DEMO-014' },
  },
  {
    id: 'history', chapter: 'Visibility & control', title: 'Follow every handoff',
    description: 'The timeline records who submitted, approved or bypassed approval, purchased, received, and inspected, with timestamps. It is local demo history, not a tamper-proof audit log.',
    target: 'timeline', persona: 'janet', view: 'Requests', scene: { kind: 'detail', id: 'DEMO-014' },
  },
  {
    id: 'notifications', chapter: 'Visibility & control', title: 'Keep each person informed',
    description: 'The bell opens simulated updates for the selected persona. Each entry links back to its request. Updates come from real demo actions, but no email, text, or Teams message is sent.',
    target: 'notifications', persona: 'janet', view: 'Overview', scene: { kind: 'notifications' },
  },
  {
    id: 'suppliers', chapter: 'Visibility & control', title: 'See the supplier picture',
    description: 'The supplier snapshot aggregates order count, recorded order value, and open overdue orders. Each purchase is counted once, even with multiple receipts. These are fictional suppliers, not vendor ratings or accounting balances.',
    target: 'suppliers', persona: 'janet', view: 'Overview',
  },
  {
    id: 'activity', chapter: 'Visibility & control', title: 'Catch up on recent changes',
    description: 'Recent activity surfaces the latest handoffs across the visible requests. Open an entry to return to the full details. Search, queues, notifications, and summaries all use the same underlying dataset.',
    target: 'activity', persona: 'janet', view: 'Overview',
  },
  {
    id: 'persistence', chapter: 'Visibility & control', title: 'Saved locally, reset deliberately',
    description: 'Outside this tour, edits persist in this browser. Storage errors are shown, never silently replaced. Reset requires confirmation and only replaces this app’s data. We are previewing this dialog, not resetting your saved requests.',
    target: 'reset-info', persona: 'janet', view: 'Overview', scene: { kind: 'reset' },
  },
  {
    id: 'finish', chapter: 'Ready to explore', title: 'Your workspace is waiting',
    description: 'Finish to return to your original role, screen, filters, and saved data. You can try the workflows yourself or restart Guided walkthrough anytime. This remains a local prototype, not a deployed Power Apps integration.',
    target: 'tour-start', persona: 'janet', view: 'Overview',
  },
]

export function tourDialog(step: TourStep) {
  const scene = step.scene
  if (!scene) return null
  if (scene.kind === 'draft') return { kind: 'form' as const, existingId: scene.id, id: scene.id, token: 'tour-draft' }
  return scene
}

export type TourRect = { left: number; top: number; width: number; height: number }
export function placeTourCard(target: TourRect | null, card: { width: number; height: number }, viewport: { width: number; height: number }) {
  const margin = 16
  const gap = 18
  const clamp = (value: number, max: number) => Math.min(Math.max(margin, value), Math.max(margin, max))
  const maxLeft = viewport.width - card.width - margin
  const maxTop = viewport.height - card.height - margin
  if (!target) return { left: clamp((viewport.width - card.width) / 2, maxLeft), top: clamp((viewport.height - card.height) / 2, maxTop) }
  const centerX = target.left + (target.width - card.width) / 2
  const centerY = target.top + (target.height - card.height) / 2
  const candidates = [
    { left: target.left + target.width + gap, top: centerY },
    { left: target.left - card.width - gap, top: centerY },
    { left: centerX, top: target.top + target.height + gap },
    { left: centerX, top: target.top - card.height - gap },
  ].map(p => ({ left: clamp(p.left, maxLeft), top: clamp(p.top, maxTop) }))
  const overlap = (p: { left: number; top: number }) => (
    Math.max(0, Math.min(p.left + card.width, target.left + target.width) - Math.max(p.left, target.left)) *
    Math.max(0, Math.min(p.top + card.height, target.top + target.height) - Math.max(p.top, target.top))
  )
  return candidates.reduce((best, candidate) => overlap(candidate) < overlap(best) ? candidate : best)
}
