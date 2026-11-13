import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Compass, ShieldCheck, X } from 'lucide-react'
import { placeTourCard, tourSteps } from '../features/tour'
import type { TourRect, TourStep } from '../features/tour'

function visibleRect(element: HTMLElement): TourRect | null {
  const bounds = element.getBoundingClientRect()
  let left = Math.max(8, bounds.left - 5)
  let top = Math.max(8, bounds.top - 5)
  let right = Math.min(document.documentElement.clientWidth - 8, bounds.right + 5)
  let bottom = Math.min(window.innerHeight - 8, bounds.bottom + 5)
  for (let parent = element.parentElement; parent; parent = parent.parentElement) {
    const style = getComputedStyle(parent)
    const box = parent.getBoundingClientRect()
    if (/(auto|scroll|hidden|clip)/.test(style.overflowX)) { left = Math.max(left, box.left); right = Math.min(right, box.right) }
    if (/(auto|scroll|hidden|clip)/.test(style.overflowY)) { top = Math.max(top, box.top); bottom = Math.min(bottom, box.bottom) }
  }
  return right > left && bottom > top ? { left, top, width: right - left, height: bottom - top } : null
}

export function GuidedTour({ step, index, onMove, onExit }: { step: TourStep; index: number; onMove: (index: number) => void; onExit: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const cardRef = useRef<HTMLElement>(null)
  const nextRef = useRef<HTMLButtonElement>(null)
  const [layout, setLayout] = useState<{ target: TourRect | null; left: number; top: number; missing: boolean } | null>(null)
  const ready = layout !== null
  useEffect(() => {
    if (ready) nextRef.current?.focus({ preventScroll: true })
  }, [ready])

  useEffect(() => {
    const dialog = dialogRef.current
    const card = cardRef.current
    if (!dialog || !card) return
    dialog.showModal()
    const target = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`)
    let frame = 0
    let initialized = false
    const measure = () => {
      // Wait until the underlying request dialog is open before revealing its content.
      if (!initialized) {
        target?.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' })
        initialized = true
      }
      const rect = target ? visibleRect(target) : null
      const position = placeTourCard(rect, { width: card.offsetWidth, height: card.offsetHeight }, { width: document.documentElement.clientWidth, height: window.innerHeight })
      setLayout(previous => {
        const next = { target: rect, ...position, missing: !rect }
        return JSON.stringify(previous) === JSON.stringify(next) ? previous : next
      })
    }
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure) }
    frame = requestAnimationFrame(measure)
    const observer = new ResizeObserver(schedule)
    observer.observe(card)
    if (target) observer.observe(target)
    window.addEventListener('resize', schedule)
    window.addEventListener('scroll', schedule, true)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('resize', schedule)
      window.removeEventListener('scroll', schedule, true)
      dialog.close()
    }
  }, [step.target])

  const last = index === tourSteps.length - 1
  return <dialog ref={dialogRef} className="tour-layer" aria-modal="true" aria-labelledby="tour-title" aria-describedby="tour-description" onCancel={event => { event.preventDefault(); onExit() }} onKeyDown={event => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onExit() }
  }}>
    <svg className="tour-shade" width="100%" height="100%" aria-hidden="true">
      <defs><mask id="tour-spotlight"><rect width="100%" height="100%" fill="white" />{layout?.target && <rect x={layout.target.left} y={layout.target.top} width={layout.target.width} height={layout.target.height} rx="8" fill="black" />}</mask></defs>
      <rect width="100%" height="100%" fill="#102018" fillOpacity=".70" mask="url(#tour-spotlight)" />
      {layout?.target && <rect data-tour-highlight x={layout.target.left} y={layout.target.top} width={layout.target.width} height={layout.target.height} rx="8" fill="none" stroke="#b6e68f" strokeWidth="3" />}
    </svg>
    <section ref={cardRef} className="tour-card" style={{ left: layout?.left ?? 16, top: layout?.top ?? 16, visibility: layout ? 'visible' : 'hidden' }}>
      <header className="tour-card-header"><span><Compass size={17} />GUIDED WALKTHROUGH</span><button className="icon-button" aria-label="Exit walkthrough" onClick={onExit}><X size={18} /></button></header>
      <div className="tour-progress-label"><span>{step.chapter}</span><span>Step {index + 1} of {tourSteps.length}</span></div>
      <progress aria-label="Walkthrough progress" max={tourSteps.length} value={index + 1} />
      <h2 id="tour-title">{step.title}</h2>
      <p id="tour-description">{step.description}</p>
      {layout?.missing && <p className="tour-unavailable" role="alert">This section could not be highlighted. Continue with Next, or exit and restart the walkthrough.</p>}
      <label className="tour-jump">Jump to a capability<select value={index} onChange={event => onMove(Number(event.target.value))}>{tourSteps.map((item, i) => <option key={item.id} value={i}>{i + 1}. {item.title}</option>)}</select></label>
      <div className="tour-actions"><button className="button secondary small" disabled={index === 0} onClick={() => onMove(index - 1)}><ArrowLeft size={15} />Back</button><button ref={nextRef} className="button primary small" onClick={() => last ? onExit() : onMove(index + 1)}>{last ? 'Finish walkthrough' : 'Next'}{last ? <Check size={15} /> : <ArrowRight size={15} />}</button></div>
      <div className="tour-safety"><ShieldCheck size={14} /><span>Read-only preview. Your saved data stays unchanged.</span></div>
    </section>
  </dialog>
}
