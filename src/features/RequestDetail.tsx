import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Check, ClipboardCheck, FileText, Package, Pencil, ShieldCheck, Truck } from 'lucide-react'
import { dateLabel, hasHold, localDate, money, nextStep, outstanding, overdue, people, received, status, total, vendors } from '../domain/workflow'
import type { Action, Person, Request } from '../domain/workflow'
import { errorMessage } from '../data/storage'
import { Badge, ErrorNotice } from '../components/ui'

type Submit = (action: Action, operationId: string) => void
function ActionForm({ children, onAction, build, label, danger = false }: { children: ReactNode; onAction: Submit; build: (fields: FormData) => Action; label: string; danger?: boolean }) {
  const [token] = useState(() => crypto.randomUUID())
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (done) return
    try { onAction(build(new FormData(e.currentTarget)), token); setDone(true) }
    catch (err) { setError(errorMessage(err)) }
  }
  return <form onSubmit={submit} className="stack compact">
    {error && <ErrorNotice message={error} />}
    {children}
    <button className={`button ${danger ? 'danger-button' : 'primary'}`} disabled={done}>{done ? 'Recorded' : label}</button>
  </form>
}
function field(data: FormData, key: string): string { return String(data.get(key) ?? '').trim() }
export function RequestDetail({ request, persona, onAction, onEdit }: { request: Request; persona: Person; onAction: Submit; onEdit: () => void }) {
  const currentStatus = status(request)
  const next = nextStep(request)
  const canReceive = persona === 'janet' && !!request.purchase && outstanding(request) > 0
  const progress = request.lines.reduce((sum, l) => sum + received(request, l.id), 0)
  const orderedQty = request.lines.reduce((sum, l) => sum + l.quantity, 0)
  return <div className="stack">
    <div className="detail-intro"><div><span className="eyebrow">{request.id}</span><h3>{request.title}</h3><p>{request.justification}</p></div><strong className="detail-total">{money(total(request))}</strong></div>
    <div className="badge-row"><Badge value={currentStatus} />{overdue(request) && <Badge value="Overdue" />}{hasHold(request) && currentStatus !== 'Inspection hold' && <Badge value="On hold" />}</div>
    <div className="next-action"><ClipboardCheck size={20} /><div><strong>{next.action}</strong><small>Owner: {next.owner} · Need by {dateLabel(request.needBy)}</small></div></div>
    <dl className="detail-grid"><div><dt>Requester</dt><dd>{people[request.requester].name}</dd></div><div><dt>Requested</dt><dd>{dateLabel(request.createdAt)}</dd></div><div><dt>Preferred supplier</dt><dd>{request.vendor}</dd></div><div><dt>Quote reference</dt><dd>{request.quoteRef || 'Not provided'}</dd></div></dl>
    <section>
      <div className="section-heading"><h3>Requested items</h3><span className="muted">USD · no tax or freight</span></div>
      <div className="table-scroll"><table className="detail-table"><thead><tr><th>Item</th><th>Quantity</th><th>Unit price</th><th>Total</th>{request.purchase && <th>Received</th>}</tr></thead><tbody>
        {request.lines.map(l => <tr key={l.id}><td><strong>{l.description}</strong><small>{l.category}</small></td><td>{l.quantity} {l.unit}</td><td>{money(l.unitCents)}</td><td>{money(l.quantity * l.unitCents)}</td>{request.purchase && <td>{received(request, l.id)} / {l.quantity}</td>}</tr>)}
      </tbody></table></div>
    </section>
    {request.approval && <div className="info-block" data-tour="approval-result"><ShieldCheck size={20} /><div><strong>{request.approval.decision === 'Not required' ? 'Approval not required under demo policy' : `Manager ${request.approval.decision.toLowerCase()}`}</strong><p>{request.approval.reason || `Decision recorded ${dateLabel(request.approval.at)}.`}</p></div></div>}
    {persona === request.requester && request.stage === 'Draft' && <button className="button primary" onClick={onEdit}><Pencil size={16} />Edit / submit draft</button>}
    {persona === 'manager' && request.stage === 'Pending approval' && <section className="action-panel" data-tour="approval-actions"><h3><ShieldCheck size={18} />Manager decision</h3><p className="muted">Demo policy: approval required at $1,000+.</p>
      <div className="form-grid">
        <ActionForm onAction={onAction} build={() => ({ type: 'approve' })} label="Approve request"><p>Approve items totaling {money(total(request))}.</p></ActionForm>
        <ActionForm onAction={onAction} build={d => ({ type: 'reject', reason: field(d, 'reason') })} label="Reject request" danger><label>Rejection reason<textarea name="reason" required maxLength={300} rows={2} placeholder="Explain the decision to the requester" /></label></ActionForm>
      </div>
    </section>}
    {persona === 'janet' && request.stage === 'Ready to purchase' && !request.purchase && <section className="action-panel" data-tour="purchase-form"><h3><Truck size={18} />Record purchase</h3><p className="muted">Demo only. No orders or payments are sent.</p>
      <ActionForm onAction={onAction} label="Record purchase" build={d => ({ type: 'order', purchase: { vendor: field(d, 'vendor'), date: field(d, 'date'), expected: field(d, 'expected'), method: field(d, 'method') === 'Credit card' ? 'Credit card' : 'Purchase order', reference: field(d, 'reference') } })}>
        <div className="form-grid">
          <label>Supplier<select name="vendor" defaultValue={request.vendor}>{vendors.map(v => <option key={v}>{v}</option>)}</select></label>
          <label>Purchase method<select name="method"><option>Purchase order</option><option>Credit card</option></select></label>
          <label>Purchase date<input type="date" name="date" defaultValue={localDate()} max={localDate()} required /></label>
          <label>Expected arrival<input type="date" name="expected" defaultValue={request.needBy} required /></label>
          <label className="full">PO / purchase reference<input name="reference" placeholder="DEMO-PO-... or DEMO-CARD-..." required maxLength={120} /><small>No card numbers or payment credentials.</small></label>
        </div>
      </ActionForm>
    </section>}
    {request.purchase && <section className="stack compact">
      <h3 className="with-icon"><Truck size={18} />Purchase & delivery</h3>
      <dl className="detail-grid"><div><dt>{request.purchase.method}</dt><dd>{request.purchase.reference}</dd></div><div><dt>Expected arrival</dt><dd>{dateLabel(request.purchase.expected)}</dd></div><div><dt>Supplier</dt><dd>{request.purchase.vendor}</dd></div><div><dt>Purchase date</dt><dd>{dateLabel(request.purchase.date)}</dd></div></dl>
      <div className="progress-label"><span>Received <small>(item counts, not inventory)</small></span><strong>{progress} / {orderedQty}</strong></div>
      <progress value={progress} max={orderedQty} aria-label="Receiving progress" />
    </section>}
    {canReceive && <section className="action-panel" data-tour="receipt-form"><h3><Package size={18} />Record receipt</h3><p className="muted">Use 0 for missing items. Raw materials need manual inspection.</p>
      <ActionForm key={`${request.id}-receipt-${request.receipts.length}`} onAction={onAction} label="Record receipt" build={d => ({ type: 'receive', receipt: {
        id: crypto.randomUUID(), date: field(d, 'date'), packingRef: field(d, 'packing'), receiver: 'janet', recipient: field(d, 'recipient'), location: field(d, 'location'),
        lines: request.lines.filter(l => Number(d.get(l.id)) > 0).map(l => ({ lineId: l.id, quantity: Number(d.get(l.id)), disposition: l.category === 'Raw material' ? 'Held' : 'Not required', notes: '' })),
      } })}>
        {request.lines.filter(l => received(request, l.id) < l.quantity).map(l => <label key={l.id}>{l.description} <small>{l.quantity - received(request, l.id)} {l.unit} outstanding</small><input type="number" name={l.id} aria-label={`Receive ${l.description}`} min="0" max={l.quantity - received(request, l.id)} step="1" defaultValue="0" required /></label>)}
        <div className="form-grid">
          <label>Receipt date<input type="date" name="date" defaultValue={localDate()} min={request.purchase?.date} max={localDate()} required /></label>
          <label>Packing-list reference<input name="packing" placeholder="DEMO-PACKING-..." required maxLength={120} /></label>
          <label>Delivery recipient<input name="recipient" placeholder="Demo Operations Recipient" required maxLength={120} /></label>
          <label>Delivery location<input name="location" placeholder="Demo Supply Storage" required maxLength={120} /></label>
        </div>
      </ActionForm>
    </section>}
    {request.receipts.length > 0 && <section className="stack" data-tour="receipt-history">
      <h3 className="with-icon"><Package size={18} />Receipt & inspection history</h3>
      {request.receipts.map(receipt => <article className="receipt-card" key={receipt.id}>
        <div className="section-heading"><strong>{receipt.packingRef}</strong><span className="muted">{dateLabel(receipt.date)}</span></div>
        <p className="muted">Received by {people[receipt.receiver].short} · {receipt.recipient} · {receipt.location}</p>
        {receipt.lines.map(item => <div className="receipt-line" data-tour={item.disposition === 'Held' ? 'inspection' : undefined} key={item.lineId}>
          <strong>{request.lines.find(l => l.id === item.lineId)?.description} <span className="muted">× {item.quantity}</span></strong>
          <small>{item.disposition === 'Held' ? 'On hold - destination planned, not released' : 'Released to recipient'}</small>
          {item.notes && <p className="inspection-note">{item.notes}</p>}
          {item.disposition === 'Passed' && <span className="success-text with-icon"><Check size={14} />Inspection passed {item.inspectedAt && dateLabel(item.inspectedAt)}</span>}
          {item.disposition === 'Held' && persona === 'janet' && <ActionForm key={`${receipt.id}-${item.lineId}-${request.events.length}`} onAction={onAction} label="Record inspection decision" build={d => ({ type: 'inspect', receiptId: receipt.id, lineId: item.lineId, pass: field(d, 'decision') === 'pass', notes: field(d, 'notes') })}>
            <label>Manual inspection notes<textarea name="notes" placeholder="Summarize your review and findings" maxLength={300} required rows={2} /></label>
            <label>Inspection decision<select name="decision" defaultValue="hold"><option value="hold">Issue / unresolved - keep on hold</option><option value="pass">Pass inspection and release</option></select></label>
          </ActionForm>}
        </div>)}
      </article>)}
    </section>}
    <section data-tour="timeline"><h3 className="with-icon"><FileText size={18} />Activity timeline</h3><ol className="timeline">
      {[...request.events].reverse().map(e => <li key={e.id}><span className="timeline-dot" /><strong>{e.message}</strong><small>{people[e.actor].name} · {dateLabel(e.at)} · {new Date(e.at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</small></li>)}
    </ol></section>
    <p className="hint">Local demo history, not an audit log. References only; no uploads.</p>
  </div>
}
