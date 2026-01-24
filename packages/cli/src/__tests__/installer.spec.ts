import { jest } from '@jest/globals'

// Mock file system
jest.unstable_mockModule('node:fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  symlinkSync: jest.fn(),
  cpSync: jest.fn(),
  readdirSync: jest.fn(),
}))

const { installSkills, listInstalledSkills } = await import('../installer')
const { existsSync, mkdirSync, symlinkSync, cpSync, readdirSync } = await import('node:fs')

import type { InstallOptions, SkillInfo } from '../types'

describe('installer', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('installSkills', () => {
    const mockSkill: SkillInfo = {
      name: 'test-skill',
      description: 'A test skill',
      path: '/path/to/skills/test-skill',
    }

    const mockOptions: InstallOptions = {
      global: false,
      method: 'symlink',
      agents: ['cursor'],
      skills: ['test-skill'],
    }

    it('should create target directory if it does not exist', () => {
      ;(existsSync as jest.Mock).mockReturnValue(false)

      installSkills([mockSkill], mockOptions)

      expect(mkdirSync).toHaveBeenCalled()
    })

    it('should skip installation if skill already exists', () => {
      ;(existsSync as jest.Mock).mockReturnValue(true)

      const results = installSkills([mockSkill], mockOptions)

      expect(results[0].success).toBe(true)
      expect(results[0].error).toBe('Already exists')
      expect(symlinkSync).not.toHaveBeenCalled()
    })

    it('should install skill via copy when method is copy', () => {
      ;(existsSync as jest.Mock).mockImplementation((path) => {
        // Target dir exists, skill does not
        return String(path).includes('.cursor/skills') && !String(path).includes('test-skill')
      })

      const copyOptions = { ...mockOptions, method: 'copy' as const }
      installSkills([mockSkill], copyOptions)

      expect(cpSync).toHaveBeenCalled()
    })
  })

  describe('listInstalledSkills', () => {
    it('should return empty array when directory does not exist', () => {
      ;(existsSync as jest.Mock).mockReturnValue(false)

      const skills = listInstalledSkills('cursor', false)
      expect(skills).toEqual([])
    })

    it('should return skill names from directory', () => {
      ;(existsSync as jest.Mock).mockReturnValue(true)
      ;(readdirSync as jest.Mock).mockReturnValue([
        { name: 'skill1', isDirectory: () => true, isSymbolicLink: () => false },
        { name: 'skill2', isDirectory: () => false, isSymbolicLink: () => true },
        { name: 'file.txt', isDirectory: () => false, isSymbolicLink: () => false },
      ])

      const skills = listInstalledSkills('cursor', false)
      expect(skills).toEqual(['skill1', 'skill2'])
    })
  })
})
