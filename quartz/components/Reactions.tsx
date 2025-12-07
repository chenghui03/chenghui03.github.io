import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"
// @ts-ignore
import script from "./scripts/reactions.inline"
import style from "./styles/reactions.scss"

type WalineReactions = string[]

type Options = {
  provider: "waline"
  options: {
    serverURL: string
    dark?: string
    lang?: string
    reaction?: WalineReactions
    emoji?: string[]
    locale?: Record<string, unknown>
  }
}

const defaultReactions: WalineReactions = ["👍", "🎉", "💡", "❤️", "🤔"]

export default ((opts: Options) => {
  const Reactions: QuartzComponent = ({ displayClass, fileData, cfg }: QuartzComponentProps) => {
    const slug = fileData.slug ?? ""
    const isIndexPage = slug === "index" || slug.endsWith("/index") || slug.startsWith("tags/")
    const disableReactions: boolean =
      typeof fileData.frontmatter?.reactions !== "undefined" &&
      (!fileData.frontmatter?.reactions || fileData.frontmatter?.reactions === "false")

    if (disableReactions || isIndexPage || !opts.options.serverURL) {
      return <></>
    }

    const lang = fileData.frontmatter?.lang ?? opts.options.lang ?? cfg.locale ?? "en"
    const reactionChoices = opts.options.reaction ?? defaultReactions

    return (
      <div class={classNames(displayClass, "reactions")}>
        <div
          class="waline-reaction-wrapper"
          data-server-url={opts.options.serverURL}
          data-lang={lang}
          data-path={`/${slug}`}
          data-dark={opts.options.dark ?? "html[data-theme='dark']"}
          data-reaction={JSON.stringify(reactionChoices)}
          data-emoji={opts.options.emoji ? JSON.stringify(opts.options.emoji) : undefined}
          data-locale={opts.options.locale ? JSON.stringify(opts.options.locale) : undefined}
        >
          <div class="waline-reaction"></div>
        </div>
      </div>
    )
  }

  Reactions.css = style
  Reactions.afterDOMLoaded = script

  return Reactions
}) satisfies QuartzComponentConstructor<Options>
