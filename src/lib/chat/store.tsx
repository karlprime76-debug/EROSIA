'use client'

import { createContext, useContext, useReducer, type ReactNode } from 'react'
import type { Conversation, ChatMessage, ChatFilter } from './types'

interface ChatState {
  conversations: Conversation[]
  filter: ChatFilter
  searchQuery: string
  loading: boolean
}

type ChatAction =
  | { type: 'SET_CONVERSATIONS'; conversations: Conversation[] }
  | { type: 'ADD_CONVERSATION'; conversation: Conversation }
  | { type: 'UPDATE_CONVERSATION'; matchId: string; updates: Partial<Conversation> }
  | { type: 'REMOVE_CONVERSATION'; matchId: string }
  | { type: 'SET_FILTER'; filter: ChatFilter }
  | { type: 'SET_SEARCH'; query: string }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'UPDATE_LAST_MESSAGE'; matchId: string; message: ChatMessage }
  | { type: 'SET_TYPING'; matchId: string; isTyping: boolean }
  | { type: 'SET_RECORDING'; matchId: string; isRecording: boolean }
  | { type: 'SET_ONLINE'; profileId: string; isOnline: boolean }
  | { type: 'TOGGLE_FAVORITE'; matchId: string }
  | { type: 'TOGGLE_ARCHIVE'; matchId: string }
  | { type: 'INCREMENT_UNREAD'; matchId: string }
  | { type: 'CLEAR_UNREAD'; matchId: string }

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_CONVERSATIONS':
      return { ...state, conversations: action.conversations, loading: false }
    case 'ADD_CONVERSATION':
      return { ...state, conversations: [action.conversation, ...state.conversations] }
    case 'UPDATE_CONVERSATION':
      return {
        ...state,
        conversations: state.conversations.map(c =>
          c.matchId === action.matchId ? { ...c, ...action.updates } : c
        ),
      }
    case 'REMOVE_CONVERSATION':
      return {
        ...state,
        conversations: state.conversations.filter(c => c.matchId !== action.matchId),
      }
    case 'SET_FILTER':
      return { ...state, filter: action.filter }
    case 'SET_SEARCH':
      return { ...state, searchQuery: action.query }
    case 'SET_LOADING':
      return { ...state, loading: action.loading }
    case 'UPDATE_LAST_MESSAGE':
      return {
        ...state,
        conversations: state.conversations.map(c =>
          c.matchId === action.matchId
            ? { ...c, lastMessage: action.message }
            : c
        ),
      }
    case 'SET_TYPING':
      return {
        ...state,
        conversations: state.conversations.map(c =>
          c.matchId === action.matchId ? { ...c, isTyping: action.isTyping } : c
        ),
      }
    case 'SET_RECORDING':
      return {
        ...state,
        conversations: state.conversations.map(c =>
          c.matchId === action.matchId ? { ...c, isRecording: action.isRecording } : c
        ),
      }
    case 'SET_ONLINE':
      return {
        ...state,
        conversations: state.conversations.map(c =>
          c.profile.id === action.profileId
            ? { ...c, profile: { ...c.profile, is_online: action.isOnline } }
            : c
        ),
      }
    case 'TOGGLE_FAVORITE':
      return {
        ...state,
        conversations: state.conversations.map(c =>
          c.matchId === action.matchId ? { ...c, isFavorite: !c.isFavorite } : c
        ),
      }
    case 'TOGGLE_ARCHIVE':
      return {
        ...state,
        conversations: state.conversations.map(c =>
          c.matchId === action.matchId ? { ...c, isArchived: !c.isArchived } : c
        ),
      }
    case 'INCREMENT_UNREAD':
      return {
        ...state,
        conversations: state.conversations.map(c =>
          c.matchId === action.matchId ? { ...c, unreadCount: c.unreadCount + 1 } : c
        ),
      }
    case 'CLEAR_UNREAD':
      return {
        ...state,
        conversations: state.conversations.map(c =>
          c.matchId === action.matchId ? { ...c, unreadCount: 0 } : c
        ),
      }
    default:
      return state
  }
}

const ChatContext = createContext<{
  state: ChatState
  dispatch: React.Dispatch<ChatAction>
} | null>(null)

export function ChatProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, {
    conversations: [],
    filter: 'all',
    searchQuery: '',
    loading: true,
  })
  return (
    <ChatContext.Provider value={{ state, dispatch }}>
      {children}
    </ChatContext.Provider>
  )
}

export function useChatStore() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChatStore must be used within ChatProvider')
  return ctx
}
