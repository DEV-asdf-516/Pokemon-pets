interface BubbleControllerOptions {
  bubble: HTMLElement
  anchor: HTMLElement
}

export class BubbleController {
  private hideTimer: ReturnType<typeof setTimeout> | null = null

  constructor(private readonly opts: BubbleControllerOptions) {}

  show(text: string, duration = 4000): void {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer)
    }
    this.opts.bubble.textContent = text
    this.opts.bubble.style.display = 'block'
    this.updatePosition()
    this.hideTimer = setTimeout(() => {
      this.opts.bubble.style.display = 'none'
      this.hideTimer = null
    }, duration)
  }

  hide(): void {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer)
      this.hideTimer = null
    }
    this.opts.bubble.style.display = 'none'
  }

  updatePosition(): void {
    if (this.opts.bubble.style.display !== 'block') {
      return
    }
    const rect = this.opts.anchor.getBoundingClientRect()
    const bubbleWidth = this.opts.bubble.offsetWidth || 200
    const left = rect.left + rect.width / 2 - bubbleWidth / 2
    this.opts.bubble.style.left = `${Math.max(6, Math.min(window.innerWidth - bubbleWidth - 6, left))}px`
    this.opts.bubble.style.top = `${Math.max(6, rect.top - this.opts.bubble.offsetHeight - 10)}px`
  }
}
