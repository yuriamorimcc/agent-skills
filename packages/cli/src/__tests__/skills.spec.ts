import { jest } from '@jest/globals'

// Mock file system
jest.unstable_mockModule('node:fs', () => ({
  ...(jest.requireActual('node:fs') as object),
  existsSync: jest.fn(),
  readdirSync: jest.fn(),
  readFileSync: jest.fn(),
}))

// Dynamic import for mocked module
const { discoverSkills, getSkillByName, getSkillsDirectory } = await import('../skills')
const { existsSync: mockExistsSync } = await import('node:fs')

describe('skills', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getSkillsDirectory', () => {
    it('should find skills directory in development mode', () => {
      ;(mockExistsSync as jest.Mock).mockImplementation((path) => {
        return String(path).includes('skills') && !String(path).includes('dist')
      })

      const result = getSkillsDirectory()
      expect(result).toContain('skills')
    })

    it('should throw error when skills directory not found', () => {
      ;(mockExistsSync as jest.Mock).mockReturnValue(false)

      expect(() => getSkillsDirectory()).toThrow('Skills directory not found')
    })
  })

  describe('discoverSkills', () => {
    it('return empty array when directory is empty', async () => {
      ;(mockExistsSync as jest.Mock).mockImplementation((path) => {
        // Permitir encontrar o diretório raiz de skills
        if (String(path).endsWith('skills')) return true
        return false
      })

      const { readdirSync } = await import('node:fs')
      ;(readdirSync as jest.Mock).mockReturnValue([])

      const skills = discoverSkills()
      expect(skills).toEqual([])
    })
  })

  describe('getSkillByName', () => {
    it('should return undefined for non-existent skill', async () => {
      ;(mockExistsSync as jest.Mock).mockImplementation((path) => {
        // Permitir encontrar o diretório raiz de skills
        if (String(path).endsWith('skills')) return true
        return false
      })

      const { readdirSync } = await import('node:fs')
      ;(readdirSync as jest.Mock).mockReturnValue([])

      const skill = getSkillByName('non-existent-skill')
      expect(skill).toBeUndefined()
    })
  })
})
