import { ChatController } from './controllers/chat-controller.js'
import type { PetDefinition, Settings } from '../types/index.js'

async function bootstrap(): Promise<void> {
  const petDefinition: PetDefinition = await window.petAPI.pet.loadActive()
  const petProfile = await window.petAPI.pet.loadProfile()
  const settings: Settings = await window.petAPI.settings.load()
  const petSprites = petDefinition.sprites
  const CRY_URL = petDefinition.cryUrl
  const IDLE_PHRASES = petDefinition.idlePhrases

const petName = document.getElementById('pet-name')!
const petNameInput = document.getElementById('pet-name-input') as HTMLInputElement
let currentNickname = petProfile.nickname ?? petDefinition.name
petName.textContent = `🐾 ${currentNickname}`
const petImage = document.getElementById('pet-image') as HTMLImageElement
petImage.alt = petDefinition.name
petImage.style.width = `${petDefinition.appearance.imageWidth}px`
petImage.style.height = `${petDefinition.appearance.imageHeight}px`
petNameInput.setAttribute('aria-label', `${petDefinition.name} 닉네임`)
document.documentElement.style.setProperty('--pet-accent', petDefinition.theme.accentColor)
document.documentElement.style.setProperty('--pet-accent-hover', petDefinition.theme.accentHoverColor)
document.documentElement.style.setProperty('--pet-accent-glow', petDefinition.theme.accentGlowColor)
document.documentElement.style.setProperty('--pet-assistant-bg', petDefinition.theme.assistantBackground)
document.documentElement.style.setProperty('--pet-assistant-border', petDefinition.theme.assistantBorderColor)

function startNicknameEdit(event: Event): void {
  event.stopPropagation()
  petName.style.display = 'none'
  petNameInput.style.display = 'block'
  petNameInput.value = currentNickname
  petNameInput.focus()
  petNameInput.select()
}

async function finishNicknameEdit(save: boolean): Promise<void> {
  const nextNickname = save ? petNameInput.value.trim() : currentNickname
  currentNickname = nextNickname || petDefinition.name
  petName.textContent = `🐾 ${currentNickname}`
  petName.style.display = 'block'
  petNameInput.style.display = 'none'
  if (save) {
    await window.petAPI.pet.saveNickname(nextNickname)
  }
}

petName.addEventListener('mousedown', (event) => event.stopPropagation())
petName.addEventListener('click', startNicknameEdit)
petNameInput.addEventListener('mousedown', (event) => event.stopPropagation())
petNameInput.addEventListener('blur', () => {
  void finishNicknameEdit(true)
})
petNameInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault()
    petNameInput.blur()
  } else if (event.key === 'Escape') {
    event.preventDefault()
    petNameInput.value = currentNickname
    petNameInput.blur()
  }
})

// ── 스프라이트 ────────────────────────────────────
function getSpriteKey(dir: string): string {
  if (dir === 'up') {
    return 'back_up'
  }
  if (dir === 'up_left' || dir === 'up_right') {
    return 'back_side'
  }
  if (dir === 'down') {
    return 'down'
  }
  if (dir === 'down_left' || dir === 'down_right') {
    return 'side'
  }
  if (dir === 'left' || dir === 'right') {
    return 'side'
  }
  return 'down'
}

function updateSpriteTransform(action: string, dir: string, idx: number): void {
  const isLeft = dir === 'left' || dir === 'up_left' || dir === 'down_left'
  const flip = isLeft ? 'scaleX(-1)' : 'scaleX(1)'
  const walkBob = action === 'walk' && idx % 2 === 1 ? -2 : 0
  const jumpBob = jumpTick > 0 ? -Math.sin((JUMP_DURATION - jumpTick) / JUMP_DURATION * Math.PI) * JUMP_HEIGHT : 0
  petImage.style.transform = `${flip} translateY(${Math.round(walkBob + jumpBob)}px)`
}

function setFrame(action: string, dir: string, idx: number): void {
  const key = getSpriteKey(dir)
  const frames = petSprites[key] ?? petSprites.down
  if (!frames || !frames.length) {
    return
  }
  petImage.src = frames[idx % frames.length]
  updateSpriteTransform(action, dir, idx)
}

