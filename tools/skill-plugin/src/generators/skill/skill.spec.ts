import { Tree } from '@nx/devkit'
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing'

import { SkillGeneratorSchema } from './schema'
import { skillGenerator } from './skill'

describe('skill generator', () => {
  let tree: Tree
  const options: SkillGeneratorSchema = { name: 'test' }

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace()
    tree.write(
      'skills/categories.json',
      JSON.stringify({
        $schema: './categories.schema.json',
        categories: [{ id: 'development', name: 'Development', priority: 1 }],
        skills: {},
      }),
    )
  })

  it('should run successfully', async () => {
    await skillGenerator(tree, options)
    expect(tree.exists('skills/test/SKILL.md')).toBeTruthy()
  })

  it('should assign skill to existing category', async () => {
    await skillGenerator(tree, { name: 'my-skill', category: 'development' })
    expect(tree.exists('skills/my-skill/SKILL.md')).toBeTruthy()
    const categoriesContent = tree.read('skills/categories.json', 'utf-8')
    const categories = JSON.parse(categoriesContent!)
    expect(categories.skills['my-skill']).toBe('development')
  })

  it('should create new category when assigning to non-existent', async () => {
    await skillGenerator(tree, { name: 'my-skill', category: 'new-category' })
    expect(tree.exists('skills/my-skill/SKILL.md')).toBeTruthy()
    const categoriesContent = tree.read('skills/categories.json', 'utf-8')
    const categories = JSON.parse(categoriesContent!)
    expect(categories.skills['my-skill']).toBe('new-category')
    expect(categories.categories.some((c: { id: string }) => c.id === 'new-category')).toBeTruthy()
  })

  it('should format category name from kebab-case', async () => {
    await skillGenerator(tree, { name: 'my-skill', category: 'my-awesome-category' })
    const categoriesContent = tree.read('skills/categories.json', 'utf-8')
    const categories = JSON.parse(categoriesContent!)
    const newCategory = categories.categories.find((c: { id: string }) => c.id === 'my-awesome-category')
    expect(newCategory).toBeDefined()
    expect(newCategory.name).toBe('My Awesome Category')
  })

  it('should work without category', async () => {
    await skillGenerator(tree, { name: 'uncategorized-skill' })
    expect(tree.exists('skills/uncategorized-skill/SKILL.md')).toBeTruthy()
    const categoriesContent = tree.read('skills/categories.json', 'utf-8')
    const categories = JSON.parse(categoriesContent!)
    expect(categories.skills['uncategorized-skill']).toBeUndefined()
  })
})
