import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { Activity as ActivityIcon, AlertCircle, CheckCircle2, Circle, Clock3, PackageCheck, ShieldCheck, Truck, X } from 'lucide-react'
import type { Activity, Status } from '../domain/workflow'

export function Badge({ value }: { value: Status | Activity | 'Overdue' | 'On hold' }) {
  const tone = value === 'Open' ? 'open' : value === 'Closed' ? 'closed' : value === 'Completed' || value === 'Ready to purchase' ? 'success' : value === 'Rejected' || value === 'Overdue' ? 'danger' : value === 'Inspection hold' || value === 'On hold' || value === 'Pending approval' ? 'warning' : 'neutral'
  const Icon = value === 'Open' ? ActivityIcon : value === 'Closed' ? CheckCircle2 : value === 'Completed' ? CheckCircle2 : value === 'Ready to purchase' ? ShieldCheck : value === 'Ordered' ? Truck : value === 'Partially received' ? PackageCheck : tone === 'danger' ? AlertCircle : tone === 'warning' ? Clock3 : Circle
  return <span className={`badge ${tone}`}><Icon size={13} aria-hidden="true" />{value}</span>
}
export function Modal({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    dialog?.showModal()
    return () => { dialog?.close() }
  }, [])
  return <dialog ref={ref} className={wide ? 'modal wide' : 'modal'} onCancel={onClose} onKeyDown={event => {
    if (event.key === 'Escape') { event.preventDefault(); onClose() }
  }} aria-label={title}>
    <header className="modal-header"><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={20} /></button></header>
    <div className="modal-body">{children}</div>
  </dialog>
}
export function ErrorNotice({ message }: { message: string }) {
  return <div className="error-notice" role="alert"><AlertCircle size={18} /><span>{message}</span></div>
}
export function EmptyState({ title, text }: { title: string; text: string }) {
  return <div className="empty"><CheckCircle2 size={30} /><h3>{title}</h3><p>{text}</p></div>
}
