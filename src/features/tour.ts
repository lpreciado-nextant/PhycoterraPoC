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
    description: 'Explore the workflow with temporary samples. This read-only tour leaves your saved requests and workspace unchanged.',
    target: 'welcome', persona: 'janet', view: 'Overview',
  },
  {
    id: 'personas', chapter: 'Your workspace', title: 'See each person’s part',
    description: 'Requesters submit, the manager approves, and Janet purchases and receives. Switch demo roles here; this is not real authentication.',
    target: 'personas', persona: 'janet', view: 'Overview',
  },
  {
    id: 'overview', chapter: 'Your workspace', title: 'Know what needs attention',
    description: 'Live counts track approvals, purchasing, overdue deliveries, and holds. Select a card to open its queue.',
    target: 'metrics', persona: 'janet', view: 'Overview',
  },
  {
    id: 'queue', chapter: 'Your workspace', title: 'Every request has a next step',
    description: 'Overdue deliveries and inspection holds come first. Each request shows its next action and owner; fully received holds are not overdue.',
    target: 'request-DEMO-005', persona: 'janet', view: 'Receiving', filter: 'Overdue',
  },
  {
    id: 'filters', chapter: 'Requests', title: 'Find the right request',
    description: 'Search by request, item, or supplier, then filter the results. Requests includes drafts, rejected requests, and completed work.',
    target: 'filters', persona: 'janet', view: 'Requests',
  },
  {
    id: 'new-request', chapter: 'Requests', title: 'Start with the requester',
    description: 'Operations sees only its own requests. New request opens the form; next, we will preview a sample draft without saving.',
    target: 'new-request', persona: 'operations', view: 'Requests',
  },
  {
    id: 'request-info', chapter: 'Requests', title: 'Give purchasing the context',
    description: 'Add a title, need-by date, supplier, and justification. Quote references are text only; suppliers and prices are fictional.',
    target: 'request-info', persona: 'operations', view: 'Requests', scene: { kind: 'draft', id: 'DEMO-001' },
  },
  {
    id: 'line-items', chapter: 'Requests', title: 'Build a clear itemized request',
    description: 'Add items with a category, unit, whole-number quantity, and USD price. Raw materials require manual inspection after receipt.',
    target: 'request-lines', persona: 'operations', view: 'Requests', scene: { kind: 'draft', id: 'DEMO-001' },
  },
  {
    id: 'submit', chapter: 'Requests', title: 'Save a draft or send it forward',
    description: 'Save draft to edit later. Submit locks quantities and prices and applies the demo $1,000 approval threshold. Totals exclude tax and freight.',
    target: 'request-submit', persona: 'operations', view: 'Requests', scene: { kind: 'draft', id: 'DEMO-001' },
  },
  {
    id: 'bypass', chapter: 'Approvals & purchasing', title: 'Small purchases keep moving',
    description: 'This $360 request skips approval. Requests of $1,000 or more need a manager under the demo policy, not confirmed company policy.',
    target: 'approval-result', persona: 'janet', view: 'Purchasing', scene: { kind: 'detail', id: 'DEMO-002' },
  },
  {
    id: 'approval', chapter: 'Approvals & purchasing', title: 'A clear manager decision',
    description: 'Only the manager can approve or reject. Approval unlocks purchasing; rejection requires a reason.',
    target: 'approval-actions', persona: 'manager', view: 'Approvals', scene: { kind: 'detail', id: 'DEMO-003' },
  },
  {
    id: 'rejection', chapter: 'Approvals & purchasing', title: 'Keep rejection reasons visible',
    description: 'The rejection reason stays with the request and timeline. Rejected requests cannot be purchased or resubmitted.',
    target: 'approval-result', persona: 'manager', view: 'Requests', scene: { kind: 'detail', id: 'DEMO-013' },
  },
  {
    id: 'purchase', chapter: 'Approvals & purchasing', title: 'Record a PO or card purchase',
    description: 'Janet records the supplier, dates, and PO or card reference. No orders, payments, or QuickBooks updates are sent. Never enter payment credentials.',
    target: 'purchase-form', persona: 'janet', view: 'Purchasing', scene: { kind: 'detail', id: 'DEMO-008' },
  },
  {
    id: 'receiving', chapter: 'Receiving & inspection', title: 'Receive only what arrived',
    description: 'Four fittings arrived; six remain. Record delivered quantities and delivery details. Empty receipts and quantities above the order balance are blocked.',
    target: 'receipt-form', persona: 'janet', view: 'Receiving', scene: { kind: 'detail', id: 'DEMO-006' },
  },
  {
    id: 'inspection', chapter: 'Receiving & inspection', title: 'A human controls material release',
    description: 'Add manual review notes, then keep the hold or pass and release. Each delivery needs its own inspection; certificate matching is not automated.',
    target: 'inspection', persona: 'janet', view: 'Receiving', scene: { kind: 'detail', id: 'DEMO-011' },
  },
  {
    id: 'completion', chapter: 'Receiving & inspection', title: 'Close the loop on delivery',
    description: 'Completion requires full receipt and no held material. Delivery details and history remain available after completion.',
    target: 'receipt-history', persona: 'janet', view: 'Requests', scene: { kind: 'detail', id: 'DEMO-014' },
  },
  {
    id: 'history', chapter: 'Visibility & control', title: 'Follow every handoff',
    description: 'See who acted and when at each step. This is local demo history, not a tamper-proof audit log.',
    target: 'timeline', persona: 'janet', view: 'Requests', scene: { kind: 'detail', id: 'DEMO-014' },
  },
  {
    id: 'notifications', chapter: 'Visibility & control', title: 'Keep each person informed',
    description: 'Updates for the selected role link to each request. No email, text, or Teams messages are sent.',
    target: 'notifications', persona: 'janet', view: 'Overview', scene: { kind: 'notifications' },
  },
  {
    id: 'suppliers', chapter: 'Visibility & control', title: 'See the supplier picture',
    description: 'Compare order counts, purchase totals, and overdue orders by fictional supplier. Each purchase counts once; these are not accounting balances.',
    target: 'suppliers', persona: 'janet', view: 'Overview',
  },
  {
    id: 'activity', chapter: 'Visibility & control', title: 'Catch up on recent changes',
    description: 'See the latest changes across visible requests. Select an entry to open its details.',
    target: 'activity', persona: 'janet', view: 'Overview',
  },
  {
    id: 'persistence', chapter: 'Visibility & control', title: 'Saved locally, reset deliberately',
    description: 'Edits stay in this browser. Reset requires confirmation and replaces only this app’s data. This tour does not reset anything.',
    target: 'reset-info', persona: 'janet', view: 'Overview', scene: { kind: 'reset' },
  },
  {
    id: 'finish', chapter: 'Ready to explore', title: 'Your workspace is waiting',
    description: 'Return to your saved workspace to try the workflow, or restart the tour anytime. This local prototype is not connected to Power Apps.',
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
