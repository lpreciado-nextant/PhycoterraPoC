import { localDate, managerOf, newDraft, parseDataset, people, transition } from '../domain/workflow'
import type { Dataset, Line, Person, Request, Status } from '../domain/workflow'

type Scenario = { title: string; description: string; quantity: number; unit: string; cents: number; category: Line['category']; vendor: string; state: Status; context: string }
const catalog: Scenario[] = [
  { title: 'Seed Treatment sample bottles', description: 'Sample bottles', quantity: 12, unit: 'cases', cents: 4000, category: 'Packaging', vendor: 'Demo Packaging Supply', state: 'Draft', context: 'Prepare a Seed Treatment demonstration.' },
  { title: 'Corn & soybean soil-sampling bags', description: 'Soil-sampling bags', quantity: 8, unit: 'packs', cents: 4500, category: 'Field supplies', vendor: 'Demo Field Supplies', state: 'Ready to purchase', context: 'Support corn and soybean field demonstrations.' },
  { title: 'Soil Amendment demonstration jugs', description: 'Empty demonstration jugs', quantity: 200, unit: 'each', cents: 600, category: 'Packaging', vendor: 'Demo Packaging Supply', state: 'Pending approval', context: 'Packaging demonstration for the Soil Amendment program; not actual packaging specifications.' },
  { title: 'Sample container closures', description: 'Demonstration closures', quantity: 500, unit: 'each', cents: 60, category: 'Packaging', vendor: 'Demo Packaging Supply', state: 'Ordered', context: 'Prepare sample containers for field program demonstrations.' },
  { title: 'Sample identification label stock', description: 'Blank label stock', quantity: 10, unit: 'rolls', cents: 12500, category: 'Packaging', vendor: 'Demo Packaging Supply', state: 'Ordered', context: 'Keep demonstration samples clearly identified.' },
  { title: 'Liquid-product tote fittings', description: 'Demonstration tote fittings', quantity: 10, unit: 'each', cents: 15000, category: 'Packaging', vendor: 'Demo Packaging Supply', state: 'Partially received', context: 'Support a liquid-product handling demonstration; not a production specification.' },
  { title: 'Foliar Treatment sample bottles', description: 'Sample bottles', quantity: 20, unit: 'packs', cents: 2500, category: 'Packaging', vendor: 'Demo Packaging Supply', state: 'Completed', context: 'Prepare a Foliar Treatment demonstration.' },
  { title: 'Seed Treatment protective cartons', description: 'Protective cartons', quantity: 60, unit: 'each', cents: 2000, category: 'Packaging', vendor: 'Demo Packaging Supply', state: 'Ready to purchase', context: 'Protect Seed Treatment demonstration samples.' },
  { title: 'Residue Management plot markers', description: 'Plot markers', quantity: 10, unit: 'packs', cents: 3200, category: 'Field supplies', vendor: 'Demo Field Supplies', state: 'Draft', context: 'Identify plots in a Residue Management field demonstration.' },
  { title: 'Raw-material receiving practice A', description: 'DEMO-RM-A - generic placeholder', quantity: 10, unit: 'demo units', cents: 18000, category: 'Raw material', vendor: 'Demo Materials Supply', state: 'Inspection hold', context: 'Receiving practice only. This placeholder is not an actual PhycoTerra ingredient or material specification.' },
  { title: 'Raw-material split-delivery practice B', description: 'DEMO-RM-B - generic placeholder', quantity: 10, unit: 'demo units', cents: 12000, category: 'Raw material', vendor: 'Demo Materials Supply', state: 'Partially received', context: 'Practice split deliveries and manual inspection holds. Not an actual ingredient.' },
  { title: 'QA sample measurement kit', description: 'Sample measurement kit', quantity: 1, unit: 'kit', cents: 100000, category: 'QA equipment', vendor: 'Demo QA Equipment', state: 'Pending approval', context: 'Support a QA demonstration at the exact illustrative approval threshold.' },
  { title: 'Additional sample-label printer', description: 'Sample-label printer', quantity: 1, unit: 'each', cents: 165000, category: 'QA equipment', vendor: 'Demo QA Equipment', state: 'Rejected', context: 'Additional equipment proposed for demonstration sample identification.' },
  { title: 'Demonstration staff safety supplies', description: 'Gloves', quantity: 10, unit: 'boxes', cents: 1800, category: 'Facility supplies', vendor: 'Demo Facility Supplies', state: 'Completed', context: 'Restock gloves and safety glasses for demonstration staff.' },
  { title: 'Sample-preparation paper towels', description: 'Paper towels', quantity: 12, unit: 'cases', cents: 2400, category: 'Facility supplies', vendor: 'Demo Facility Supplies', state: 'Completed', context: 'Restock the demo sample-preparation workspace.' },
]

