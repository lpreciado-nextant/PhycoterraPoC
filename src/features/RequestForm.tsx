import { useState } from 'react'
import type { FormEvent } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { categories, demand, draftSchema, localDate, money, vendors } from '../domain/workflow'
import type { Draft, Line, Request } from '../domain/workflow'
import { errorMessage } from '../data/storage'
import { ErrorNotice } from '../components/ui'

type FormLine = Omit<Line, 'unitCents' | 'quantity'> & { price: string; quantity: string }
const blankLine = (): FormLine => ({ id: crypto.randomUUID(), description: '', quantity: '1', unit: 'each', price: '', category: 'Packaging' })
export function RequestForm({ existing, onSave, onCancel }: { existing?: Request; onSave: (draft: Draft, submit: boolean) => void; onCancel: () => void }) {
  const [lines, setLines] = useState<FormLine[]>(() => existing ? existing.lines.map(l => ({ ...l, quantity: String(l.quantity), price: (l.unitCents / 100).toFixed(2) })) : [blankLine()])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const editLine = (id: string, patch: Partial<FormLine>) => setLines(previous => previous.map(l => l.id === id ? { ...l, ...patch } : l))
  const estimatedTotal = lines.reduce((sum, l) => sum + Number(l.quantity) * Math.round(Number(l.price) * 100), 0)
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setError('')
    setBusy(true)
    try {
      const fields = new FormData(event.currentTarget)
      const submitted = event.nativeEvent instanceof SubmitEvent && event.nativeEvent.submitter?.getAttribute('value') === 'submit'
      const draft = draftSchema.parse({
        title: fields.get('title'), needBy: fields.get('needBy'), justification: fields.get('justification'),
        vendor: fields.get('vendor'), quoteRef: fields.get('quoteRef'),
        lines: lines.map(l => {
          demand(/^\d+(\.\d{1,2})?$/.test(l.price), 'Unit prices must have at most two decimal places.')
          return { id: l.id, description: l.description, category: l.category, unit: l.unit, quantity: Number(l.quantity), unitCents: Math.round(Number(l.price) * 100) }
        }),
      })
      onSave(draft, submitted)
    } catch (e) { setError(errorMessage(e)); setBusy(false) }
  }
  return <form onSubmit={save} className="stack">
    <p className="muted">Items and amounts lock after submission.</p>
    {error && <ErrorNotice message={error} />}
    <div className="form-grid" data-tour="request-info">
      <label className="full">Request title<input name="title" defaultValue={existing?.title} placeholder="e.g. Soil Amendment demonstration jugs" required maxLength={120} /></label>
      <label>Need by<input name="needBy" type="date" defaultValue={existing?.needBy ?? localDate()} required /></label>
      <label>Preferred supplier<select name="vendor" defaultValue={existing?.vendor ?? vendors[0]}>{vendors.map(v => <option key={v}>{v}</option>)}</select></label>
      <label className="full">Business justification<textarea name="justification" defaultValue={existing?.justification} placeholder="What will these supplies support?" required maxLength={500} rows={2} /></label>
      <label className="full">Quote reference <span className="muted">(optional, no upload)</span><input name="quoteRef" defaultValue={existing?.quoteRef} placeholder="DEMO-QUOTE-..." maxLength={200} /></label>
    </div>
    <div className="section-heading"><h3>Line items</h3><button type="button" className="button secondary small" disabled={lines.length >= 50} onClick={() => setLines([...lines, blankLine()])}><Plus size={15} />Add item</button></div>
    {lines.map((l, index) => <fieldset className="line-form" data-tour={index === 0 ? 'request-lines' : undefined} key={l.id}>
      <legend>Item {index + 1}</legend>
      <div className="form-grid">
        <label className="full">Item description<input aria-label={`Item ${index + 1} description`} value={l.description} onChange={e => editLine(l.id, { description: e.target.value })} required maxLength={200} /></label>
        <label>Quantity<input aria-label={`Item ${index + 1} quantity`} type="number" min="1" max="1000000" step="1" value={l.quantity} onChange={e => editLine(l.id, { quantity: e.target.value })} required /></label>
        <label>Units<input aria-label={`Item ${index + 1} units`} value={l.unit} onChange={e => editLine(l.id, { unit: e.target.value })} required maxLength={30} /></label>
        <label>Category<select aria-label={`Item ${index + 1} category`} value={l.category} onChange={e => {
          const category = categories.find(c => c === e.target.value)
          if (category) editLine(l.id, { category })
        }}>{categories.map(c => <option key={c}>{c}</option>)}</select></label>
        <label>Unit price (USD)<input aria-label={`Item ${index + 1} unit price`} type="number" min="0.01" max="1000000" step="0.01" value={l.price} onChange={e => editLine(l.id, { price: e.target.value })} required /></label>
      </div>
      {l.category === 'Raw material' && <p className="hint">Manual inspection required before release. Use demo materials only.</p>}
      {lines.length > 1 && <button className="button text-button danger-text small" type="button" onClick={() => setLines(lines.filter(item => item.id !== l.id))}><Trash2 size={14} />Remove item {index + 1}</button>}
    </fieldset>)}
    <div className="total-block"><div><strong>Request total</strong><small>USD, excluding tax and freight</small></div><strong>{money(estimatedTotal)}</strong></div>
    <p className="hint">{estimatedTotal >= 100000 ? 'Manager approval required' : 'Manager approval not required'} (threshold: $1,000). Whole quantities only.</p>
    <div className="form-actions" data-tour="request-submit"><button type="button" className="button secondary" onClick={onCancel}>Cancel</button><button name="intent" value="draft" className="button secondary" disabled={busy}>Save draft</button><button name="intent" value="submit" className="button primary" disabled={busy}>Submit request</button></div>
  </form>
}
