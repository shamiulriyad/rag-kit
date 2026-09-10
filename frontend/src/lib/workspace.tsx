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

interface WorkspaceState {
  starredKbs: string[]
  favoriteDocs: string[]
  pinnedConversations: PinnedConversation[]
  tagsByDoc: Record<string, string[]>
  customTags: string[]
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
}

interface WorkspaceValue extends WorkspaceState {
  allTags: string[]
  toggleKb: (id: string) => void
  toggleDoc: (id: string) => void
  togglePin: (c: PinnedConversation) => void
  isKbStarred: (id: string) => boolean
  isDocFavorite: (id: string) => boolean
  isPinned: (id: string) => boolean
  addTagToDoc: (docId: string, tag: string) => void
  removeTagFromDoc: (docId: string, tag: string) => void
  createTag: (tag: string) => void
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

  const value = useMemo<WorkspaceValue>(() => {
    const allTags = [...DEFAULT_TAGS, ...state.customTags]
    return {
      ...state,
      allTags,
      toggleKb,
      toggleDoc,
      togglePin,
      isKbStarred: (id) => state.starredKbs.includes(id),
      isDocFavorite: (id) => state.favoriteDocs.includes(id),
      isPinned: (id) => state.pinnedConversations.some((p) => p.id === id),
      addTagToDoc,
      removeTagFromDoc,
      createTag,
    }
  }, [state, toggleKb, toggleDoc, togglePin, addTagToDoc, removeTagFromDoc, createTag])

  return (
    <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace must be used inside <WorkspaceProvider>')
  return ctx
}
