const WALINE_SCRIPT_SRC = "https://unpkg.com/@waline/client@v3/dist/waline.js"
const WALINE_STYLE_HREF = "https://unpkg.com/@waline/client@v3/dist/waline.css"

type WalineElement = Omit<HTMLElement, "dataset"> & {
  dataset: DOMStringMap & {
    serverUrl: string
    lang?: string
    path: string
    dark?: string
    reaction?: string
    emoji?: string
    locale?: string
  }
}

type WalineInstance = {
  destroy?: () => void
}

type WalineWindow = Window & {
  Waline?: {
    init: (options: Record<string, unknown>) => WalineInstance
  }
}

const loadWalineAssets = async () => {
  if (!document.querySelector("link[data-waline-style]")) {
    const style = document.createElement("link")
    style.rel = "stylesheet"
    style.href = WALINE_STYLE_HREF
    style.dataset.walineStyle = ""
    document.head.appendChild(style)
  }

  if (!(window as WalineWindow).Waline) {
    await import(/* @vite-ignore */ WALINE_SCRIPT_SRC)
  }
}

const renderReactions = async () => {
  const container = document.querySelector(".waline-reaction-wrapper") as WalineElement
  if (!container) return

  await loadWalineAssets()

  const waline = (window as WalineWindow).Waline?.init({
    el: container.querySelector(".waline-reaction"),
    serverURL: container.dataset.serverUrl,
    lang: container.dataset.lang,
    dark: container.dataset.dark,
    reaction: container.dataset.reaction ? JSON.parse(container.dataset.reaction) : true,
    emoji: container.dataset.emoji ? JSON.parse(container.dataset.emoji) : undefined,
    locale: container.dataset.locale ? JSON.parse(container.dataset.locale) : undefined,
    path: container.dataset.path,
    comment: false,
    pageview: true,
  })

  if (waline) {
    window.addCleanup(() => waline.destroy?.())
  }
}

document.addEventListener("nav", () => {
  renderReactions()
})
