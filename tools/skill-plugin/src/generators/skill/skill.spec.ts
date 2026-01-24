import { Tree } from '@nx/devkit'
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing'

import { SkillGeneratorSchema } from './schema'
import { skillGenerator } from './skill'

describe('skill generator', () => {
  let tree: Tree
  const options: SkillGeneratorSchema = { name: 'test' }

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace()
  })

  it('should run successfully', async () => {
    await skillGenerator(tree, options)
    expect(tree.exists('skills/test/SKILL.md')).toBeTruthy()
  })
})