export function seedData(now = new Date()): Dataset {
  const stamp = (offset: number) => {
    const d = new Date(now)
    d.setDate(d.getDate() + offset)
    d.setHours(9, 0, 0, 0)
    return d.toISOString()
  }
  const day = (offset: number) => localDate(new Date(stamp(offset)))
  const requests = catalog.map((s, index) => {
    const id = `DEMO-${String(index + 1).padStart(3, '0')}`
    const requester: Person = index % 2 ? 'field' : 'operations'
    const lines: Line[] = [{ id: `${id}-L1`, description: s.description, quantity: s.quantity, unit: s.unit, unitCents: s.cents, category: s.category }]
    if (id === 'DEMO-014') lines.push({ id: `${id}-L2`, description: 'Safety glasses', quantity: 10, unit: 'pairs', unitCents: 1200, category: 'Facility supplies' })
    let request: Request = newDraft({
      title: s.title, lines, justification: s.context, needBy: day(10),
      vendor: s.vendor, quoteRef: `DEMO-QUOTE-${index + 1}`,
    }, requester, id, stamp(-12))
    if (s.state === 'Draft') return request
    request = transition(request, { type: 'submit' }, requester, `${id}-submit`, stamp(-11))
    if (s.state === 'Pending approval') return request
    if (s.state === 'Rejected') return transition(request, { type: 'reject', reason: 'Existing label printer capacity is sufficient.' }, managerOf(requester), `${id}-reject`, stamp(-10))
    if (request.stage === 'Pending approval') request = transition(request, { type: 'approve' }, managerOf(requester), `${id}-approve`, stamp(-10))
    if (s.state === 'Ready to purchase') return request
    request = transition(request, { type: 'order', purchase: {
      vendor: s.vendor, date: day(-8), expected: day(id === 'DEMO-005' ? -3 : 3),
      method: s.state === 'Completed' ? 'Credit card' : 'Purchase order',
      reference: `DEMO-${s.state === 'Completed' ? 'CARD' : 'PO'}-${index + 1}`,
    } }, 'janet', `${id}-order`, stamp(-8))
    if (s.state === 'Ordered') return request
    request = transition(request, { type: 'receive', receipt: {
      id: `${id}-receipt-1`, date: day(-2), packingRef: `DEMO-PACKING-${index + 1}-01`,
      receiver: 'janet', recipient: people[requester].name, location: s.category === 'Raw material' ? 'Demo QA Bench' : 'Demo Supply Storage',
      lines: lines.map(l => ({ lineId: l.id, quantity: s.state === 'Partially received' ? 4 : l.quantity, disposition: l.category === 'Raw material' ? 'Held' : 'Not required', notes: l.category === 'Raw material' ? `DEMO-COA-${index + 1}: reference only; manual inspection pending.` : '' })),
    } }, 'janet', `${id}-receive`, stamp(-2))
    return request
  })
  return parseDataset({ version: 1, seededAt: now.toISOString(), requests })
}
