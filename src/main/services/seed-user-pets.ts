import fs from 'fs'
import path from 'path'

export function seedUserPets(bundledPetsDir: string, userPetsDir: string): void {
  fs.mkdirSync(userPetsDir, { recursive: true })

  for (const entry of fs.readdirSync(bundledPetsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue
    }
    const targetDir = path.join(userPetsDir, entry.name)
    if (fs.existsSync(targetDir)) {
      continue
    }
    fs.cpSync(path.join(bundledPetsDir, entry.name), targetDir, { recursive: true })
  }
}
