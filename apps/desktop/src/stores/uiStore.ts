import { create } from 'zustand'

type ToastType = 'info' | 'success' | 'error'

interface Toast {
  id: string
  type: ToastType
  message: string
}

interface ActionStatus {
  loading: boolean
  message?: string
  error?: string
  startedAt?: number
}

interface UiState {
  actions: Record<string, ActionStatus>
  toasts: Toast[]
  startAction: (key: string, message?: string) => void
  finishAction: (key: string) => void
  failAction: (key: string, error: string) => void
  addToast: (type: ToastType, message: string) => void
  removeToast: (id: string) => void
}

const createToastId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

export const useUiStore = create<UiState>((set) => ({
  actions: {},
  toasts: [],
  startAction: (key, message) =>
    set((state) => ({
      actions: {
        ...state.actions,
        [key]: {
          loading: true,
          message,
          error: undefined,
          startedAt: Date.now(),
        },
      },
    })),
  finishAction: (key) =>
    set((state) => ({
      actions: {
        ...state.actions,
        [key]: {
          ...(state.actions[key] || { loading: false }),
          loading: false,
          error: undefined,
        },
      },
    })),
  failAction: (key, error) =>
    set((state) => ({
      actions: {
        ...state.actions,
        [key]: {
          ...(state.actions[key] || { loading: false }),
          loading: false,
          error,
        },
      },
    })),
  addToast: (type, message) =>
    set((state) => ({
      toasts: [...state.toasts, { id: createToastId(), type, message }],
    })),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),
}))
