import { describe, expect, it } from 'vitest'
import { loadData, resetData, saveData, storageKey } from './storage'
import { seedData } from './seed'

class MemoryStorage implements Storage {
  private items = new Map<string, string>()
  get length() { return this.items.size }
  getItem(key: string) { return this.items.get(key) ?? null }
  setItem(key: string, value: string) { this.items.set(key, value) }
  removeItem(key: string) { this.items.delete(key) }
  clear() { this.items.clear() }
  key(index: number) { return [...this.items.keys()][index] ?? null }
}
describe('local demo persistence', () => {
  it('persists changes across reload and resets only the app dataset', () => {
    const storage = new MemoryStorage()
    storage.setItem('another-app', 'untouched')
    const data = loadData(storage)
    data.requests[0].title = 'My saved demo edit'
    saveData(data, storage)
    expect(loadData(storage).requests[0].title).toBe('My saved demo edit')
    expect(resetData(storage).requests[0].title).not.toBe('My saved demo edit')
    expect(storage.getItem('another-app')).toBe('untouched')
  })
  it('leaves invalid data intact and surfaces read/write failures', () => {
    const storage = new MemoryStorage()
    storage.setItem(storageKey, '{broken')
    expect(() => loadData(storage)).toThrow()
    expect(storage.getItem(storageKey)).toBe('{broken')
    storage.setItem = () => { throw new Error('Storage quota exceeded') }
    expect(() => saveData(seedData(), storage)).toThrow('quota')
    expect(() => resetData(storage)).toThrow('quota')
    expect(storage.getItem(storageKey)).toBe('{broken')
    storage.getItem = () => { throw new Error('Storage access denied') }
    expect(() => loadData(storage)).toThrow('denied')
  })
})
