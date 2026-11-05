// How long a message stays up, as in the prototype (showToast)
const TOAST_MS = 2200

// ponytail: one handle for every caller. It is safe because show() only runs in the browser, from
// click handlers. If it ever runs on the server, the handle has to move into per-request state, or
// two requests would clear each other's timer.
let timer: ReturnType<typeof setTimeout> | undefined

// ADR-0007: the message is useState, and an empty one means no toast.
export function useToast() {
  const message = useState('toast', () => '')

  // A new message takes the place of the one on screen and starts the wait over
  function show(text: string) {
    clearTimeout(timer)
    message.value = text
    timer = setTimeout(() => {
      message.value = ''
    }, TOAST_MS)
  }

  // Read-only: a write from outside would leave a message with no wait to take it down
  return { message: readonly(message), show }
}
