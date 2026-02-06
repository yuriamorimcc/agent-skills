import pc from 'picocolors'

import { getAgentConfig } from '../agents'
import { listInstalledSkills } from '../installer'
import type { AgentType } from '../types'
import { truncate } from '../ui/formatting'
import type { Option } from '../ui/input'

export interface UpdateConfig {
  skills: string[]
  agents: AgentType[]
  global: boolean
}

export function buildAgentOptions(agents: AgentType[], detectedAgents: AgentType[] = []): Option<AgentType>[] {
  return agents.map((type) => {
    const config = getAgentConfig(type)
    const isDetected = detectedAgents.includes(type)
    return {
      value: type,
      label: isDetected ? `${config.displayName} ${pc.green('● detected')}` : config.displayName,
      hint: truncate(config.description, 50),
    }
  })
}

export async function getInstalledSkillNames(agents: AgentType[], global: boolean): Promise<Set<string>> {
  const installed = new Set<string>()
  for (const agent of agents) {
    const skills = await listInstalledSkills(agent, global)
    skills.forEach((skill) => installed.add(skill))
  }
  return installed
}

export async function getAllInstalledSkillNames(agents: AgentType[]): Promise<Set<string>> {
  const [globalSkills, localSkills] = await Promise.all([
    getInstalledSkillNames(agents, true),
    getInstalledSkillNames(agents, false),
  ])
  return new Set([...globalSkills, ...localSkills])
}

export async function getAgentsWithInstalledSkills(agents: AgentType[]): Promise<AgentType[]> {
  const agentsWithSkills: AgentType[] = []
  for (const agent of agents) {
    const [globalSkills, localSkills] = await Promise.all([
      listInstalledSkills(agent, true),
      listInstalledSkills(agent, false),
    ])
    if (globalSkills.length > 0 || localSkills.length > 0) agentsWithSkills.push(agent)
  }
  return agentsWithSkills
}

export async function getUpdateConfigs(agents: AgentType[]): Promise<UpdateConfig[]> {
  const configs: UpdateConfig[] = []

  const localAgents: AgentType[] = []
  const globalAgents: AgentType[] = []
  const localSkills = new Set<string>()
  const globalSkills = new Set<string>()

  for (const agent of agents) {
    const [agentGlobalSkills, agentLocalSkills] = await Promise.all([
      listInstalledSkills(agent, true),
      listInstalledSkills(agent, false),
    ])

    if (agentLocalSkills.length > 0) {
      localAgents.push(agent)
      agentLocalSkills.forEach((s) => localSkills.add(s))
    }

    if (agentGlobalSkills.length > 0) {
      globalAgents.push(agent)
      agentGlobalSkills.forEach((s) => globalSkills.add(s))
    }
  }

  if (localAgents.length > 0) {
    configs.push({ skills: Array.from(localSkills), agents: localAgents, global: false })
  }

  if (globalAgents.length > 0) {
    configs.push({ skills: Array.from(globalSkills), agents: globalAgents, global: true })
  }

  return configs
}

export async function getInstalledSkillsForAgents(
  agents: AgentType[],
  allSkills: { name: string }[],
): Promise<Map<string, AgentType[]>> {
  const catalogSkillNames = new Set(allSkills.map((s) => s.name))
  const skillToAgents = new Map<string, AgentType[]>()

  for (const agent of agents) {
    const [globalSkills, localSkills] = await Promise.all([
      listInstalledSkills(agent, true),
      listInstalledSkills(agent, false),
    ])

    const allAgentSkills = new Set([...globalSkills, ...localSkills])

    for (const skill of allAgentSkills) {
      if (!catalogSkillNames.has(skill)) continue
      if (!skillToAgents.has(skill)) skillToAgents.set(skill, [])
      skillToAgents.get(skill)!.push(agent)
    }
  }

  return skillToAgents
}
