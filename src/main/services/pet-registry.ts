import fs from 'fs'
import path from 'path'
import { pathToFileURL } from 'url'
import type { PetDefinition } from '../../types'

export class PetRegistry {
  constructor(private readonly petsDir: string) {}

  load(petId: string): PetDefinition {
    const petDir = path.join(this.petsDir, petId)
    
    const definition = JSON.parse(fs.readFileSync(path.join(petDir, 'pet.json'), 'utf8'),) as PetDefinition
    
    const prompt = fs.readFileSync(path.join(petDir, definition.promptFile), 'utf8')
    
    const spriteMap = JSON.parse(
      fs.readFileSync(path.join(petDir, definition.spritesFile), 'utf8'),
    ) as Record<string, string[]>
    
    const sprites = Object.fromEntries(
      Object.entries(spriteMap).map(([animation, frames]) => [
        animation,
        frames.map((frame) =>
          frame.startsWith('data:') ? frame : pathToFileURL(path.join(petDir, frame)).href,
        ),
      ]),
    )
    return { ...definition, prompt, sprites }
  }
}