// ── 상태 ─────────────────────────────────────────
const launchParams = new URLSearchParams(window.location.search)
let chatOpen = false
let mouseEventsIgnored = true
let isPetActive = launchParams.get('active') !== 'false'
const PET_WIDTH = petDefinition.appearance.width
const PET_HEIGHT = petDefinition.appearance.height
const SPAWN_MARGIN = 10
const CHAT_PET_GAP = 10

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function getRandomSpawnPosition(): { x: number; y: number } {
  return {
    x: randomBetween(SPAWN_MARGIN, Math.max(SPAWN_MARGIN, window.innerWidth - PET_WIDTH - SPAWN_MARGIN)),
    y: randomBetween(SPAWN_MARGIN, Math.max(SPAWN_MARGIN, window.innerHeight - PET_HEIGHT - SPAWN_MARGIN)),
  }
}

function getRandomMoveVector(): { x: number; y: number } {
  const angle = Math.random() * Math.PI * 2
  return {
    x: Math.cos(angle) * walkSpeed,
    y: Math.sin(angle) * walkSpeed * 0.75,
  }
}

function resetRandomMoveVector(): void {
  const next = getRandomMoveVector()
  moveX = next.x
  moveY = next.y
  curDir = getDirFromVector(moveX, moveY)
  frameIdx = 0
}

function getDirFromVector(dx: number, dy: number): string {
  const absX = Math.abs(dx)
  const absY = Math.abs(dy)
  if (absY > absX * 1.2) {
    return dy < 0 ? 'up' : 'down'
  }
  if (absX > absY * 1.2) {
    return dx < 0 ? 'left' : 'right'
  }
  if (dy < 0 && dx < 0) {
    return 'up_left'
  }
  if (dy < 0 && dx >= 0) {
    return 'up_right'
  }
  if (dy >= 0 && dx < 0) {
    return 'down_left'
  }
  return 'down_right'
}

function triggerJump(): void {
  if (jumpTick <= 0) {
    jumpTick = JUMP_DURATION
  }
}

const requestedSpawnX = Number(launchParams.get('spawnX'))
const requestedSpawnY = Number(launchParams.get('spawnY'))
const spawnPos = Number.isFinite(requestedSpawnX) && Number.isFinite(requestedSpawnY)
  ? {
      x: Math.max(SPAWN_MARGIN, Math.min(window.innerWidth - PET_WIDTH - SPAWN_MARGIN, requestedSpawnX - PET_WIDTH / 2)),
      y: Math.max(SPAWN_MARGIN, Math.min(window.innerHeight - PET_HEIGHT - SPAWN_MARGIN, requestedSpawnY)),
    }
  : getRandomSpawnPosition()
let petX = spawnPos.x
let petY = spawnPos.y
let isDragging = false
let petDragStarted = false
let dragOffsetX = 0
let dragOffsetY = 0
let clickThreshold = true

let walkSpeed = petDefinition.movement.speed
let moveX = 0
let moveY = 0
let curDir = 'down'
let curAction = 'walk'
let turnCooldown = 0
let frameIdx = 0
let frameTick = 0
let jumpTick = 0
let jumpCooldown = 0
const WALK_FRAME_INTERVAL = petDefinition.movement.walkFrameInterval
const IDLE_FRAME_INTERVAL = petDefinition.movement.idleFrameInterval
const JUMP_DURATION = petDefinition.movement.jumpDuration
const JUMP_HEIGHT = petDefinition.movement.jumpHeight
resetRandomMoveVector()
jumpCooldown = randomBetween(80, 220)

const petContainer = document.getElementById('pet-container')!
const bubble = document.getElementById('bubble')!
document.body.classList.toggle('pet-inactive', !isPetActive)

