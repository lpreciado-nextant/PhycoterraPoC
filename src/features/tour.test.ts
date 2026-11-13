import { describe, expect, it } from 'vitest'
import { placeTourCard, tourDialog, tourSteps } from './tour'
import { seedData } from '../data/seed'
import { hasHold, outstanding, status } from '../domain/workflow'

describe('walkthrough positioning', () => {
  it('places the popup beside an unobstructed desktop target', () => {
    const target = { left: 250, top: 200, width: 200, height: 100 }
    const p = placeTourCard(target, { width: 360, height: 380 }, { width: 1440, height: 1000 })
    expect(p.left).toBeGreaterThan(target.left + target.width)
    expect(p.top).toBeGreaterThanOrEqual(16)
    expect(p.top + 380).toBeLessThanOrEqual(984)
  })
  it.each([
    { left: 1350, top: 900, width: 70, height: 80 },
    { left: 0, top: 0, width: 1400, height: 990 },
    { left: 1400, top: 0, width: 40, height: 40 },
  ])('keeps edge-target popups inside the viewport: %j', target => {
    const p = placeTourCard(target, { width: 360, height: 380 }, { width: 1440, height: 1000 })
    expect(p.left).toBeGreaterThanOrEqual(16)
    expect(p.left + 360).toBeLessThanOrEqual(1424)
    expect(p.top).toBeGreaterThanOrEqual(16)
    expect(p.top + 380).toBeLessThanOrEqual(984)
  })
  it('uses the space below a narrow-screen target without obscuring it', () => {
    const p = placeTourCard({ left: 16, top: 30, width: 340, height: 80 }, { width: 340, height: 390 }, { width: 390, height: 844 })
    expect(p.top).toBeGreaterThanOrEqual(110)
    expect(p.left + 340).toBeLessThanOrEqual(374)
    expect(p.top + 390).toBeLessThanOrEqual(828)
  })
  it('provides a usable centered popup if a target is missing', () => {
    expect(placeTourCard(null, { width: 340, height: 390 }, { width: 390, height: 844 })).toEqual({ left: 25, top: 227 })
  })
})

describe('walkthrough scenarios', () => {
  it('uses independent sample data even if the saved requests have been changed', () => {
    const saved = seedData()
    saved.requests = saved.requests.filter(r => !r.purchase)
    saved.requests[0].title = 'My private local draft'
    const before = JSON.stringify(saved)
    const preview = seedData()
    for (const step of tourSteps) {
      const scene = tourDialog(step)
      if (!scene || !('id' in scene)) continue
      const request = preview.requests.find(r => r.id === scene.id)
      expect(request, step.id).toBeDefined()
      if (!request) throw new Error('Missing tour request')
      if (scene.kind === 'form') expect([request.stage, request.requester]).toEqual(['Draft', step.persona])
      if (step.id === 'approval') expect(status(request)).toBe('Pending approval')
      if (step.id === 'purchase') expect(status(request)).toBe('Ready to purchase')
      if (step.id === 'receiving') expect(outstanding(request)).toBe(6)
      if (step.id === 'inspection') expect(hasHold(request)).toBe(true)
      if (step.id === 'completion') expect(status(request)).toBe('Completed')
    }
    expect(JSON.stringify(saved)).toBe(before)
  })
})
