import { PageLayout, SharedLayout } from "./quartz/cfg"
import { QuartzComponentProps } from "./quartz/components/types"
import * as Component from "./quartz/components"

const isContentPage = (page: QuartzComponentProps) => {
  const slug = page.fileData.slug ?? ""
  return !(slug === "index" || slug.startsWith("tags/") || slug.endsWith("/index"))
}

const toBool = (value: string | undefined, fallback: boolean) => {
  if (typeof value === "undefined") return fallback
  return ["1", "true", "yes"].includes(value.toLowerCase())
}

const toList = (value: string | undefined) =>
  value
    ?.split(",")
    .map((item) => item.trim())
    .filter(Boolean)

const safeJson = <T,>(value: string | undefined): T | undefined => {
  if (!value) return undefined
  try {
    return JSON.parse(value) as T
  } catch (error) {
    console.warn("Failed to parse JSON from configuration", error)
    return undefined
  }
}

const commentsOptions = {
  provider: "giscus" as const,
  options: {
    repo: (process.env.GISCUS_REPO ?? "chenghui03/chenghui03.github.io") as `${string}/${string}`,
    repoId: process.env.GISCUS_REPO_ID ?? "R_kgDOQCZQLg",
    category: process.env.GISCUS_CATEGORY ?? "General",
    categoryId: process.env.GISCUS_CATEGORY_ID ?? "DIC_kwDOQCZQLs4Czfik",
    mapping: (process.env.GISCUS_MAPPING as
      | "url"
      | "title"
      | "og:title"
      | "specific"
      | "number"
      | "pathname") ?? "pathname",
    strict: toBool(process.env.GISCUS_STRICT, true),
    reactionsEnabled: toBool(process.env.GISCUS_REACTIONS_ENABLED, true),
    inputPosition: (process.env.GISCUS_INPUT_POSITION as "top" | "bottom" | undefined) ?? "bottom",
    lightTheme: process.env.GISCUS_LIGHT_THEME,
    darkTheme: process.env.GISCUS_DARK_THEME,
    themeUrl: process.env.GISCUS_THEME_URL,
    lang: process.env.GISCUS_LANG ?? "en",
  },
}

const reactionsOptions = {
  provider: "waline" as const,
  options: {
    serverURL:
      process.env.WALINE_SERVER_URL ?? "https://waline-test-gw4hzruyr-chenghui03s-projects.vercel.app/",
    reaction: toList(process.env.WALINE_REACTIONS),
    emoji: toList(process.env.WALINE_EMOJI),
    locale: safeJson<Record<string, unknown>>(process.env.WALINE_LOCALE),
    dark: process.env.WALINE_DARK_SELECTOR ?? "html[data-theme='dark']",
    lang: process.env.WALINE_LANG ?? "en",
  },
}

// components shared across all pages
export const sharedPageComponents: SharedLayout = {
  head: Component.Head(),
  header: [],
  afterBody: [
    Component.ConditionalRender({
      component: Component.Reactions(reactionsOptions),
      condition: isContentPage,
    }),
    Component.ConditionalRender({
      component: Component.Comments(commentsOptions),
      condition: isContentPage,
    }),
  ],
  footer: Component.Footer({
    links: {
      GitHub: "https://github.com/jackyzha0/quartz",
      "Discord Community": "https://discord.gg/cRFFHYye7t",
    },
  }),
}

// components for pages that display a single page (e.g. a single note)
export const defaultContentPageLayout: PageLayout = {
  beforeBody: [
    Component.ConditionalRender({
      component: Component.Breadcrumbs(),
      condition: (page) => page.fileData.slug !== "index",
    }),
    Component.ArticleTitle(),
    Component.ContentMeta(),
    Component.TagList(),
    Component.ConditionalRender({
      component: Component.HomeStatsCard(),
      condition: (page) => page.fileData.slug === "index",
    }),
    Component.ConditionalRender({
      component: Component.HomeArticleList({ limit: 9 }),
      condition: (page) => page.fileData.slug === "index",
    }),
  ],
  left: [
    Component.PageTitle(),
    Component.MobileOnly(Component.Spacer()),
    Component.Flex({
      components: [
        {
          Component: Component.Search(),
          grow: true,
        },
        { Component: Component.Darkmode() },
        { Component: Component.ReaderMode() },
      ],
    }),
    Component.Explorer(),
  ],
  right: [
    Component.Graph(),
    Component.DesktopOnly(Component.TableOfContents()),
    Component.Backlinks(),
  ],
}

// components for pages that display lists of pages  (e.g. tags or folders)
export const defaultListPageLayout: PageLayout = {
  beforeBody: [Component.Breadcrumbs(), Component.ArticleTitle(), Component.ContentMeta()],
  left: [
    Component.PageTitle(),
    Component.MobileOnly(Component.Spacer()),
    Component.Flex({
      components: [
        {
          Component: Component.Search(),
          grow: true,
        },
        { Component: Component.Darkmode() },
      ],
    }),
    Component.Explorer(),
  ],
  right: [],
}