window.petAPI.pet.onRecall((position) => {
  isPetActive = true
  document.body.classList.remove('pet-inactive')
  petX = position && Number.isFinite(position.x)
    ? Math.max(0, Math.min(window.innerWidth - PET_WIDTH, position.x - PET_WIDTH / 2))
    : spawnPos.x
  petY = position && Number.isFinite(position.y)
    ? Math.max(0, Math.min(window.innerHeight - PET_HEIGHT, position.y - PET_HEIGHT))
    : spawnPos.y
  applyPetPosition()
  showBubble(petDefinition.recallText, 1500)
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
    bubble.style.display = 'none'
    stopWalk()
    return
  }

  if (Number.isFinite(state.x)) {
    petX = state.x!
  }
  if (Number.isFinite(state.y)) {
    petY = state.y!
  }
  petX = Math.max(0, Math.min(window.innerWidth - PET_WIDTH, petX))
  petY = Math.max(0, Math.min(window.innerHeight - PET_HEIGHT, petY))
  isDragging = Boolean(state.dragging)
  clickThreshold = !isDragging
  applyPetPosition()
  updateChatPos()
  if (!isDragging) {
    startWalk()
  }
  if (state.recall) {
    showBubble(petDefinition.recallText, 1500)
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
  if (Math.abs(position.x - petX) > 5) {
    clickThreshold = false
  }
  petX = Math.max(0, Math.min(window.innerWidth - PET_WIDTH, position.x))
  petY = Math.max(0, Math.min(window.innerHeight - PET_HEIGHT, position.y))
  applyPetPosition()
  updateChatPos()
})

window.petAPI.pet.onDragStop(() => {
  setMouseIgnore(true)
  if (!isPetActive) {
    return
  }
  isDragging = false
  startWalk()
})

function canOccupyPosition(x: number, y: number): boolean {
  const centerX = x + PET_WIDTH / 2
  const centerY = y + PET_HEIGHT / 2
  return centerX >= 0 && centerX <= window.innerWidth
    && centerY >= 0 && centerY <= window.innerHeight
}

function updateBubblePosition(): void {
  if (bubble.style.display !== 'block') {
    return
  }
  const rect = petContainer.getBoundingClientRect()
  const bubbleWidth = bubble.offsetWidth || 200
  const left = rect.left + rect.width / 2 - bubbleWidth / 2
  bubble.style.left = `${Math.max(6, Math.min(window.innerWidth - bubbleWidth - 6, left))}px`
  bubble.style.top = `${Math.max(6, rect.top - bubble.offsetHeight - 10)}px`
}

function applyPetPosition(): void {
  petContainer.style.left = petX + 'px'
  petContainer.style.top = petY + 'px'
  petContainer.style.bottom = 'auto'
  updateBubblePosition()
}

applyPetPosition()
setFrame('walk', curDir, 0)
console.info('Pet renderer ready', {
  pet: petDefinition.id,
  position: { x: petX, y: petY },
  spriteFrames: Object.keys(petSprites),
})

window.addEventListener('resize', () => {
  petX = Math.max(0, Math.min(window.innerWidth - PET_WIDTH, petX))
  petY = Math.max(0, Math.min(window.innerHeight - PET_HEIGHT, petY))
  applyPetPosition()
})

setInterval(() => {
  const canWalk = isPetActive && !chatOpen && !isDragging
  curAction = canWalk ? 'walk' : 'idle'

  if (canWalk) {
    const nextX = petX + moveX
    const nextY = petY + moveY
    if (canOccupyPosition(nextX, nextY)) {
      petX = nextX
      petY = nextY
    } else if (canOccupyPosition(nextX, petY)) {
      petX = nextX
      moveY *= -1
      frameIdx = 0
    } else if (canOccupyPosition(petX, nextY)) {
      petY = nextY
      moveX *= -1
      frameIdx = 0
    } else {
      moveX *= -1
      moveY *= -1
      frameIdx = 0
    }

    curDir = getDirFromVector(moveX, moveY)

    turnCooldown--
    if (turnCooldown <= 0 && Math.random() < 0.006) {
      resetRandomMoveVector()
      turnCooldown = randomBetween(90, 220)
    }

    jumpCooldown--
    if (jumpCooldown <= 0) {
      triggerJump()
      jumpCooldown = randomBetween(120, 320)
    }

    applyPetPosition()
  }

  if (jumpTick > 0) {
    jumpTick--
  }

  frameTick++
  const frameInterval = curAction === 'walk' ? WALK_FRAME_INTERVAL : IDLE_FRAME_INTERVAL
  if (frameTick >= frameInterval) {
    frameTick = 0
    frameIdx++
    setFrame(curAction, curDir, frameIdx)
  } else {
    updateSpriteTransform(curAction, curDir, frameIdx)
  }
}, 30)

