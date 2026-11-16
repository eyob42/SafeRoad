/**
 * Amharic alert strings — used as speechSynthesis fallback.
 */
export const ALERT_STRINGS = {
  security: 'ጥንቃቄ፡ ፊት ለፊት ደህንነት ስጋት አለ',
  blocked:  'ጥንቃቄ፡ ፊት ለፊት መንገዱ ታግዷል',
  accident: 'ጥንቃቄ፡ ፊት ለፊት የትራፊክ አደጋ አለ',
  safe:     'መንገዱ ደህና ነው። ደህና ሂዱ',
}

// Shared AudioContext — created once, reused
let _ctx = null

/**
 * Must be called on a user gesture (the Start Demo tap).
 * Creates / resumes the AudioContext so subsequent plays are allowed.
 */
export async function unlockAudio() {
  try {
    if (!_ctx) {
      _ctx = new (window.AudioContext || window.webkitAudioContext)()
    }
    if (_ctx.state === 'suspended') {
      await _ctx.resume()
    }
    // Play a silent 0-duration buffer to fully unlock on iOS
    const buf = _ctx.createBuffer(1, 1, 22050)
    const src = _ctx.createBufferSource()
    src.buffer = buf
    src.connect(_ctx.destination)
    src.start(0)
  } catch (e) {
    console.warn('unlockAudio failed (non-fatal):', e)
  }
}

/**
 * Play the Amharic alert for the given report type.
 * Primary: pre-recorded MP3 at /audio/<type>.mp3
 * Fallback: Web Speech API speechSynthesis with lang=am-ET
 * Always resolves — never throws.
 * Returns true if audio played, false if only toast should show.
 */
export async function playAlert(type) {
  const text = ALERT_STRINGS[type]
  if (!text) return false

  // ── Primary: MP3 ─────────────────────────────────────────────────────────
  let audioPlayed = false
  try {
    const audio = new Audio(`/audio/${type}.mp3`)
    // Treat an empty file (size 0) or very short duration as missing
    await new Promise((resolve, reject) => {
      audio.addEventListener('canplaythrough', () => resolve(), { once: true })
      audio.addEventListener('error', reject, { once: true })
      // If the file loads but has no duration it's a placeholder
      audio.addEventListener('loadedmetadata', () => {
        if (audio.duration === 0 || isNaN(audio.duration)) reject(new Error('empty'))
      }, { once: true })
      audio.load()
    })
    await audio.play()
    audioPlayed = true
  } catch {
    // File missing, empty, or autoplay blocked → fall through
  }

  // ── Fallback: speechSynthesis ─────────────────────────────────────────────
  if (!audioPlayed) {
    try {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel()
        const utt = new SpeechSynthesisUtterance(text)
        utt.lang   = 'am-ET'
        utt.rate   = 0.9
        utt.volume = 1
        window.speechSynthesis.speak(utt)
      }
    } catch (e) {
      console.warn('playAlert speechSynthesis failed (non-fatal):', e)
    }
  }

  // Always return true so the caller shows the toast regardless of audio outcome
  return true
}
