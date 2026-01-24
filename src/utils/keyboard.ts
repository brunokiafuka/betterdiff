// Keyboard shortcut manager for the app

export type ShortcutHandler = () => void

export interface Shortcut {
  key: string
  modifiers: ('cmd' | 'ctrl' | 'shift' | 'alt')[]
  description: string
  handler: ShortcutHandler
}

class KeyboardManager {
  private shortcuts: Map<string, Shortcut> = new Map()

  constructor() {
    this.handleKeyDown = this.handleKeyDown.bind(this)
  }

  register(id: string, shortcut: Shortcut) {
    this.shortcuts.set(id, shortcut)
  }

  unregister(id: string) {
    this.shortcuts.delete(id)
  }

  init() {
    document.addEventListener('keydown', this.handleKeyDown)
  }

  cleanup() {
    document.removeEventListener('keydown', this.handleKeyDown)
  }

  private handleKeyDown(event: KeyboardEvent) {
    for (const [id, shortcut] of this.shortcuts) {
      if (this.matchesShortcut(event, shortcut)) {
        event.preventDefault()
        shortcut.handler()
        break
      }
    }
  }

  private matchesShortcut(event: KeyboardEvent, shortcut: Shortcut): boolean {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
    
    // Key match
    if (event.key.toLowerCase() !== shortcut.key.toLowerCase()) {
      return false
    }

    // Modifier checks
    const hasCmd = shortcut.modifiers.includes('cmd')
    const hasCtrl = shortcut.modifiers.includes('ctrl')
    const hasShift = shortcut.modifiers.includes('shift')
    const hasAlt = shortcut.modifiers.includes('alt')

    if (isMac && hasCmd && !event.metaKey) return false
    if (!isMac && hasCtrl && !event.ctrlKey) return false
    if (hasShift && !event.shiftKey) return false
    if (hasAlt && !event.altKey) return false

    // Ensure no extra modifiers
    const expectedModifiers = 
      (hasCmd || hasCtrl ? 1 : 0) +
      (hasShift ? 1 : 0) +
      (hasAlt ? 1 : 0)
    
    const actualModifiers =
      (event.metaKey || event.ctrlKey ? 1 : 0) +
      (event.shiftKey ? 1 : 0) +
      (event.altKey ? 1 : 0)

    return expectedModifiers === actualModifiers
  }

  getAllShortcuts(): Array<{ id: string; shortcut: Shortcut }> {
    return Array.from(this.shortcuts.entries()).map(([id, shortcut]) => ({
      id,
      shortcut
    }))
  }

  getShortcutDisplay(shortcut: Shortcut): string {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
    const symbols = isMac
      ? { cmd: '⌘', ctrl: '⌃', shift: '⇧', alt: '⌥' }
      : { cmd: 'Ctrl', ctrl: 'Ctrl', shift: 'Shift', alt: 'Alt' }

    const mods = shortcut.modifiers
      .map(m => symbols[m])
      .join(isMac ? '' : '+')
    
    const key = shortcut.key.toUpperCase()
    
    return isMac ? `${mods}${key}` : `${mods}+${key}`
  }
}

export const keyboardManager = new KeyboardManager()
