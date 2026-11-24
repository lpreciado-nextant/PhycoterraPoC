import { parseDataset } from '../domain/workflow'
import type { Dataset } from '../domain/workflow'
import { seedData } from './seed'
import { ZodError } from 'zod'

export const storageKey = 'phycoterra-purchasing-demo-v4'
export function loadData(storage: Storage = localStorage): Dataset {
  const raw = storage.getItem(storageKey)
  if (raw === null) {
    const data = seedData()
    saveData(data, storage)
    return data
  }
  return parseDataset(JSON.parse(raw))
}
export function saveData(data: Dataset, storage: Storage = localStorage): void {
  storage.setItem(storageKey, JSON.stringify(parseDataset(data)))
}
export function resetData(storage: Storage = localStorage): Dataset {
  const data = seedData()
  saveData(data, storage)
  return data
}
export function errorMessage(error: unknown): string {
  if (error instanceof ZodError) return error.issues.map(issue => `${issue.path.join('.') || 'Form'}: ${issue.message}`).join('; ')
  if (error instanceof Error) return error.message
  return 'An unexpected error occurred. Your change was not saved.'
}
