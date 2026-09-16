/* Favorites / pins / document tags. Purely client state today; a backend would
   expose the same add/remove/toggle operations per user. */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from 'react'
import { useLocalStorage } from './hooks'
import { DEFAULT_TAGS } from './appData'

interface PinnedConversation {
  id: string
  title: string
}

export interface Workspace {
  id: string
  name: string
}

const DEFAULT_WORKSPACES: Workspace[] = [
  { id: 'ws_personal', name: 'Personal' },
  { id: 'ws_team', name: 'RAG Starter Team' },
]

interface WorkspaceState {
  starredKbs: string[]
  favoriteDocs: string[]
  pinnedConversations: PinnedConversation[]
  tagsByDoc: Record<string, string[]>
  customTags: string[]
  workspaces: Workspace[]
  currentWorkspaceId: string
}

const EMPTY: WorkspaceState = {
  starredKbs: ['kb_english'],
  favoriteDocs: ['doc_eng_grammar'],
  pinnedConversations: [
    { id: 'cv_present_perfect', title: 'Present perfect vs past simple' },
  ],
  tagsByDoc: {
    doc_eng_grammar: ['Education', 'Important'],
    doc_platform_spec: ['Programming'],
  },
  customTags: [],
  workspaces: DEFAULT_WORKSPACES,
  currentWorkspaceId: 'ws_personal',
}

interface WorkspaceValue extends WorkspaceState {
  allTags: string[]
  currentWorkspace: Workspace
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
  createWorkspace: (name: string) => void
  renameWorkspace: (id: string, name: string) => void
}

const WorkspaceContext = createContext<WorkspaceValue | null>(null)

const without = <T,>(arr: T[], v: T) => arr.filter((x) => x !== v)

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useLocalStorage<WorkspaceState>(
    'rag-starter.workspace',
    EMPTY,
  )

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
    (name: string) =>
      setState((s) => {
        const id = `ws_${Date.now()}`
        return {
          ...s,
          workspaces: [...s.workspaces, { id, name }],
          currentWorkspaceId: id,
        }
      }),
    [setState],
  )
  const renameWorkspace = useCallback(
    (id: string, name: string) =>
      setState((s) => ({
        ...s,
        workspaces: s.workspaces.map((w) => (w.id === id ? { ...w, name } : w)),
      })),
    [setState],
  )

  const value = useMemo<WorkspaceValue>(() => {
    const allTags = [...DEFAULT_TAGS, ...state.customTags]
    const currentWorkspace =
      state.workspaces.find((w) => w.id === state.currentWorkspaceId) ?? state.workspaces[0]
    return {
      ...state,
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
