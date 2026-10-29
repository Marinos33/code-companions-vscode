// The pet's page: draws a Codex pet spritesheet frame by frame on a canvas, wanders while Claude
// is idle, and plays the reaction the extension sends for each Claude Code event, with a speech
// bubble. Outside VS Code (no acquireVsCodeApi), `window.petTest.receive(message)` drives it.
;(() => {
  const ROWS = ['idle', 'runRight', 'runLeft', 'waving', 'jumping', 'failed', 'waiting', 'running', 'review']
  // Frames per row in the Codex pet atlas (8 columns x 9 rows).
  const FRAME_COUNTS = [6, 8, 8, 4, 5, 8, 6, 6, 6]
  const FRAME_MS = 125
  const WALK_PX_PER_S = 55
  // A sticky reaction gives way to wandering if no event comes for this long (a missed Stop).
  const STICKY_MAX_MS = 120000

  const vscode = typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : null
  const stage = document.getElementById('stage')
  const canvas = document.getElementById('pet')
  const bubble = document.getElementById('bubble')
  const ctx = canvas.getContext('2d')

  let sheet = null
  let size = 120
  let isBubbleOn = true
  let isWanderOn = true
  const pet = { x: 0, targetX: 0, anim: 'idle', frame: 0, mode: 'idle', until: 0, line: '', isSticky: false }

  const frameW = () => sheet.naturalWidth / 8
  const frameH = () => sheet.naturalHeight / 9
  const petW = () => Math.round((size * frameW()) / frameH())

  function layout() {
    const dpr = window.devicePixelRatio || 1
    const w = stage.clientWidth
    canvas.style.width = `${w}px`
    canvas.style.height = `${size}px`
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(size * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.imageSmoothingEnabled = false
    if (sheet) pet.x = Math.min(Math.max(0, pet.x), Math.max(0, w - petW()))
  }

  function setAnim(anim) {
    if (pet.anim !== anim) {
      pet.anim = anim
      pet.frame = 0
    }
  }

  function say(line) {
    pet.line = line || ''
    bubble.hidden = !isBubbleOn || !pet.line
    bubble.textContent = pet.line
  }

  // Idle life: walk somewhere, stand a while, now and then wave.
  function nextIdleMove(now) {
    const maxX = Math.max(0, stage.clientWidth - petW())
    const roll = Math.random()
    if (isWanderOn && maxX > 20 && roll < 0.55) {
      pet.mode = 'walk'
      pet.targetX = Math.round(Math.random() * maxX)
      setAnim(pet.targetX >= pet.x ? 'runRight' : 'runLeft')
      pet.until = Infinity
    } else {
      pet.mode = 'idle'
      setAnim(roll > 0.9 ? 'waving' : 'idle')
      pet.until = now + 2000 + Math.random() * 3000
    }
    say('')
  }

  function react(reaction) {
    const now = performance.now()
    if (reaction.behavior === 'idle') {
      // A session ending stops ongoing work, but lets a short reaction (the end-of-turn jump that
      // `claude -p` follows at once with SessionEnd) play out.
      if (pet.mode === 'react' && !pet.isSticky) return
      pet.mode = 'idle'
      pet.until = 0
      setAnim('idle')
      say('')
      return
    }
    pet.mode = 'react'
    pet.isSticky = !!reaction.sticky
    setAnim(reaction.anim)
    say(reaction.line)
    pet.until = now + (reaction.sticky ? STICKY_MAX_MS : reaction.ms || 2000)
  }

  let last = performance.now()
  let frameClock = 0
  function tick(now) {
    const dt = now - last
    last = now
    if (sheet) {
      frameClock += dt
      while (frameClock >= FRAME_MS) {
        frameClock -= FRAME_MS
        pet.frame = (pet.frame + 1) % FRAME_COUNTS[ROWS.indexOf(pet.anim)]
      }
      if (pet.mode === 'walk') {
        const step = (WALK_PX_PER_S * dt) / 1000
        const delta = pet.targetX - pet.x
        if (Math.abs(delta) <= step) {
          pet.x = pet.targetX
          pet.mode = 'idle'
          setAnim('idle')
          pet.until = now + 1500 + Math.random() * 3000
        } else {
          pet.x += Math.sign(delta) * step
        }
      } else if (now >= pet.until) {
        nextIdleMove(now)
      }
      draw()
    }
    requestAnimationFrame(tick)
  }

  function draw() {
    const w = petW()
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const row = ROWS.indexOf(pet.anim)
    ctx.drawImage(sheet, pet.frame * frameW(), row * frameH(), frameW(), frameH(), Math.round(pet.x), 0, w, size)
    if (!bubble.hidden) {
      const bw = bubble.offsetWidth
      const centre = pet.x + w / 2
      bubble.style.left = `${Math.round(Math.min(Math.max(4, centre - bw / 2), stage.clientWidth - bw - 4))}px`
    }
  }

  function setup(message) {
    size = message.size || 120
    isBubbleOn = message.speechBubble !== false
    isWanderOn = message.wander !== false
    stage.style.height = `${size + 44}px`
    const img = new Image()
    img.onload = () => {
      sheet = img
      layout()
      pet.x = Math.max(0, Math.round((stage.clientWidth - petW()) / 2))
      document.title = message.character.name
    }
    img.src = message.character.sheet
  }

  function receive(message) {
    if (!message) return
    if (message.type === 'setup') setup(message)
    if (message.type === 'react' && message.reaction) react(message.reaction)
  }

  // A click on her is a little interaction of its own: she waves.
  canvas.addEventListener('click', e => {
    if (!sheet) return
    const x = e.offsetX
    if (x >= pet.x && x <= pet.x + petW() && pet.mode !== 'react') {
      react({ behavior: 'hello', anim: 'waving', line: 'Hi!', sticky: false, ms: 1500 })
    }
  })

  window.addEventListener('message', e => receive(e.data))
  window.addEventListener('resize', layout)
  new ResizeObserver(layout).observe(stage)
  requestAnimationFrame(tick)
  if (vscode) vscode.postMessage({ type: 'ready' })
  else window.petTest = { receive, pet }
})()