function startWalk(): void {
  curAction = 'walk'
  walkSpeed = petDefinition.movement.speed
  frameIdx = 0
  frameTick = 0
  resetRandomMoveVector()
}

function stopWalk(): void {
  curAction = 'idle'
  frameIdx = 0
  frameTick = 0
}

// ── 울음소리 ──────────────────────────────────────
function playCry(): void {
  if (!CRY_URL) {
    return
  }
  new Audio(CRY_URL).play().catch(() => {})
}

// ── 말풍선 ────────────────────────────────────────
function showBubble(text: string, duration = 4000): void {
  bubble.textContent = text
  bubble.style.display = 'block'
  updateBubblePosition()
  setTimeout(() => {
    bubble.style.display = 'none'
  }, duration)
}

function scheduleIdleTalk(): void {
  const minDelay = petDefinition.movement.idleTalkMinMs
  const maxDelay = petDefinition.movement.idleTalkMaxMs
  const delay = minDelay + Math.random() * (maxDelay - minDelay)
  setTimeout(() => {
    if (!chatOpen && isPetActive) {
      showBubble(IDLE_PHRASES[Math.floor(Math.random() * IDLE_PHRASES.length)], 5000)
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

// ── 채팅 ─────────────────────────────────────────
const chatWindow = document.getElementById('chat-window')!
const messages = document.getElementById('messages')!
const userInput = document.getElementById('user-input') as HTMLInputElement
const messageMenu = document.getElementById('message-menu')!
const chatController = new ChatController({
  chatWindow,
  messages,
  userInput,
  messageMenu,
  copyButton: document.getElementById('copy-message')!,
  deleteButton: document.getElementById('delete-message')!,
  resendButton: document.getElementById('resend-message')!,
  sendButton: document.getElementById('send-btn')!,
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
  return chatOpen
    && chatWindow.style.display !== 'none'
    && isPointInRect(x, y, chatWindow.getBoundingClientRect())
}

function syncMouseIgnore(x: number, y: number): void {
  if (isDragging || chatDragging || rzActive || chatController.isMenuOpen()) {
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
  const gap = CHAT_PET_GAP
  const centeredLeft = petRect.left + petRect.width / 2 - chatRect.width / 2
  const centeredTop = petRect.top + petRect.height / 2 - chatRect.height / 2
  const candidates = [
    { left: centeredLeft, top: petRect.top - chatRect.height - gap },
    { left: centeredLeft, top: petRect.bottom + gap },
    { left: petRect.left - chatRect.width - gap, top: centeredTop },
    { left: petRect.right + gap, top: centeredTop },
  ]
  const fits = ({ left, top }: { left: number; top: number }): boolean => (
    left >= margin
    && top >= margin
    && left + chatRect.width <= window.innerWidth - margin
    && top + chatRect.height <= window.innerHeight - margin
  )
  const position = candidates.find(fits) ?? candidates[0]
  const left = Math.max(margin, Math.min(window.innerWidth - chatRect.width - margin, position.left))
  const top = Math.max(margin, Math.min(window.innerHeight - chatRect.height - margin, position.top))

  chatWindow.style.left = `${left}px`
  chatWindow.style.top = `${top}px`
  chatWindow.style.right = 'auto'
  chatWindow.style.bottom = 'auto'
}

// ── 채팅창 드래그 이동 ────────────────────────────
let chatDragging = false
let chatDragStartX = 0
let chatDragStartY = 0
let chatStartLeft = 0
let chatStartTop = 0
let petStartLeft = 0
let petStartTop = 0
let groupMinDX = 0
let groupMaxDX = 0
let groupMinDY = 0
let groupMaxDY = 0

document.getElementById('chat-header')!.addEventListener('mousedown', (e) => {
  if ((e.target as HTMLElement).id === 'close-chat') {
    return
  }
  const chatRect = chatWindow.getBoundingClientRect()
  const petRect = petContainer.getBoundingClientRect()
  chatDragging = true
  petDragStarted = true
  chatDragStartX = e.clientX
  chatDragStartY = e.clientY
  chatStartLeft = chatRect.left
  chatStartTop = chatRect.top
  petStartLeft = petRect.left
  petStartTop = petRect.top

  const groupLeft = Math.min(chatRect.left, petRect.left)
  const groupRight = Math.max(chatRect.right, petRect.right)
  const groupTop = Math.min(chatRect.top, petRect.top)
  const groupBottom = Math.max(chatRect.bottom, petRect.bottom)
  groupMinDX = -groupLeft
  groupMaxDX = window.innerWidth - groupRight
  groupMinDY = -groupTop
  groupMaxDY = window.innerHeight - groupBottom

  window.petAPI.pet.startDrag({
    x: e.clientX - petRect.left,
    y: e.clientY - petRect.top,
    chatOpen: true,
    chatWidth: chatRect.width,
    chatHeight: chatRect.height,
  })
  setMouseIgnore(false)
  e.preventDefault()
})

// ── 채팅창 리사이즈 ──────────────────────────────
let rzActive = false
let rzDir = ''
let rzStartX = 0
let rzStartY = 0
let rzStartW = 0
let rzStartH = 0
let rzStartL = 0
let rzStartT = 0

document.querySelectorAll<HTMLElement>('.resize-handle').forEach((el) => {
  el.addEventListener('mousedown', (e) => {
    rzActive = true
    rzDir = el.id.replace('rz-', '')
    const rect = chatWindow.getBoundingClientRect()
    rzStartX = e.clientX
    rzStartY = e.clientY
    rzStartW = rect.width
    rzStartH = rect.height
    rzStartL = rect.left
    rzStartT = rect.top
    setMouseIgnore(false)
    e.preventDefault()
    e.stopPropagation()
  })
})

document.addEventListener('mousemove', (e) => {
  if (!isDragging && !chatDragging && !rzActive) {
    syncMouseIgnore(e.clientX, e.clientY)
  }

  // 채팅창과 펫을 한 묶음으로 이동한다.
  if (chatDragging) {
    const dx = Math.max(groupMinDX, Math.min(groupMaxDX, e.clientX - chatDragStartX))
    const dy = Math.max(groupMinDY, Math.min(groupMaxDY, e.clientY - chatDragStartY))
    chatWindow.style.left = chatStartLeft + dx + 'px'
    chatWindow.style.top = chatStartTop + dy + 'px'
    chatWindow.style.right = 'auto'
    chatWindow.style.bottom = 'auto'
    petX = petStartLeft + dx
    petY = petStartTop + dy
    applyPetPosition()
    return
  }

  // 채팅창 리사이즈
  if (rzActive) {
    const dx = e.clientX - rzStartX
    const dy = e.clientY - rzStartY
    let newW = rzStartW
    let newH = rzStartH
    let newL = rzStartL
    let newT = rzStartT

    if (rzDir.includes('e')) {
      newW = Math.max(200, rzStartW + dx)
    }
    if (rzDir.includes('s')) {
      newH = Math.max(180, rzStartH + dy)
      const maxHWithPetBelow = Math.max(180, window.innerHeight - newT - PET_HEIGHT - SPAWN_MARGIN - CHAT_PET_GAP)
      newH = Math.min(newH, maxHWithPetBelow)
    }
    if (rzDir.includes('w')) {
      newW = Math.max(200, rzStartW - dx)
      newL = rzStartL + rzStartW - newW
    }
    if (rzDir.includes('n')) {
      newH = Math.max(180, rzStartH - dy)
      newT = rzStartT + rzStartH - newH
    }

    chatWindow.style.width = newW + 'px'
    chatWindow.style.height = newH + 'px'
    chatWindow.style.left = newL + 'px'
    chatWindow.style.top = newT + 'px'
    chatWindow.style.right = 'auto'
    chatWindow.style.bottom = 'auto'

    if (rzDir.includes('s')) {
      const desiredPetY = newT + newH + CHAT_PET_GAP
      const maxPetY = window.innerHeight - PET_HEIGHT - SPAWN_MARGIN
      petY = Math.min(maxPetY, Math.max(SPAWN_MARGIN, desiredPetY))
      applyPetPosition()
    }
    return
  }
})

document.addEventListener('mouseup', (e) => {
  const wasChatDragging = chatDragging
  chatDragging = false

  if (rzActive) {
    rzActive = false
  } else if (petDragStarted) {
    petDragStarted = false
    window.petAPI.pet.stopDrag()
    if (!wasChatDragging) {
      isDragging = false
      if (isPetActive) {
        startWalk()
      }
    }
  }
  syncMouseIgnore(e.clientX, e.clientY)
})

// ── 마우스 이벤트 토글 ────────────────────────────
petContainer.addEventListener('mouseenter', () => setMouseIgnore(false))
petContainer.addEventListener('mouseleave', (e) => syncMouseIgnore(e.clientX, e.clientY))
chatWindow.addEventListener('mouseenter', () => setMouseIgnore(false))
chatWindow.addEventListener('mouseleave', (e) => syncMouseIgnore(e.clientX, e.clientY))
document.addEventListener('mouseleave', () => {
  if (!isDragging && !chatDragging && !rzActive) {
    setMouseIgnore(true)
  }
})

// ── 펫 드래그 ─────────────────────────────────────
petContainer.addEventListener('mousedown', (e) => {
  isDragging = true
  petDragStarted = true
  clickThreshold = true
  dragOffsetX = e.clientX - petContainer.getBoundingClientRect().left
  dragOffsetY = e.clientY - petContainer.getBoundingClientRect().top
  curDir = 'down'
  stopWalk()
  setMouseIgnore(false)
  const chatRect = chatOpen ? chatWindow.getBoundingClientRect() : null
  window.petAPI.pet.startDrag({
    x: dragOffsetX,
    y: dragOffsetY,
    chatOpen,
    chatWidth: chatRect ? chatRect.width : undefined,
    chatHeight: chatRect ? chatRect.height : undefined,
  })
  e.preventDefault()
})

// ── 클릭 ─────────────────────────────────────────
petImage.addEventListener('click', async (event) => {
  if (!clickThreshold) {
    return
  }
  playCry()
  triggerJump()
  chatOpen = !chatOpen
  chatWindow.style.display = chatOpen ? 'flex' : 'none'
  if (!chatOpen) {
    window.petAPI.pet.notifyChatState(false)
    startWalk()
    setMouseIgnore(true)
    return
  }
  curDir = 'down'
  stopWalk()
  setMouseIgnore(false)
  updateChatPos()
  syncMouseIgnore(event.clientX, event.clientY)
  const openRect = chatWindow.getBoundingClientRect()
  window.petAPI.pet.notifyChatState(true, openRect.width, openRect.height)
  await chatController.onChatOpened()
})

document.getElementById('close-chat')!.addEventListener('click', () => {
  chatController.hideMenu()
  chatOpen = false
  chatWindow.style.display = 'none'
  window.petAPI.pet.notifyChatState(false)
  startWalk()
  setMouseIgnore(true)
})
}

bootstrap().catch((error: unknown) => {
  console.error('Failed to start pet renderer', error)
  const petImage = document.getElementById('pet-image') as HTMLImageElement
  petImage.alt = '펫 로딩 실패'
  petImage.style.display = 'none'
  const container = document.getElementById('pet-container')!
  container.textContent = '펫 로딩 실패'
  container.style.padding = '8px'
  container.style.color = '#d33'
  container.style.background = 'white'
  container.style.border = '2px solid #d33'
  container.style.borderRadius = '10px'
  container.style.left = '20px'
  container.style.top = '20px'
})
