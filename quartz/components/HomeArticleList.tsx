import readingTime from "reading-time"
import { Date, getDate } from "./Date"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { resolveRelative } from "../util/path"
import { classNames } from "../util/lang"
import style from "./styles/homeArticleList.scss"
import { QuartzPluginData } from "../plugins/vfile"

interface HomeArticleListConfig {
  limit?: number
}

const isContentPage = (page: QuartzPluginData) => {
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

export default ((config?: HomeArticleListConfig) => {
  const HomeArticleList: QuartzComponent = ({ allFiles, fileData, cfg, displayClass }: QuartzComponentProps) => {
    const list = allFiles
      .filter(isContentPage)
      .sort((a, b) => {
        const dateA = getDate(cfg, a)?.getTime() ?? 0
        const dateB = getDate(cfg, b)?.getTime() ?? 0
        return dateB - dateA
      })
      .slice(0, config?.limit ?? 8)

    return (
      <section class={classNames(displayClass, "home-article-list")}>
        <div class="home-article-list__header">
          <h2>最新文章</h2>
          <p>按照更新时间排序，随时掌握最新动态。</p>
        </div>
        <div class="home-article-list__items">
          {list.map((page) => {
            const words = readingTime(page.text ?? "").words
            const pageDate = page.dates ? <Date date={getDate(cfg, page)!} locale={cfg.locale} /> : null
            return (
              <article class="home-article-card">
                <div class="home-article-card__meta">
                  {pageDate}
                  {pageDate && <span aria-hidden="true"> · </span>}
                  <span>{words.toLocaleString()} 字</span>
                </div>
                <a class="home-article-card__title internal" href={resolveRelative(fileData.slug!, page.slug!)}>
                  {page.frontmatter?.title}
                </a>
              </article>
            )
          })}
        </div>
      </section>
    )
  }

  HomeArticleList.css = style
  return HomeArticleList
}) satisfies QuartzComponentConstructor<HomeArticleListConfig>
