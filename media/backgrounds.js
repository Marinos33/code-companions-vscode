// The scenes the pet can stand in, drawn in pixel art on a small canvas the page stretches behind
// her. Each scene draws `w` x `h` grid cells, where one cell is a few screen pixels, sized so she
// is about 54 cells tall; the ground is the bottom rows, the rest anchors to it so a tall view
// only gets more sky. `behavior` is what she is doing (see src/behaviors.js), `idle` when nothing.
;(() => {
  const WORKING = ['thinking', 'editing', 'reading', 'searching', 'shell', 'delegating', 'tooling', 'compacting', 'asking']

  const rect = (ctx, color, x, y, w, h) => {
    ctx.fillStyle = color
    ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)))
  }
  const groundHeight = h => Math.max(3, Math.min(8, Math.round(h * 0.12)))

  // The same pseudo-random numbers for the same seed, so stars and petals stay put between frames.
  const hash = n => {
    const s = Math.sin(n * 127.1) * 43758.5453
    return s - Math.floor(s)
  }

  function ground(ctx, w, h, fill, edge) {
    const gh = groundHeight(h)
    rect(ctx, fill, 0, h - gh, w, gh)
    rect(ctx, edge, 0, h - gh, w, 1)
    return h - gh
  }

  // A scene is laid out in its own units: x from the view's centre, y up from the ground, 80 of
  // them up to where the scene's tallest things end, scaled to the view's height. `L` and `R`
  // are the view's edges in those units.
  function scene(ctx, w, h) {
    const H = h - groundHeight(h)
    const k = Math.max(0.45, Math.min(1.6, H / 80))
    const cx = w / 2
    const X = x => cx + x * k
    const Y = y => H - y * k
    return {
      H, k, cx, X, Y, L: -cx / k, R: cx / k,
      // A box from height `y` up `bh`.
      box: (c, x, y, bw, bh) => rect(ctx, c, X(x), Y(y + bh), bw * k, bh * k),
      dot: (c, x, y) => rect(ctx, c, X(x), Y(y), 1, 1),
      oval: (c, x, y, rx, ry) => disc(ctx, c, X(x), Y(y), rx * k, ry * k),
      hoop: (c, x, y, rx, ry, part) => ring(ctx, c, X(x), Y(y), rx * k, ry * k, part),
      // A skyline: `top(x)` is how high it reaches at x, filled down to the ground.
      ridge: (c, top) => {
        for (let sx = 0; sx < w; sx++) {
          const y = Y(top((sx - cx) / k))
          rect(ctx, c, sx, y, 1, H - y + 1)
        }
      },
      // Flat bands of colour, the first filling the whole sky, the others from `step` units
      // apart down to the ground.
      bands: (colors, step) => colors.forEach((c, i) => rect(ctx, c, 0, i === 0 ? 0 : Y((colors.length - i) * step), w, h)),
      alpha: (a, draw) => {
        ctx.globalAlpha = Math.max(0, Math.min(1, a))
        draw()
        ctx.globalAlpha = 1
      },
    }
  }

  // A pine or round tree's silhouette standing at x.
  function pine(s, c, x, y, size) {
    for (let i = 0; i < size; i++) s.box(c, x - (size - i) * 0.45, y + i * 1.1, (size - i) * 0.9, 1.2)
    s.box(c, x - 0.5, y - 2, 1, 2)
  }

  // A starry night: a band of milky way, twinkling and bright stars, a shooting star now and
  // then, the moon in its halo, mountains and pine hills, a lit cottage and fireflies.
  function night(ctx, w, h, t) {
    const s = scene(ctx, w, h)
    const { H, k, L, R, box, dot, oval, ridge, alpha } = s
    s.bands(['#0d1230', '#131a40', '#1a2250', '#232b62', '#2f3674'], 12)
    alpha(0.16, () => {
      for (let i = 0; i < 9; i++) oval('#8c8cd8', L + (i / 8) * (R - L), 92 - (i / 8) * 46, 14, 5)
    })
    alpha(0.5, () => {
      for (let i = 0; i < 220; i++) {
        const u = hash(i)
        dot('#d8d8ff', L + u * (R - L), 92 - u * 46 + (hash(i + 0.3) - 0.5) * 16)
      }
    })
    for (let i = 0; i < (w * H) / 45; i++) {
      const on = Math.sin(t / 500 + hash(i + 0.5) * 6) > 0.2
      rect(ctx, on ? '#fff6c8' : '#5c639a', hash(i) * w, hash(i + 0.25) * (H - 20 * k), 1, 1)
    }
    for (let i = 0; i < 6; i++) {
      const x = L + 6 + hash(i + 0.8) * (R - L - 12)
      const y = 50 + hash(i + 0.9) * 40
      const a = 0.6 + Math.sin(t / 700 + i) * 0.4
      alpha(a, () => {
        box('#fffbe0', x - 1.5, y, 4, 1 / k)
        box('#fffbe0', x, y - 1.5, 1 / k, 4)
      })
      dot('#ffffff', x, y)
    }
    const shot = (t % 9000) / 9000
    if (shot < 0.1) {
      const sx = L + hash(Math.floor(t / 9000)) * (R - L) * 0.6 + shot * 300
      const sy = 92 - shot * 150
      for (let j = 0; j < 14; j++) alpha(1 - j / 14, () => dot('#ffffff', sx - j * 1.2, sy + j * 0.6))
    }
    const mx = R * 0.55
    alpha(0.08, () => oval('#f6efc8', mx, 66, 18, 18))
    alpha(0.12, () => oval('#f6efc8', mx, 66, 12, 12))
    oval('#f6efc8', mx, 66, 7.5, 7.5)
    oval('#fffbe6', mx - 2, 68, 4, 4)
    oval('#e2d9a8', mx + 2, 64, 1.8, 1.8)
    oval('#e2d9a8', mx - 2.5, 63, 1.2, 1.2)
    oval('#e2d9a8', mx + 3, 69, 1, 1)
    alpha(0.45, () => {
      for (let i = 0; i < 4; i++) oval('#3d4588', L + ((hash(i + 0.1) * (R - L) + t / 300) % (R - L)), 58 + i * 5, 12 + i * 3, 1.5)
    })
    ridge('#222a5c', x => 30 + Math.sin(x * 0.07) * 9 + Math.sin(x * 0.19 + 1) * 4 + Math.abs(Math.sin(x * 0.5)) * 2)
    ridge('#2a3268', x => Math.min(30 + Math.sin(x * 0.07) * 9 + Math.sin(x * 0.19 + 1) * 4, 18 + Math.sin(x * 0.11) * 3))
    alpha(0.25, () => box('#4a5296', L, 12, R - L, 4))
    const hill = x => 13 + Math.sin(x * 0.05 + 2) * 5 + Math.sin(x * 0.13) * 2
    ridge('#19204a', hill)
    for (let x = Math.ceil(L / 7) * 7; x < R; x += 7) {
      if (Math.abs(x - R * 0.4) > 8) pine(s, '#121838', x + hash(x) * 3, hill(x) - 1, 6 + Math.floor(hash(x + 0.5) * 5))
    }
    if (R > 40) {
      const hx = R * 0.4
      const hy = hill(hx) - 1
      box('#262d5a', hx - 5, hy, 10, 6)
      for (let i = 0; i < 4; i++) box('#1a2048', hx - 6 + i, hy + 6 + i, 12 - i * 2, 1)
      box('#262d5a', hx + 2, hy + 7, 1.5, 3)
      const flicker = 0.85 + Math.sin(t / 130) * 0.1
      alpha(flicker, () => box('#ffd77a', hx - 3, hy + 2, 2, 2))
      alpha(flicker * 0.2, () => oval('#ffd77a', hx - 2, hy + 3, 5, 3))
    }
    box('#0e1336', L + 4, 0, 2, 22)
    for (const [dx, dy, r] of [[5, 26, 7], [1, 22, 5], [9, 22, 5], [5, 31, 4]]) oval('#0e1336', L + dx, dy, r, r * 0.8)
    ground(ctx, w, h, '#1d2a48', '#2c3c64')
    for (let sx = 0; sx < w; sx += 3) rect(ctx, hash(sx) > 0.5 ? '#2f4a5e' : '#263d58', sx, H - 1 - Math.floor(hash(sx + 0.2) * 2), 1, 2)
    for (let i = 0; i < 10; i++) rect(ctx, '#8fa8ff', hash(i + 0.6) * w, H + 1 + hash(i) * 3, 1, 1)
    for (let i = 0; i < 9; i++) {
      const fx = L + ((hash(i) * (R - L) + Math.sin(t / 1300 + i) * 8 + (R - L)) % (R - L))
      const fy = 4 + hash(i + 0.4) * 18 + Math.sin(t / 900 + i * 2) * 3
      const on = Math.sin(t / 400 + i * 1.7)
      if (on > 0) {
        alpha(on * 0.3, () => oval('#d8ff7a', fx, fy, 1.5, 1.5))
        alpha(on, () => dot('#eeffb0', fx, fy))
      }
    }
  }

  // A coding corner: a desk with a monitor scrolling code (faster while Claude works), keyboard,
  // steaming mug and lamp; a shelf of books, a clock and a window on the wall; a plant, a rug and
  // a parquet floor.
  const CODE_COLORS = ['#c792ea', '#82aaff', '#c3e88d', '#f78c6c', '#89ddff', '#ffcb6b']
  function desk(ctx, w, h, t, behavior) {
    const s = scene(ctx, w, h)
    const { H, k, cx, L, R, X, Y, box, dot, oval, hoop, alpha } = s
    const working = WORKING.includes(behavior)
    rect(ctx, '#efe3cc', 0, 0, w, h)
    for (let x = Math.ceil(L / 8) * 8; x < R; x += 8) box('#e8dac0', x, 0, 1, 200)
    box('#dcc9a8', L, 28, R - L, 1.5)
    box('#e6d6b8', L, 3, R - L, 25)
    box('#d9b98e', L, 3, R - L, 1)
    box('#c9a77e', L, 0, R - L, 3)

    // The window, with a sky and a cloud going by, and its curtains.
    if (R > 40) {
      const wx = Math.min(R - 32, 14)
      box('#fdf8ee', wx - 1, 35, 26, 32)
      box('#a9d8f2', wx + 1, 37, 22, 28)
      box('#c8e8f8', wx + 1, 37, 22, 8)
      alpha(0.9, () => oval('#ffffff', wx + 6 + ((t / 200) % 12), 56, 4, 1.5))
      box('#86c46a', wx + 1, 37, 22, 3)
      box('#fdf8ee', wx + 11.5, 37, 1, 28)
      box('#fdf8ee', wx + 1, 50, 22, 1)
      box('#d9c7a6', wx - 2, 34, 28, 1.5)
      for (const cxo of [wx - 4, wx + 21]) {
        box('#d77a6a', cxo, 36, 7, 33)
        for (let i = 1; i < 7; i += 2) box('#c0685a', cxo + i, 36, 1, 33)
      }
      box('#8e6a4a', wx - 6, 69, 36, 1)
    }

    // A shelf of books above the desk, and the clock.
    const sx = L + 4
    box('#8e5e39', sx, 52, 34, 1.5)
    box('#a8754b', sx, 53.5, 34, 0.8)
    const BOOKS = ['#4a6fa5', '#c0504d', '#e0b04a', '#6a9a5a', '#8a5aa5', '#d0d0c8', '#4a8a9a']
    for (let i = 0, x = sx + 1; x < sx + 24; i++) {
      const bw = 1.5 + hash(i + 0.3) * 1.5
      const bh = 6 + hash(i + 0.7) * 4
      box(BOOKS[i % BOOKS.length], x, 54.3, bw, bh)
      box('#00000022', x + bw - 0.5, 54.3, 0.5, bh)
      x += bw + 0.3
    }
    box('#b97a4e', sx + 27, 54.3, 5, 3)
    box('#6fb04a', sx + 28, 57.3, 3, 4)
    box('#8fd06a', sx + 29, 61, 1, 2)
    const ck = Math.max(-R * 0.15, sx + 46)
    oval('#6b4a33', ck, 62, 6, 6)
    oval('#fbf6ea', ck, 62, 5, 5)
    for (let i = 0; i < 12; i++) dot('#8a7a6a', ck + Math.cos(i * 0.52) * 4.2, 62 + Math.sin(i * 0.52) * 4.2)
    const sec = t / 1000
    for (let j = 0; j < 4; j++) dot('#3a2a20', ck + Math.sin(sec * 0.1) * j, 62 + Math.cos(sec * 0.1) * j)
    for (let j = 0; j < 3; j++) dot('#c0504d', ck + Math.sin(sec * 1.05) * j * 1.3, 62 + Math.cos(sec * 1.05) * j * 1.3)

    // The desk and what is on it.
    const dx = L + 2
    box('#8e5e39', dx, 21, 50, 1.5)
    box('#b07a4f', dx, 22.5, 50, 2)
    box('#c28a5c', dx, 24.5, 50, 0.8)
    box('#8e5e39', dx + 2, 0, 2.5, 21)
    box('#8e5e39', dx + 45, 0, 2.5, 21)
    box('#a06c44', dx + 30, 12, 15, 9)
    box('#c28a5c', dx + 36, 16, 3, 1)
    const mx = dx + 6
    box('#2b2a3a', mx, 27, 28, 20)
    box('#1e1e2e', mx + 1.5, 28.5, 25, 17)
    box('#262636', mx + 1.5, 28.5, 3, 17)
    const speed = working ? 140 : 650
    const lines = Math.floor(17 / 2.2)
    for (let i = 0; i < lines; i++) {
      const line = i + Math.floor(t / speed)
      const indent = Math.floor(hash(line + 0.2) * 3) * 2
      const y = 44 - i * 2.2
      box('#4a4a6a', mx + 2.2, y, 1.4, 0.8)
      let x = mx + 5.5 + indent
      for (let tk = 0; tk < 3 && x < mx + 25; tk++) {
        const len = Math.min(2 + hash(line * 3 + tk) * 6, mx + 25 - x)
        box(CODE_COLORS[(line + tk) % CODE_COLORS.length], x, y, len, 0.8)
        x += len + 1
      }
    }
    if (Math.floor(t / 500) % 2) box('#e0e0e0', mx + 6, 44 - (lines - 1) * 2.2, 0.8, 1.2)
    box('#3d3b4f', mx + 12, 25, 4, 2)
    box('#3d3b4f', mx + 8, 24.5, 12, 0.8)
    box('#c8c8d4', dx + 9, 24.5, 20, 1.2)
    for (let i = 0; i < 9; i++) box('#e8e8f0', dx + 9.6 + i * 2.1, 25.2, 1.4, 0.5)
    const mgx = dx + 38
    box('#e46a5a', mgx, 24.5, 4, 5)
    box('#f08a7a', mgx, 28.8, 4, 0.7)
    hoop('#e46a5a', mgx + 4.6, 27, 1.2, 1.4)
    alpha(0.5, () => {
      for (let j = 0; j < 5; j++) {
        const rise = ((t / 60 + j * 8) % 40) / 40
        dot('#ffffff', mgx + 2 + Math.sin(rise * 6 + j) * 1.5, 30 + rise * 8)
      }
    })
    const lx = dx + 46
    box('#4a4a5a', lx - 2, 24.5, 5, 1)
    box('#4a4a5a', lx, 25.5, 1, 9)
    box('#4a4a5a', lx - 4, 34, 5, 1)
    box('#e0b04a', lx - 6, 32, 5, 2.5)
    alpha(0.15, () => {
      for (let i = 0; i < 7; i++) box('#fff3c0', lx - 6 - i * 0.6, 31 - i, 5 + i * 1.2, 1)
    })
    box('#8a8a92', dx + 52, 0, 5, 7)
    box('#a0a0a8', dx + 52, 7, 5, 0.8)
    box('#f4f4ee', dx + 53, 7.6, 2, 1)

    // A big plant in the corner.
    if (R > 50) {
      const px = R - 9
      const LEAVES = [[-6, 22, 5, 2.5, '#4f9a4a'], [5, 24, 5, 2.5, '#5fae56'], [-3, 30, 4, 3, '#6fc064'], [3, 32, 4, 3, '#4f9a4a'], [0, 38, 3.5, 3, '#7fd070'], [-7, 15, 4, 2, '#6fc064'], [7, 17, 4, 2, '#4f9a4a']]
      box('#3f7a3a', px - 0.5, 10, 1, 26)
      for (const [ox, oy, rx, ry, c] of LEAVES) {
        oval(c, px + ox, oy + Math.sin(t / 1500 + ox) * 0.4, rx, ry)
        box('#3f7a3a', px + ox - rx * 0.6, oy, rx * 1.2, 0.5)
      }
      box('#b4643c', px - 6, 0, 12, 10)
      box('#c87a4c', px - 7, 9, 14, 2)
      box('#9a5432', px + 3, 0, 3, 9)
    }

    // The parquet floor and the rug she stands on.
    ground(ctx, w, h, '#a8754b', '#c28a5c')
    for (let r = 0, y = H + 1; y < h; r++, y += 3) {
      rect(ctx, '#8e5e39', 0, y + 2, w, 1)
      for (let x = (r % 2) * 7; x < w; x += 14) rect(ctx, '#8e5e39', x, y, 1, 3)
    }
    const rw = Math.min(w * 0.5, 70 * k)
    rect(ctx, '#4a5a9a', cx - rw / 2, H + 1, rw, h - H - 1)
    rect(ctx, '#6a7fc0', cx - rw / 2 + 1, H + 2, rw - 2, h - H - 3)
    for (let x = cx - rw / 2 + 3; x < cx + rw / 2 - 3; x += 4) rect(ctx, '#e9d27a', x, H + 3 + (Math.round(x) % 2), 1, 1)
  }

  // Cherry blossoms: a pale sky and a snowy mountain, a torii gate in the mist, a great cherry
  // tree and a smaller one, a stone lantern, petals falling and gathering on the grass.
  const PINKS = ['#f4a6c8', '#f7bcd5', '#ed93b1', '#fbd3e2', '#e283a8']
  function sakura(ctx, w, h, t) {
    const s = scene(ctx, w, h)
    const { H, k, L, R, Y, box, dot, oval, ridge, alpha } = s
    s.bands(['#f7d3df', '#f9dce5', '#fbe4ea', '#fdecee', '#fef3ef'], 12)
    alpha(0.7, () => oval('#fff8f2', R * 0.3, 62, 9, 9))
    const fx = -R * 0.35
    const mount = x => Math.max(10, 52 - Math.abs(x - fx) * 0.75 + Math.sin(x * 0.4) * 0.8)
    ridge('#dcc6de', mount)
    for (let sx = 0; sx < w; sx++) {
      const x = (sx - s.cx) / k
      const top = mount(x)
      const snow = 42 - hash(Math.round(x)) * 3
      if (top > snow) rect(ctx, '#fbf6fa', sx, Y(top), 1, (top - snow) * k)
    }
    alpha(0.6, () => {
      for (let i = 0; i < 5; i++) oval('#fff4f6', L + ((hash(i + 0.4) * (R - L) + t / 500) % (R - L)), 22 + i * 4, 16, 1.6)
    })
    ridge('#e6c6d4', x => 14 + Math.sin(x * 0.06) * 3 + Math.sin(x * 0.17 + 1) * 1.5)
    ridge('#d9b6c6', x => 8 + Math.sin(x * 0.09 + 2) * 2)

    // The torii gate.
    if (R > 44) {
      const gx = R * 0.42
      box('#c23a32', gx - 9, 0, 2.5, 26)
      box('#c23a32', gx + 6.5, 0, 2.5, 26)
      box('#a8302a', gx - 7.5, 0, 1, 26)
      box('#a8302a', gx + 8, 0, 1, 26)
      box('#c23a32', gx - 12, 21, 24, 2)
      box('#c23a32', gx - 14, 26, 28, 2)
      box('#2a1f1f', gx - 15, 28, 30, 1.5)
      box('#2a1f1f', gx - 16, 29, 2, 1)
      box('#2a1f1f', gx + 14, 29, 2, 1)
      box('#e0c060', gx - 1.5, 23, 3, 3)
      box('#2a1f1f', gx - 10, 0, 4.5, 1.5)
      box('#2a1f1f', gx + 5.5, 0, 4.5, 1.5)
    }

    // The stone lantern.
    const sl = L + 36
    box('#9a9096', sl - 3, 0, 6, 2)
    box('#aaa0a6', sl - 1, 2, 2, 6)
    box('#9a9096', sl - 3, 8, 6, 1.5)
    box('#b8aeb4', sl - 2.5, 9.5, 5, 4)
    alpha(0.8 + Math.sin(t / 200) * 0.1, () => box('#ffe7a8', sl - 1.2, 10.3, 2.4, 2.4))
    box('#8a8086', sl - 4.5, 13.5, 9, 1.5)
    box('#9a9096', sl - 3, 15, 6, 1)
    box('#aaa0a6', sl - 0.8, 16, 1.6, 1.5)

    // The trees: trunk and branches, then the blossoms in clusters.
    const tree = (x, size, seed) => {
      box('#6a4440', x - size * 0.12, 0, size * 0.24, size * 1.3)
      box('#7a4e4a', x - size * 0.12, 0, size * 0.1, size * 1.3)
      for (let j = 0; j < size * 0.8; j++) {
        box('#6a4440', x + j * 0.9, size * 1.2 + j * 0.5, 1, 1)
        box('#6a4440', x - j * 0.9, size * 1.25 + j * 0.45, 1, 1)
      }
      for (let i = 0; i < size * 2.5; i++) {
        const a = hash(seed + i) * Math.PI * 2
        const r = Math.sqrt(hash(seed + i + 0.5))
        const bx = x + Math.cos(a) * r * size * 1.1
        const by = size * 1.7 + Math.sin(a) * r * size * 0.55
        oval(by < size * 1.5 ? '#e283a8' : PINKS[i % 4], bx, by, 2 + hash(seed + i + 0.2) * 2.5, 1.6 + hash(seed + i + 0.7) * 1.6)
      }
    }
    tree(L + 13, 22, 1)
    if (R > 56) tree(R - 12, 13, 50)

    // Petals falling, petals on the grass, stones and pink shrubs.
    ground(ctx, w, h, '#c8dfa8', '#d8ebbc')
    for (let i = 0; i < w / 2; i++) rect(ctx, PINKS[i % 5], hash(i + 0.9) * w, H + 1 + hash(i + 0.1) * (h - H - 1), 1, 1)
    for (let x = L + 4; x < R; x += 14) oval('#b8b0b4', x + hash(x) * 4, -1.5, 4, 1)
    for (let x = L + 20; x < R - 6; x += 26) {
      oval('#5a8a4a', x, 2, 4.5, 2.5)
      for (let j = 0; j < 5; j++) dot(PINKS[j], x - 3 + j * 1.5, 2.5 + (j % 2))
    }
    for (let i = 0; i < (w * h) / 220; i++) {
      const fall = 20 + hash(i + 0.7) * 30
      const y = (hash(i + 0.3) * h + t / fall) % h
      const x = (hash(i) * w + Math.sin(t / 700 + i) * 4 + y * 0.3 + w) % w
      const flip = Math.floor(t / 300 + i) % 2
      rect(ctx, PINKS[i % 5], x, y, flip ? 2 : 1, flip ? 1 : 2)
    }
  }

  // Outline of an ellipse, one cell per step around it: `part` -1 draws only its back (upper)
  // half, 1 only its front half, so a ring can go round something.
  function ring(ctx, color, cx, cy, rx, ry, part = 0) {
    ctx.fillStyle = color
    const steps = Math.max(16, Math.round(rx * 6))
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2
      if (part && Math.sign(Math.sin(a)) !== part) continue
      ctx.fillRect(Math.round(cx + Math.cos(a) * rx), Math.round(cy + Math.sin(a) * ry), 1, 1)
    }
  }

  function disc(ctx, color, cx, cy, rx, ry) {
    ctx.fillStyle = color
    for (let y = Math.ceil(-ry); y <= ry; y++) {
      const half = rx * Math.sqrt(Math.max(0, 1 - (y / ry) ** 2))
      ctx.fillRect(Math.round(cx - half), Math.round(cy + y), Math.max(1, Math.round(half * 2)), 1)
    }
  }

  // A white city of the future: a tiered tower crowned with a faceted crystal and wrapped in a
  // green hologram, an overhead walkway arching across the sky, buildings at both edges, a
  // floating lamp and a gyroscope, railings, and strange flowers in front.
  function city(ctx, w, h, t) {
    const { H, k, cx, L, R, Y, box, oval, hoop, alpha } = scene(ctx, w, h)

    // Sky in bands, light shafts and soft clouds drifting across it.
    const sky = ['#5ec4c8', '#6fcfcc', '#84d8d0', '#9ee2d6', '#b9ebdf']
    sky.forEach((c, i) => rect(ctx, c, 0, i === 0 ? 0 : H - (5 - i) * 14 * k, w, h))
    alpha(0.35, () => {
      for (let i = 0; i < 7; i++) {
        const x0 = ((hash(i) * w * 1.5 + t / (70 + i * 25)) % (w * 1.5)) - w * 0.25
        const y0 = hash(i + 0.4) * H * 0.4
        for (let j = 0; j < 24 * k; j++) rect(ctx, '#f2fffb', x0 + j, y0 + j * 2, 1, 2)
      }
    })
    alpha(0.6, () => {
      for (let i = 0; i < 6; i++) {
        const x = L + ((hash(i + 0.2) * (R - L) + t / 400) % (R - L))
        oval('#e8faf4', x, 26 + hash(i + 0.6) * 10, 10 + hash(i) * 8, 2)
      }
    })

    // The walkway arching overhead, then the buildings at the edges.
    for (let sx = 0; sx < w; sx++) {
      const x = (sx - cx) / k
      const y = 80 - (x / Math.max(R, 60)) ** 2 * 22
      rect(ctx, Math.round(x) % 9 === 0 ? '#d4e2e2' : '#f4f9f9', sx, Y(y + 3), 1, 3 * k)
      rect(ctx, '#b6caca', sx, Y(y), 1, k)
    }
    box('#eef4f4', L, 58, 18, 32)
    box('#c3d4d4', L, 58, 18, 2)
    box('#dbe7e7', L + 12, 60, 6, 30)
    box('#e3ecec', L + 10, 0, 4, 58)
    box('#c9d9d9', L + 13, 0, 1, 58)
    box('#f2f7f7', R - 13, 0, 13, 92)
    box('#d2e0e0', R - 13, 0, 2, 92)
    for (let y = 12; y < 90; y += 13) box('#d5e2e2', R - 13, y, 13, 1)
    box('#86aeb6', R - 9, 40, 6, 10)
    box('#c8ffa0', R - 7, 44, 2, 2)
    box('#a9bdbd', R - 8, 62, 1, 3)
    box('#a9bdbd', R - 7, 63, 1, 1)

    // Far buildings behind the railing.
    for (let x = L, i = 0; x < R; i++) {
      const bw = 7 + Math.floor(hash(i + 0.1) * 9)
      const bh = 6 + Math.floor(hash(i + 0.9) * 14)
      box('#e6efee', x, 6, bw - 1, bh)
      box('#c4d8d6', x + bw - 3, 6, 2, bh)
      box('#bcd8d6', x, 6 + bh, bw - 1, 1)
      if (bh > 10) box('#8fdc84', x + 2, 6 + bh - 4, bw - 5, 1)
      x += bw
    }

    // A smaller tower at the left with its saucer, and a gyroscope turning by it.
    if (L < -62) {
      box('#eef4f4', -54, 0, 8, 34)
      box('#ccdcdc', -49, 0, 3, 34)
      oval('#b9cccc', -50, 35, 14, 3)
      oval('#eef4f4', -50, 36, 13, 2.5)
      oval('#f8fbfb', -50, 39, 5, 2)
      alpha(0.7, () => hoop('#b4f86e', -50, 20, 9, 2))
      alpha(0.25, () => box('#b4f86e', -59, 18, 18, 4))
      const spin = Math.abs(Math.sin(t / 1400))
      hoop('#d4dcdc', -34, 56, 6, 6 * spin + 0.5)
      hoop('#bfcaca', -34, 56, 6 * spin + 0.5, 6)
      box('#9fe28a', -35, 55, 2, 2)
    }

    // A building with a blue roof at the right, and its white hoop.
    if (R > 54) {
      box('#eef4f4', 26, 0, 38, 22)
      box('#d0dfdf', 56, 0, 8, 22)
      box('#4a7fd4', 26, 22, 38, 2)
      box('#f7fbfb', 26, 24, 38, 1)
      box('#7ed36a', 26, 6, 38, 1)
      for (let x = 29; x < 60; x += 6) {
        box('#9fb7c4', x, 9, 3, 8)
        box('#eef4f4', x, 16, 1, 1)
        box('#eef4f4', x + 2, 16, 1, 1)
      }
      hoop('#f4f8f8', 46, 33, 7, 8)
      hoop('#c9d6d6', 46, 33, 6, 7)
    }

    // The tower: the hologram's back, the tower and its crystal, then the hologram's front.
    const glow = 0.6 + Math.sin(t / 500) * 0.2
    alpha(0.8, () => {
      hoop('#b4f86e', 0, 24, 30, 5, -1)
      hoop('#b4f86e', 0, 46, 30, 5, -1)
    })
    box('#e6eeee', -21, 0, 42, 4)
    box('#f7fbfb', -21, 4, 42, 1)
    box('#f2f7f7', -16, 5, 32, 10)
    box('#d0dede', 8, 5, 8, 10)
    box('#2f5a5a', -3, 5, 6, 8)
    alpha(glow, () => box('#7ef08a', -1, 6, 2, 6))
    box('#dfe9e9', -16, 15, 4, 16)
    box('#dfe9e9', 12, 15, 4, 16)
    box('#c4d6d6', 15, 15, 1, 16)
    box('#f5f9f9', -12, 15, 24, 40)
    box('#ffffff', -10, 15, 2, 40)
    box('#e1ebeb', 4, 15, 5, 40)
    box('#c9d9d9', 9, 15, 3, 40)
    alpha(glow, () => box('#5fd06a', -1, 17, 2, 36))
    box('#b9cccc', -15, 30, 30, 1)
    box('#e9f1f1', -15, 31, 30, 3)
    box('#b9cccc', -14, 50, 28, 1)
    box('#e9f1f1', -14, 51, 28, 3)
    box('#f5f9f9', -8, 55, 16, 10)
    box('#d0dede', 3, 55, 5, 10)
    oval('#c3d4d4', 0, 64.5, 13, 2)
    oval('#eef4f4', 0, 65.5, 13, 2)
    box('#dfe9e9', -12, 65, 1, 10)
    box('#dfe9e9', 11, 65, 1, 10)
    hoop('#c8d4d8', 0, 75, 12, 3, -1)
    for (let i = 0; i <= 15; i++) {
      const half = i < 9 ? 0.6 + i * 0.75 : 6.6 - (i - 9) * 0.9
      box('#f4fbff', -half, 67 + i, half, 1)
      box('#a9c4e4', 0, 67 + i, half, 1)
      if (i > 2 && i < 13) box('#d6e6f6', -half * 0.3, 67 + i, half * 0.3, 1)
    }
    box('#e8f4ff', -2, 82, 4, 1)
    hoop('#c8d4d8', 0, 75, 12, 3, 1)
    alpha(0.16, () => box('#b4f86e', -30, 24, 60, 22))
    alpha(0.8, () => {
      hoop('#b4f86e', 0, 24, 30, 5, 1)
      hoop('#b4f86e', 0, 46, 30, 5, 1)
      box('#b4f86e', -30, 24, 1, 22)
      box('#b4f86e', 29, 24, 1, 22)
    })
    alpha(0.55, () => {
      for (let i = 0; i < 10; i++) box('#dcffc0', -26 + ((i * 6 + t / 120) % 52), 33 + (i % 3) * 3, 2, 1)
      hoop('#b4f86e', 0, 35, 31, 5, 1)
    })
    alpha(0.7, () => {
      for (let i = 0; i < 3; i++) {
        const rise = ((t / 70 + i * 12) % 36) / 36
        hoop('#c8ffa0', 0, 47 + rise * 18, 16 - rise * 6, 2.5)
      }
    })

    // The lamp floating at the right, and hologram glyphs in the air.
    if (R > 40) {
      const lx = Math.min(R - 22, 40)
      const ly = 56 + Math.sin(t / 900) * 2
      box('#9aa4a8', lx - 1, ly + 3, 2, 3)
      oval('#aab4b8', lx, ly + 6, 9, 3)
      oval('#d6dde0', lx, ly + 7, 8, 2.5)
      oval('#eef2f4', lx - 2, ly + 8, 4, 1)
      alpha(glow, () => {
        box('#b6f77a', lx - 4, ly - 7, 8, 9)
        box('#b6f77a', lx - 2, ly - 10, 4, 3)
        hoop('#d9ffb8', lx, ly - 3, 10, 2)
      })
      box('#7ed36a', lx - 4, ly - 7, 1, 9)
      box('#7ed36a', lx + 3, ly - 7, 1, 9)
    }
    alpha(0.45 + Math.sin(t / 700) * 0.15, () => {
      for (let i = 0; i < 6; i++) {
        const gx = L + 8 + hash(i + 0.15) * (R - L - 16)
        const gy = 44 + hash(i + 0.55) * 30
        if (Math.abs(gx) > 20) {
          hoop('#d9ffb8', gx, gy, 3, 3)
          box('#d9ffb8', gx, gy, 1, 1)
        }
      }
    })

    // The railing, lamp posts, then the plaza.
    box('#f7fbfb', L, 6, R - L, 1.2)
    box('#dfeaea', L, 3, R - L, 1)
    for (let x = Math.ceil(L / 6) * 6; x < R; x += 6) box('#cfdede', x, 0, 1, 7)
    alpha(0.6, () => box('#8be07a', L, 1, R - L, 0.8))
    for (const x of [-R * 0.42, R * 0.42]) {
      box('#cfd9d9', x, 0, 1, 18)
      box('#eef4f4', x - 2, 18, 5, 1.5)
      alpha(glow, () => box('#c8ffa0', x - 1, 17, 3, 1))
    }
    ground(ctx, w, h, '#dbe8e5', '#f4faf9')
    rect(ctx, '#c9dcd8', 0, H + 3, w, 1)
    alpha(0.5, () => ring(ctx, '#bcd3cf', cx, H + 6, w * 0.4, 2, -1))

    // Flowers in front: blue fans, an orange cap and a shrub at the left; orange leaves and a
    // pink bud at the right, purple petals hanging in the top corner.
    if (R > 30) {
      const fan = (x, y, size, light) => {
        box('#4d6f7d', x, 0, 1.5, y)
        for (let i = 0; i < size; i++) {
          const half = 2 + i * 1.3
          for (let c = Math.round(-half); c < half; c++) {
            box(c % 3 === 0 ? '#2f5f9c' : i > size - 3 ? '#a8cdf6' : light, x + c, y + i, 1, 1)
          }
        }
      }
      fan(L + 24, 18, 7, '#86b4ee')
      fan(L + 11, 26, 10, '#5c8fd6')
      box('#c86a3a', L + 32, 0, 1, 8)
      oval('#e8873a', L + 32.5, 9, 6, 1.5)
      box('#f6b25a', L + 29, 9, 7, 1)
      for (let i = 0; i < 6; i++) box(i % 2 ? '#3f8a55' : '#5aa86a', L + 40 + i * 1.5, 7, 1, 2 + (i % 3))
      for (let i = 0; i < 4; i++) {
        const lx = R - 6 - i * 6
        oval('#b8562a', lx, 5 + i * 3.5, 9, 2.6)
        oval(i % 2 ? '#f0a24a' : '#e8873a', lx, 5.5 + i * 3.5, 8.5, 2)
        box('#f6c86a', lx - 7, 6 + i * 3.5, 14, 0.6)
      }
      box('#5aa86a', R - 6, 8, 1, 10)
      oval('#ec6f95', R - 5.5, 20, 1.8, 3)
      oval('#f7a6c0', R - 6, 21, 0.8, 1.5)
      oval('#6a3590', R - 6, 88, 12, 5)
      oval('#9a5cc4', R - 9, 86, 7, 2.5)
      oval('#c48ae0', R - 12, 85, 3, 1)
    }
  }

  // The countryside, its sky following Claude: day while idle, dusk with stars and the moon while
  // it works, a golden sunrise when it is done, a grey storm with rain when something fails.
  // Colours ease from one mood to the next.
  const MOODS = {
    day: { sky: '#8fd3f4', low: '#bde6f8', far: '#9cc8b8', near: '#7fbf6a', tree: '#4f9a4a', grass: '#6fb04a', edge: '#86c45e', cloud: '#ffffff' },
    work: { sky: '#4a3d8c', low: '#8a76c0', far: '#5a5a92', near: '#3f5a6a', tree: '#2c4252', grass: '#3f6a5a', edge: '#4f7c6a', cloud: '#7a6aaa' },
    done: { sky: '#f7a86a', low: '#fbd59a', far: '#d8a88a', near: '#9ab85a', tree: '#6a8a3a', grass: '#7aa84a', edge: '#9cc45e', cloud: '#ffe6c8' },
    oops: { sky: '#5b6270', low: '#828a96', far: '#6a7480', near: '#55705a', tree: '#3e5444', grass: '#4f6a52', edge: '#62806a', cloud: '#4a505c' },
  }
  const DONE_HOLD_MS = 6000
  const EASE_MS = 800
  const mix = (a, b, k) => {
    const pa = parseInt(a.slice(1), 16)
    const pb = parseInt(b.slice(1), 16)
    const ch = s => Math.round(((pa >> s) & 255) * (1 - k) + ((pb >> s) & 255) * k)
    // Hex, since a colour caught mid-ease becomes the start of the next one.
    return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0')}`
  }
  let mood = 'day'
  let from = MOODS.day
  let since = 0
  function moodFor(behavior, t) {
    if (behavior === 'done' || behavior === 'hello') return 'done'
    if (behavior === 'oops') return 'oops'
    if (WORKING.includes(behavior)) return 'work'
    return mood === 'done' && t - since < DONE_HOLD_MS ? 'done' : 'day'
  }

  function reactive(ctx, w, h, t, behavior) {
    const next = moodFor(behavior, t)
    if (next !== mood) {
      const e = Math.min(1, (t - since) / EASE_MS)
      from = Object.fromEntries(Object.keys(MOODS.day).map(c => [c, mix(from[c], MOODS[mood][c], e)]))
      mood = next
      since = t
    }
    const e = Math.min(1, (t - since) / EASE_MS)
    const c = Object.fromEntries(Object.keys(MOODS.day).map(n => [n, mix(from[n], MOODS[mood][n], e)]))
    const fade = name => (mood === name ? e : 0)
    const s = scene(ctx, w, h)
    const { H, L, R, box, dot, oval, ridge, alpha } = s

    s.bands([c.sky, mix(c.sky, c.low, 0.35), mix(c.sky, c.low, 0.7), c.low], 12)
    if (fade('work')) {
      alpha(fade('work'), () => {
        for (let i = 0; i < (w * H) / 60; i++) {
          rect(ctx, Math.sin(t / 400 + hash(i + 0.5) * 6) > 0.2 ? '#ffffff' : '#9a8cc8', hash(i) * w, hash(i + 0.25) * H * 0.7, 1, 1)
        }
        oval('#f6efc8', R * 0.5, 68, 6, 6)
        oval(c.sky, R * 0.5 + 2.5, 69.5, 5, 5)
      })
    }
    const sun = 1 - fade('work') - fade('oops')
    if (sun > 0) {
      // The sun rides high by day, low and large at sunrise.
      const rise = fade('done')
      const sx = -R * 0.5 + rise * R * 0.2
      const sy = 66 - rise * 44
      const r = 6 + rise * 4
      alpha(sun * 0.18, () => oval('#fff6c0', sx, sy, r * 2, r * 2))
      if (rise) {
        alpha(rise * 0.35, () => {
          for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2 + t / 4000
            for (let j = r + 2; j < r + 8; j++) dot('#fff0b8', sx + Math.cos(a) * j, sy + Math.sin(a) * j)
          }
        })
      }
      alpha(sun, () => {
        oval(rise ? '#ffd27a' : '#fff2a8', sx, sy, r, r)
        oval('#fffbe0', sx - r * 0.3, sy + r * 0.3, r * 0.4, r * 0.4)
      })
    }
    // Clouds: a few by day, many and low in a storm.
    const clouds = 4 + Math.round(fade('oops') * 6)
    for (let i = 0; i < clouds; i++) {
      const x = L + ((hash(i + 0.2) * (R - L) + t / (300 - fade('oops') * 150)) % (R - L + 30)) - 15
      const y = 50 + hash(i + 0.6) * 30 - fade('oops') * 8
      const size = 6 + hash(i) * 6 + fade('oops') * 4
      oval(mix(c.cloud, '#000000', 0.12), x, y - 1, size, size * 0.3)
      oval(c.cloud, x, y, size, size * 0.3)
      oval(c.cloud, x - size * 0.3, y + size * 0.25, size * 0.5, size * 0.35)
      oval(c.cloud, x + size * 0.3, y + size * 0.3, size * 0.45, size * 0.3)
    }
    if (fade('oops') && t % 5000 < 90) alpha(0.5, () => rect(ctx, '#ffffff', 0, 0, w, h))

    ridge(c.far, x => 22 + Math.sin(x * 0.05) * 6 + Math.sin(x * 0.13 + 1) * 3)
    const hill = x => 11 + Math.sin(x * 0.04 + 2) * 4 + Math.sin(x * 0.11) * 2
    ridge(c.near, hill)
    for (let x = Math.ceil(L / 9) * 9; x < R; x += 9) {
      const tx = x + hash(x) * 4
      if (hash(x + 0.3) < 0.55) {
        box(mix(c.tree, '#3a2a1a', 0.5), tx - 0.5, hill(tx) - 2, 1, 3)
        oval(c.tree, tx, hill(tx) + 3, 3, 3)
        oval(mix(c.tree, '#ffffff', 0.15), tx - 1, hill(tx) + 4, 1.4, 1.2)
      }
    }
    ground(ctx, w, h, c.grass, c.edge)
    for (let sx = 0; sx < w; sx += 3) rect(ctx, c.edge, sx, H - 1, 1, 1 + Math.floor(hash(sx) * 2))
    const flowers = 1 - fade('work') - fade('oops')
    if (flowers > 0) {
      alpha(flowers, () => {
        for (let i = 0; i < 12; i++) rect(ctx, ['#f5e06b', '#f49ac1', '#ffffff'][i % 3], hash(i + 0.6) * w, H + 1 + hash(i) * (h - H - 2), 1, 1)
      })
    }
    if (fade('oops')) {
      alpha(fade('oops') * 0.7, () => {
        for (let i = 0; i < (w * h) / 90; i++) {
          const y = (hash(i + 0.3) * h + t / 6) % H
          rect(ctx, '#c4cad4', (hash(i) * w + y / 3) % w, y, 1, 2)
        }
      })
    }
  }

  window.petBackgrounds = { night, desk, sakura, city, reactive }
})()
