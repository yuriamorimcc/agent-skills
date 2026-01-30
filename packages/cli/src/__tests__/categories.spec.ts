import { afterEach, beforeEach, describe, expect, it } from '@jest/globals'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import type { CategoryInfo, CategoryMetadata } from '../types'

describe('categories', () => {
  let tempDir: string
  let skillsDir: string

  beforeEach(async () => {
    tempDir = join(tmpdir(), `categories-test-${Date.now()}`)
    skillsDir = join(tempDir, 'skills')
    await mkdir(skillsDir, { recursive: true })
  })

  afterEach(async () => {
    try {
      await rm(tempDir, { recursive: true, force: true })
    } catch {
      // Ignore
    }
  })

  describe('CategoryInfo type', () => {
    it('should have correct structure', () => {
      const category: CategoryInfo = {
        id: 'test-category',
        name: 'Test Category',
        description: 'A test category',
        priority: 1,
      }
      expect(category.id).toBe('test-category')
      expect(category.name).toBe('Test Category')
    })

    it('should allow optional fields', () => {
      const category: CategoryInfo = { id: 'minimal', name: 'Minimal Category' }
      expect(category.description).toBeUndefined()
      expect(category.priority).toBeUndefined()
    })
  })

  describe('CategoryMetadata type', () => {
    it('should map folder names to metadata', () => {
      const metadata: CategoryMetadata = {
        '(development)': { name: 'Development Tools', description: 'Skills for development', priority: 1 },
        '(creation)': { name: 'Skill Creation', priority: 2 },
      }
      expect(metadata['(development)'].name).toBe('Development Tools')
      expect(metadata['(creation)'].priority).toBe(2)
    })

    it('should allow partial metadata', () => {
      const metadata: CategoryMetadata = {
        '(tools)': { name: 'Tools' },
      }
      expect(metadata['(tools)'].description).toBeUndefined()
    })
  })

  describe('category folder naming convention', () => {
    it('should use parentheses for category folders', () => {
      const categoryIdToFolderName = (id: string) => `(${id})`
      expect(categoryIdToFolderName('development')).toBe('(development)')
      expect(categoryIdToFolderName('web-automation')).toBe('(web-automation)')
    })

    it('should extract category ID from folder name', () => {
      const folderNameToCategoryId = (folder: string) => {
        const match = folder.match(/^\(([a-z][a-z0-9-]*)\)$/)
        return match ? match[1] : null
      }
      expect(folderNameToCategoryId('(development)')).toBe('development')
      expect(folderNameToCategoryId('(web-automation)')).toBe('web-automation')
      expect(folderNameToCategoryId('regular-folder')).toBeNull()
    })
  })

  describe('category priority sorting', () => {
    it('should sort categories by priority', () => {
      const categories: CategoryInfo[] = [
        { id: 'last', name: 'Last', priority: 100 },
        { id: 'first', name: 'First', priority: 1 },
        { id: 'middle', name: 'Middle', priority: 50 },
      ]
      const sorted = [...categories].sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100))
      expect(sorted[0].id).toBe('first')
      expect(sorted[1].id).toBe('middle')
      expect(sorted[2].id).toBe('last')
    })

    it('should handle missing priority', () => {
      const categories: CategoryInfo[] = [
        { id: 'with-priority', name: 'With Priority', priority: 1 },
        { id: 'no-priority', name: 'No Priority' },
      ]
      const sorted = [...categories].sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100))
      expect(sorted[0].id).toBe('with-priority')
      expect(sorted[1].id).toBe('no-priority')
    })
  })

  describe('file-system based category discovery', () => {
    it('should identify category folders by pattern', () => {
      const isCategoryFolder = (name: string) => /^\([a-z][a-z0-9-]*\)$/.test(name)
      expect(isCategoryFolder('(development)')).toBe(true)
      expect(isCategoryFolder('(web-automation)')).toBe(true)
      expect(isCategoryFolder('regular-folder')).toBe(false)
      expect(isCategoryFolder('(UPPERCASE)')).toBe(false)
    })

    it('should create category folders correctly', async () => {
      const categoryFolder = join(skillsDir, '(development)')
      await mkdir(categoryFolder, { recursive: true })
      const { readdirSync } = await import('node:fs')
      const entries = readdirSync(skillsDir)
      expect(entries).toContain('(development)')
    })

    it('should create skills inside category folders', async () => {
      const categoryFolder = join(skillsDir, '(development)')
      const skillFolder = join(categoryFolder, 'my-skill')
      await mkdir(skillFolder, { recursive: true })
      await writeFile(join(skillFolder, 'SKILL.md'), '---\nname: my-skill\n---\n# My Skill')
      const { existsSync } = await import('node:fs')
      expect(existsSync(join(skillFolder, 'SKILL.md'))).toBe(true)
    })
  })

  describe('groupSkillsByCategory logic', () => {
    it('should group skills correctly', () => {
      interface TestSkill {
        name: string
        category?: string
      }

      const skills: TestSkill[] = [
        { name: 'skill-a', category: 'development' },
        { name: 'skill-b', category: 'development' },
        { name: 'skill-c', category: 'creation' },
      ]

      const grouped = new Map<string, TestSkill[]>()

      for (const skill of skills) {
        const categoryId = skill.category ?? 'uncategorized'
        const group = grouped.get(categoryId) ?? []
        group.push(skill)
        grouped.set(categoryId, group)
      }

      expect(grouped.get('development')).toHaveLength(2)
      expect(grouped.get('creation')).toHaveLength(1)
      expect(grouped.get('uncategorized')).toBeUndefined()
    })

    it('should handle skills without category', () => {
      interface TestSkill {
        name: string
        category?: string
      }

      const skills: TestSkill[] = [{ name: 'skill-a', category: 'development' }, { name: 'skill-b' }]
      const grouped = new Map<string, TestSkill[]>()

      for (const skill of skills) {
        const categoryId = skill.category ?? 'uncategorized'
        const group = grouped.get(categoryId) ?? []
        group.push(skill)
        grouped.set(categoryId, group)
      }

      expect(grouped.get('development')).toHaveLength(1)
      expect(grouped.get('uncategorized')).toHaveLength(1)
    })
  })

  describe('category name formatting', () => {
    it('should format kebab-case to Title Case', () => {
      const formatCategoryName = (id: string): string => {
        return id
          .split('-')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
      }

      expect(formatCategoryName('skill-creation')).toBe('Skill Creation')
      expect(formatCategoryName('development')).toBe('Development')
      expect(formatCategoryName('my-awesome-category')).toBe('My Awesome Category')
    })
  })

  describe('_category.json metadata', () => {
    it('should parse metadata file correctly', async () => {
      const metadataPath = join(skillsDir, '_category.json')
      const metadata: CategoryMetadata = {
        '(development)': {
          name: 'Development Tools',
          description: 'Skills for developers',
          priority: 1,
        },
      }
      await writeFile(metadataPath, JSON.stringify(metadata, null, 2))
      const { readFileSync } = await import('node:fs')
      const content = readFileSync(metadataPath, 'utf-8')
      const parsed = JSON.parse(content) as CategoryMetadata
      expect(parsed['(development)'].name).toBe('Development Tools')
      expect(parsed['(development)'].priority).toBe(1)
    })

    it('should work without metadata file', () => {
      const formatCategoryName = (id: string) =>
        id
          .split('-')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ')
      const categoryId = 'web-automation'
      const displayName = formatCategoryName(categoryId)
      expect(displayName).toBe('Web Automation')
    })
  })
})
