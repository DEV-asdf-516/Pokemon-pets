import fs from 'fs'
import path from 'path'

export class JsonStore<T> {
  constructor(
    private readonly filePath: string,
    private readonly fallbackValue: T,
  ) {}

  read(): T {
    try {
      if (!fs.existsSync(this.filePath)) {
        return this.fallbackValue
      }
      return JSON.parse(fs.readFileSync(this.filePath, 'utf8')) as T
    } catch {
      return this.fallbackValue
    }
  }

  write(value: T): boolean {
    try {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true })
      fs.writeFileSync(this.filePath, JSON.stringify(value), 'utf8')
      return true
    } catch {
      return false
    }
  }
}
