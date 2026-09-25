/* Favorites / pins / document tags are client state. Workspaces are real: they come from the API,
   and only the id of the one you last selected is remembered in the browser. */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from 'react'
import { useEffect, useState } from 'react'
import { useLocalStorage } from './hooks'
import { useAuth } from './auth'
import {
  createWorkspace as apiCreateWorkspace,
  listWorkspaces,
  updateWorkspace as apiUpdateWorkspace,
} from '../services/api'
import { DEFAULT_TAGS } from './appData'

interface PinnedConversation {
  id: string
  title: string
}

export interface Workspace {
  id: string
  name: string
}

interface WorkspaceState {
  starredKbs: string[]
  favoriteDocs: string[]
  pinnedConversations: PinnedConversation[]
  tagsByDoc: Record<string, string[]>
  customTags: string[]
  currentWorkspaceId: string
}

const EMPTY: WorkspaceState = {
  starredKbs: [],
  favoriteDocs: [],
  pinnedConversations: [],
  tagsByDoc: {},
  customTags: [],
  currentWorkspaceId: '',
}

interface WorkspaceValue extends WorkspaceState {
  allTags: string[]
  workspaces: Workspace[]
  /** undefined until the list loads, and when the user has no workspace yet. */
  currentWorkspace: Workspace | undefined
  toggleKb: (id: string) => void
  toggleDoc: (id: string) => void
  togglePin: (c: PinnedConversation) => void
  isKbStarred: (id: string) => boolean
  isDocFavorite: (id: string) => boolean
  isPinned: (id: string) => boolean
  addTagToDoc: (docId: string, tag: string) => void
  removeTagFromDoc: (docId: string, tag: string) => void
  createTag: (tag: string) => void
  switchWorkspace: (id: string) => void
  /** Rejects with the API's message, e.g. when the plan does not include team workspaces. */
  createWorkspace: (name: string) => Promise<void>
  renameWorkspace: (id: string, name: string) => Promise<void>
}

const WorkspaceContext = createContext<WorkspaceValue | null>(null)

const without = <T,>(arr: T[], v: T) => arr.filter((x) => x !== v)

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useLocalStorage<WorkspaceState>(
    'rag-starter.workspace',
    EMPTY,
  )

  const { user } = useAuth()
  const userId = user?.id ?? null
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])

  const refreshWorkspaces = useCallback(async () => {
    const list = await listWorkspaces()
    setWorkspaces(list.map((w) => ({ id: w.id, name: w.name })))
  }, [])

  useEffect(() => {
    if (!userId) {
      setWorkspaces([])
      return
    }
    refreshWorkspaces().catch(() => setWorkspaces([]))
  }, [userId, refreshWorkspaces])

  const toggleKb = useCallback(
    (id: string) =>
      setState((s) => ({
        ...s,
        starredKbs: s.starredKbs.includes(id)
          ? without(s.starredKbs, id)
          : [...s.starredKbs, id],
      })),
    [setState],
  )
  const toggleDoc = useCallback(
    (id: string) =>
      setState((s) => ({
        ...s,
        favoriteDocs: s.favoriteDocs.includes(id)
          ? without(s.favoriteDocs, id)
          : [...s.favoriteDocs, id],
      })),
    [setState],
  )
  const togglePin = useCallback(
    (c: PinnedConversation) =>
      setState((s) => ({
        ...s,
        pinnedConversations: s.pinnedConversations.some((p) => p.id === c.id)
          ? s.pinnedConversations.filter((p) => p.id !== c.id)
          : [...s.pinnedConversations, c],
      })),
    [setState],
  )

  const addTagToDoc = useCallback(
    (docId: string, tag: string) =>
      setState((s) => {
        const cur = s.tagsByDoc[docId] ?? []
        if (cur.includes(tag)) return s
        return { ...s, tagsByDoc: { ...s.tagsByDoc, [docId]: [...cur, tag] } }
      }),
    [setState],
  )
  const removeTagFromDoc = useCallback(
    (docId: string, tag: string) =>
      setState((s) => ({
        ...s,
        tagsByDoc: { ...s.tagsByDoc, [docId]: without(s.tagsByDoc[docId] ?? [], tag) },
      })),
    [setState],
  )
  const createTag = useCallback(
    (tag: string) =>
      setState((s) =>
        s.customTags.includes(tag) || DEFAULT_TAGS.includes(tag)
          ? s
          : { ...s, customTags: [...s.customTags, tag] },
      ),
    [setState],
  )

  const switchWorkspace = useCallback(
    (id: string) => setState((s) => ({ ...s, currentWorkspaceId: id })),
    [setState],
  )
  const createWorkspace = useCallback(
    async (name: string) => {
      const created = await apiCreateWorkspace(name)
      await refreshWorkspaces()
      setState((s) => ({ ...s, currentWorkspaceId: created.id }))
    },
    [refreshWorkspaces, setState],
  )
  const renameWorkspace = useCallback(
    async (id: string, name: string) => {
      await apiUpdateWorkspace(id, name)
      await refreshWorkspaces()
    },
    [refreshWorkspaces],
  )

  const value = useMemo<WorkspaceValue>(() => {
    const allTags = [...DEFAULT_TAGS, ...state.customTags]
    const currentWorkspace =
      workspaces.find((w) => w.id === state.currentWorkspaceId) ?? workspaces[0]
    return {
      ...state,
      workspaces,
      allTags,
      currentWorkspace,
      toggleKb,
      toggleDoc,
      togglePin,
      isKbStarred: (id) => state.starredKbs.includes(id),
      isDocFavorite: (id) => state.favoriteDocs.includes(id),
      isPinned: (id) => state.pinnedConversations.some((p) => p.id === id),
      addTagToDoc,
      removeTagFromDoc,
      createTag,
      switchWorkspace,
      createWorkspace,
      renameWorkspace,
    }
  }, [
    state,
    workspaces,
    toggleKb,
    toggleDoc,
    togglePin,
    addTagToDoc,
    removeTagFromDoc,
    createTag,
    switchWorkspace,
    createWorkspace,
    renameWorkspace,
  ])

  return (
    <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace must be used inside <WorkspaceProvider>')
  return ctx
}
