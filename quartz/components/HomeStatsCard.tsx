import readingTime from "reading-time"
import { Date, getDate } from "./Date"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { resolveRelative } from "../util/path"
import { classNames } from "../util/lang"
import { QuartzPluginData } from "../plugins/vfile"
import style from "./styles/homeStats.scss"

function isPublishablePost(page: QuartzPluginData) {
  const slug = page.slug ?? ""
  const publishFlag = page.frontmatter?.publish
  const explicitlyHidden = publishFlag === false || publishFlag === "false"
  return (
    !explicitlyHidden &&
    slug !== "index" &&
    !slug.startsWith("tags/") &&
    !slug.endsWith("/index") &&
    !slug.startsWith("attachments") &&
    !!page.frontmatter?.title
  )
}

export interface HomeStatsConfig {
  highlightFirst?: boolean
}

export default ((userOpts?: HomeStatsConfig) => {
  const HomeStatsCard: QuartzComponent = ({ allFiles, fileData, cfg, displayClass }: QuartzComponentProps) => {
    const posts = allFiles.filter(isPublishablePost)

    const totalArticles = posts.length
    const totalWords = posts.reduce((acc, page) => acc + readingTime(page.text ?? "").words, 0)

    let firstArticle: QuartzPluginData | undefined
    if (userOpts?.highlightFirst !== false && posts.length > 0) {
      firstArticle = posts
        .slice()
        .sort((a, b) => {
          const dateA = getDate(cfg, a)?.getTime() ?? Number.POSITIVE_INFINITY
          const dateB = getDate(cfg, b)?.getTime() ?? Number.POSITIVE_INFINITY
          return dateA - dateB
        })[0]
    }

    return (
      <section class={classNames(displayClass, "home-stats-card")}> 
        <div class="home-stats-card__header">
          <h2>主页速览</h2>
          <p>快速了解本站进度，找到你的下一篇阅读。</p>
        </div>
        <div class="home-stats-card__grid">
          <div class="stat">
            <p class="label">文章总数</p>
            <p class="value">{totalArticles}</p>
          </div>
          <div class="stat">
            <p class="label">总字数</p>
            <p class="value">{totalWords.toLocaleString()}</p>
          </div>
        </div>
        {firstArticle && (
          <div class="home-stats-card__first">
            <div class="label">首篇文章</div>
            <a
              class="title internal"
              href={resolveRelative(fileData.slug!, firstArticle.slug!)}
            >
              {firstArticle.frontmatter?.title}
            </a>
            {firstArticle.dates && (
              <div class="meta">
                <Date date={getDate(cfg, firstArticle)!} locale={cfg.locale} />
              </div>
            )}
          </div>
        )}
      </section>
    )
  }

  HomeStatsCard.css = style

  return HomeStatsCard
}) satisfies QuartzComponentConstructor<HomeStatsConfig>
