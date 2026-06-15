import type { PetDefinition, Settings } from '../types/index.js'
import { BubbleController } from './controllers/bubble-controller.js'
import { ChatController } from './controllers/chat-controller.js'
import { ChatWindowController } from './controllers/chat-window-controller.js'
import { NicknameController } from './controllers/nickname-controller.js'
import { getInitialPetPosition, PetMotionController } from './controllers/pet-motion-controller.js'

function getElement(id: string): HTMLElement {
  const element = document.getElementById(id)
  if (!element) {
    throw new Error(`Missing element: #${id}`)
  }
  return element
}

async function bootstrap(): Promise<void> {
  const petDefinition: PetDefinition = await window.petAPI.pet.loadActive()
  const petProfile = await window.petAPI.pet.loadProfile()
  const settings: Settings = await window.petAPI.settings.load()
  const launchParams = new URLSearchParams(window.location.search)
  const cryUrl = petDefinition.cryUrl
  const idlePhrases = petDefinition.idlePhrases
  const chatPetGap = 10

  const petName = getElement('pet-name')
  const petNameInput = getElement('pet-name-input') as HTMLInputElement
  const petImage = getElement('pet-image') as HTMLImageElement
  const petContainer = getElement('pet-container')
  const bubble = getElement('bubble')
  const chatWindow = getElement('chat-window')
  const messages = getElement('messages')
  const userInput = getElement('user-input') as HTMLTextAreaElement
  const messageMenu = getElement('message-menu')

  petImage.alt = petDefinition.name
  petImage.style.width = `${petDefinition.appearance.imageWidth}px`
  petImage.style.height = `${petDefinition.appearance.imageHeight}px`
  document.documentElement.style.setProperty('--pet-accent', petDefinition.theme.accentColor)
  document.documentElement.style.setProperty('--pet-accent-hover', petDefinition.theme.accentHoverColor)
  document.documentElement.style.setProperty('--pet-accent-glow', petDefinition.theme.accentGlowColor)
  document.documentElement.style.setProperty('--pet-assistant-bg', petDefinition.theme.assistantBackground)
  document.documentElement.style.setProperty('--pet-assistant-border', petDefinition.theme.assistantBorderColor)

  let chatOpen = false
  let mouseEventsIgnored = true
  let isPetActive = launchParams.get('active') !== 'false'
  let isDragging = false
  let petDragStarted = false
  let clickThreshold = true

  const bubbleController = new BubbleController({ bubble, anchor: petContainer })
  const petMotion = new PetMotionController({
    petDefinition,
    petImage,
    petContainer,
    initialPosition: getInitialPetPosition(petDefinition, launchParams),
    canWalk: () => isPetActive && !chatOpen && !isDragging,
    onPositionApplied: () => bubbleController.updatePosition(),
  })

  document.body.classList.toggle('pet-inactive', !isPetActive)
  new NicknameController({
    petDefinition,
    petProfile,
    nameElement: petName,
    inputElement: petNameInput,
  })

  console.info('Pet renderer ready', {
    pet: petDefinition.id,
    position: petMotion.position,
    spriteFrames: Object.keys(petDefinition.sprites),
  })

  function playCry(): void {
    if (!cryUrl) {
      return
    }
    new Audio(cryUrl).play().catch(() => {})
  }

  function scheduleIdleTalk(): void {
    const minDelay = petDefinition.movement.idleTalkMinMs
    const maxDelay = petDefinition.movement.idleTalkMaxMs
    const delay = minDelay + Math.random() * (maxDelay - minDelay)
    setTimeout(() => {
      if (!chatOpen && isPetActive && idlePhrases.length > 0) {
        bubbleController.show(idlePhrases[Math.floor(Math.random() * idlePhrases.length)], 5000)
        playCry()
      }
      scheduleIdleTalk()
    }, delay)
  }
  scheduleIdleTalk()

  function setMouseIgnore(ignore: boolean): void {
    if (!isPetActive && !ignore) {
      return
    }
    if (mouseEventsIgnored === ignore) {
      return
    }
    mouseEventsIgnored = ignore
    window.petAPI.window.setIgnoreMouse(ignore)
  }

  const chatController = new ChatController({
    chatWindow,
    messages,
    userInput,
    messageMenu,
    copyButton: getElement('copy-message'),
    deleteButton: getElement('delete-message'),
    resendButton: getElement('resend-message'),
    sendButton: getElement('send-btn'),
    petDefinition,
    settings,
    isOpen: () => chatOpen,
    playCry,
  })

  function isPointInRect(x: number, y: number, rect: DOMRect): boolean {
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
  }

  function isPointOnInteractiveArea(x: number, y: number): boolean {
    if (isPointInRect(x, y, petContainer.getBoundingClientRect())) {
      return true
    }
    return chatOpen && chatWindow.style.display !== 'none' && isPointInRect(x, y, chatWindow.getBoundingClientRect())
  }

  function syncMouseIgnore(x: number, y: number): void {
    if (isDragging || chatWindowController.isInteracting() || chatController.isMenuOpen()) {
      setMouseIgnore(false)
      return
    }
    setMouseIgnore(!isPointOnInteractiveArea(x, y))
  }

  function updateChatPos(): void {
    if (!chatOpen) {
      return
    }
    const petRect = petContainer.getBoundingClientRect()
    const chatRect = chatWindow.getBoundingClientRect()
    const margin = 10
    const centeredLeft = petRect.left + petRect.width / 2 - chatRect.width / 2
    const centeredTop = petRect.top + petRect.height / 2 - chatRect.height / 2
    const candidates = [
      { left: centeredLeft, top: petRect.top - chatRect.height - chatPetGap },
      { left: centeredLeft, top: petRect.bottom + chatPetGap },
      { left: petRect.left - chatRect.width - chatPetGap, top: centeredTop },
      { left: petRect.right + chatPetGap, top: centeredTop },
    ]
    const fits = ({ left, top }: { left: number; top: number }): boolean =>
      left >= margin &&
      top >= margin &&
      left + chatRect.width <= window.innerWidth - margin &&
      top + chatRect.height <= window.innerHeight - margin
    const position = candidates.find(fits) ?? candidates[0]
    const left = Math.max(margin, Math.min(window.innerWidth - chatRect.width - margin, position.left))
    const top = Math.max(margin, Math.min(window.innerHeight - chatRect.height - margin, position.top))

    chatWindow.style.left = `${left}px`
    chatWindow.style.top = `${top}px`
    chatWindow.style.right = 'auto'
    chatWindow.style.bottom = 'auto'
  }

  window.petAPI.pet.onRecall((position) => {
    isPetActive = true
    document.body.classList.remove('pet-inactive')
    const fallback = petMotion.position
    petMotion.setPosition(
      position && Number.isFinite(position.x) ? position.x - petMotion.width / 2 : fallback.x,
      position && Number.isFinite(position.y) ? position.y - petMotion.height : fallback.y,
    )
    bubbleController.show(petDefinition.recallText, 1500)
  })

  window.petAPI.pet.onSetActive((state) => {
    setMouseIgnore(true)
    if (!state) {
      return
    }
    isPetActive = Boolean(state.active)
    document.body.classList.toggle('pet-inactive', !isPetActive)

    if (!isPetActive) {
      isDragging = false
      chatOpen = false
      chatWindow.style.display = 'none'
      bubbleController.hide()
      petMotion.stopWalk()
      return
    }

    const currentPosition = petMotion.position
    const stateX = typeof state.x === 'number' && Number.isFinite(state.x) ? state.x : currentPosition.x
    const stateY = typeof state.y === 'number' && Number.isFinite(state.y) ? state.y : currentPosition.y
    petMotion.setPosition(stateX, stateY)
    isDragging = Boolean(state.dragging)
    clickThreshold = !isDragging
    updateChatPos()
    if (!isDragging) {
      petMotion.startWalk()
    }
    if (state.recall) {
      bubbleController.show(petDefinition.recallText, 1500)
    }
    if (typeof state.chatOpen === 'boolean') {
      chatOpen = state.chatOpen
      chatWindow.style.display = chatOpen ? 'flex' : 'none'
      if (chatOpen) {
        if (state.chatWidth) {
          chatWindow.style.width = `${state.chatWidth}px`
        }
        if (state.chatHeight) {
          chatWindow.style.height = `${state.chatHeight}px`
        }
        updateChatPos()
        void chatController.syncVisibleHistory()
      }
    }
  })

  window.petAPI.pet.onDragPosition((position) => {
    if (!isPetActive || !isDragging || !position) {
      return
    }
    if (Math.abs(position.x - petMotion.position.x) > 5) {
      clickThreshold = false
    }
    petMotion.setPosition(position.x, position.y)
    updateChatPos()
  })

  window.petAPI.pet.onDragStop(() => {
    setMouseIgnore(true)
    if (!isPetActive) {
      return
    }
    isDragging = false
    petMotion.startWalk()
  })

  window.addEventListener('resize', () => {
    petMotion.clampToViewport()
    bubbleController.updatePosition()
    updateChatPos()
  })

  const chatWindowController = new ChatWindowController({
    chatWindow,
    chatHeader: getElement('chat-header'),
    petContainer,
    resizeHandles: Array.from(document.querySelectorAll<HTMLElement>('.resize-handle')),
    petMotion,
    chatPetGap,
    onStartDrag: ({ x, y, chatWidth, chatHeight }) => {
      petDragStarted = true
      window.petAPI.pet.startDrag({
        x,
        y,
        chatOpen: true,
        chatWidth,
        chatHeight,
      })
    },
    onStopPetDrag: (wasChatDragging) => {
      petDragStarted = false
      window.petAPI.pet.stopDrag()
      if (!wasChatDragging) {
        isDragging = false
        if (isPetActive) {
          petMotion.startWalk()
        }
      }
    },
    onPointerMoveIdle: syncMouseIgnore,
    onPointerUp: syncMouseIgnore,
    setMouseIgnore,
    isPetDragging: () => isDragging,
    hasPetDragStarted: () => petDragStarted,
  })

  petContainer.addEventListener('mouseenter', () => setMouseIgnore(false))
  petContainer.addEventListener('mouseleave', (event) => syncMouseIgnore(event.clientX, event.clientY))
  chatWindow.addEventListener('mouseenter', () => setMouseIgnore(false))
  chatWindow.addEventListener('mouseleave', (event) => syncMouseIgnore(event.clientX, event.clientY))
  document.addEventListener('mouseleave', () => {
    if (!isDragging && !chatWindowController.isInteracting()) {
      setMouseIgnore(true)
    }
  })

  petContainer.addEventListener('mousedown', (event) => {
    isDragging = true
    petDragStarted = true
    clickThreshold = true
    const petRect = petContainer.getBoundingClientRect()
    petMotion.setDirectionDown()
    petMotion.stopWalk()
    setMouseIgnore(false)
    const chatRect = chatOpen ? chatWindow.getBoundingClientRect() : null
    window.petAPI.pet.startDrag({
      x: event.clientX - petRect.left,
      y: event.clientY - petRect.top,
      chatOpen,
      chatWidth: chatRect ? chatRect.width : undefined,
      chatHeight: chatRect ? chatRect.height : undefined,
    })
    event.preventDefault()
  })

  petImage.addEventListener('click', async (event) => {
    if (!clickThreshold) {
      return
    }
    playCry()
    petMotion.triggerJump()
    chatOpen = !chatOpen
    chatWindow.style.display = chatOpen ? 'flex' : 'none'
    if (!chatOpen) {
      window.petAPI.pet.notifyChatState(false)
      petMotion.startWalk()
      setMouseIgnore(true)
      return
    }
    petMotion.setDirectionDown()
    petMotion.stopWalk()
    setMouseIgnore(false)
    updateChatPos()
    syncMouseIgnore(event.clientX, event.clientY)
    const openRect = chatWindow.getBoundingClientRect()
    window.petAPI.pet.notifyChatState(true, openRect.width, openRect.height)
    await chatController.onChatOpened()
  })

  getElement('close-chat').addEventListener('click', () => {
    chatController.hideMenu()
    chatOpen = false
    chatWindow.style.display = 'none'
    window.petAPI.pet.notifyChatState(false)
    petMotion.startWalk()
    setMouseIgnore(true)
  })
}

bootstrap().catch((error: unknown) => {
  console.error('Failed to start pet renderer', error)
  const petImage = getElement('pet-image') as HTMLImageElement
  petImage.alt = '펫 로딩 실패'
  petImage.style.display = 'none'
  const container = getElement('pet-container')
  container.textContent = '펫 로딩 실패'
  container.style.padding = '8px'
  container.style.color = '#d33'
  container.style.background = 'white'
  container.style.border = '2px solid #d33'
  container.style.borderRadius = '10px'
  container.style.left = '20px'
  container.style.top = '20px'
})
