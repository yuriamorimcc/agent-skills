import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  CATEGORY_FOLDER_PATTERN,
  DEFAULT_CATEGORY_ID,
  formatCategoryName,
  SKILLS_ROOT_DIR,
} from '@tech-leads-club/core'

import { loadCategoryMetadata } from './categories'
import type { CategoryInfo, SkillInfo } from './types'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export function getSkillsDirectory(): string {
  const devSkillsDir = join(__dirname, '..', '..', '..', SKILLS_ROOT_DIR)
  if (existsSync(devSkillsDir)) return devSkillsDir
  const pkgSkillsDir = join(__dirname, '..', SKILLS_ROOT_DIR)
  if (existsSync(pkgSkillsDir)) return pkgSkillsDir
  const bundleSkillsDir = join(__dirname, SKILLS_ROOT_DIR)
  if (existsSync(bundleSkillsDir)) return bundleSkillsDir
  throw new Error(`Skills directory not found. Checked: ${bundleSkillsDir}, ${pkgSkillsDir}`)
}

export function extractCategoryId(folderName: string): string | null {
  const match = folderName.match(CATEGORY_FOLDER_PATTERN)
  return match ? match[1] : null
}

export function isCategoryFolder(folderName: string): boolean {
  return CATEGORY_FOLDER_PATTERN.test(folderName)
}

function scanForSkills(dirPath: string, categoryId: string): SkillInfo[] {
  const skills: SkillInfo[] = []
  if (!existsSync(dirPath)) return skills

  const entries = readdirSync(dirPath, { withFileTypes: true })

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const skillMdPath = join(dirPath, entry.name, 'SKILL.md')
    if (!existsSync(skillMdPath)) continue

    const content = readFileSync(skillMdPath, 'utf-8')
    const { name, description } = parseSkillFrontmatter(content)

    skills.push({
      name: name || entry.name,
      description: description || 'No description',
      path: join(dirPath, entry.name),
      category: categoryId,
    })
  }

  return skills
}

export function discoverSkills(): SkillInfo[] {
  const skillsDir = getSkillsDirectory()
  const skills: SkillInfo[] = []
  if (!existsSync(skillsDir)) return skills

  const entries = readdirSync(skillsDir, { withFileTypes: true })

  for (const entry of entries) {
    if (!entry.isDirectory()) continue

    if (isCategoryFolder(entry.name)) {
      const categoryId = extractCategoryId(entry.name)
      if (categoryId) {
        const categoryPath = join(skillsDir, entry.name)
        const categorySkills = scanForSkills(categoryPath, categoryId)
        skills.push(...categorySkills)
      }
    } else {
      const skillMdPath = join(skillsDir, entry.name, 'SKILL.md')
      if (existsSync(skillMdPath)) {
        const content = readFileSync(skillMdPath, 'utf-8')
        const { name, description } = parseSkillFrontmatter(content)

        skills.push({
          name: name || entry.name,
          description: description || 'No description',
          path: join(skillsDir, entry.name),
          category: DEFAULT_CATEGORY_ID,
        })
      }
    }
  }

  return skills
}

export function discoverCategories(): CategoryInfo[] {
  const skillsDir = getSkillsDirectory()
  if (!existsSync(skillsDir)) return []

  const metadata = loadCategoryMetadata()
  const entries = readdirSync(skillsDir, { withFileTypes: true })
  const categories: CategoryInfo[] = []

  let index = 0

  for (const entry of entries) {
    if (!entry.isDirectory() || !isCategoryFolder(entry.name)) continue

    const categoryId = extractCategoryId(entry.name)
    if (!categoryId) continue

    const meta = metadata[entry.name] ?? {}
    categories.push({
      id: categoryId,
      name: meta.name ?? formatCategoryName(categoryId),
      description: meta.description,
      priority: meta.priority ?? index,
    })
    index++
  }

  categories.sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100))
  return categories
}

function parseSkillFrontmatter(content: string): { name?: string; description?: string } {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/)
  if (!frontmatterMatch) return {}
  const frontmatter = frontmatterMatch[1]
  const nameMatch = frontmatter.match(/^name:\s*(.+)$/m)
  const descMatch = frontmatter.match(/^description:\s*(.+)$/m)
  return { name: nameMatch?.[1]?.trim(), description: descMatch?.[1]?.trim() }
}

export function getSkillByName(name: string): SkillInfo | undefined {
  return discoverSkills().find((s) => s.name === name)
}
