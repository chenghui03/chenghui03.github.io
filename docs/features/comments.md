---
title: Comments
tags:
  - component
---

Quartz also has the ability to hook into various providers to enable readers to leave comments on your site.

![[giscus-example.png]]

As of today, only [Giscus](https://giscus.app/) is supported out of the box but PRs to support other providers are welcome!

## Providers

### Giscus

First, make sure that the [[setting up your GitHub repository|GitHub]] repository you are using for your Quartz meets the following requirements:

1. The **repository is [public](https://docs.github.com/en/github/administering-a-repository/managing-repository-settings/setting-repository-visibility#making-a-repository-public)**, otherwise visitors will not be able to view the discussion.
2. The **[giscus](https://github.com/apps/giscus) app is installed**, otherwise visitors will not be able to comment and react.
3. The **Discussions feature is turned on** by [enabling it for your repository](https://docs.github.com/en/github/administering-a-repository/managing-repository-settings/enabling-or-disabling-github-discussions-for-a-repository).

Then, use the [Giscus site](https://giscus.app/#repository) to figure out what your `repoId` and `categoryId` should be. Make sure you select `Announcements` for the Discussion category.

![[giscus-repo.png]]

![[giscus-discussion.png]]

After entering both your repository and selecting the discussion category, Giscus will compute some IDs that you'll need to provide back to Quartz. You won't need to manually add the script yourself as Quartz will handle that part for you but will need these values in the next step!

![[giscus-results.png]]

Quartz reads these values from environment variables at build time, so you can keep secrets out of version control. Set the following variables in your `.env` file or CI pipeline:

```bash
GISCUS_REPO="owner/repo"
GISCUS_REPO_ID="your_repo_id"
GISCUS_CATEGORY="Announcements"
GISCUS_CATEGORY_ID="your_category_id"
GISCUS_LANG="en"

# Optional tweaks
GISCUS_MAPPING="pathname"           # defaults to pathname
GISCUS_STRICT="true"                # enable strict title matching
GISCUS_REACTIONS_ENABLED="true"     # surface reactions in the thread
GISCUS_INPUT_POSITION="bottom"      # or "top"
GISCUS_LIGHT_THEME="light"          # custom giscus themes
GISCUS_DARK_THEME="dark"
GISCUS_THEME_URL="https://example.com/static/giscus"
```

With the variables set, Quartz will automatically render the Giscus widget on content pages (non-index, non-tag pages). No layout edits are required unless you want to swap providers or change ordering.

### Customization

Quartz also exposes a few of the other Giscus options as well and you can provide them the same way `repo`, `repoId`, `category`, and `categoryId` are provided.

```ts
type Options = {
  provider: "giscus"
  options: {
    repo: `${string}/${string}`
    repoId: string
    category: string
    categoryId: string

    // Url to folder with custom themes
    // defaults to 'https://${cfg.baseUrl}/static/giscus'
    themeUrl?: string

    // filename for light theme .css file
    // defaults to 'light'
    lightTheme?: string

    // filename for dark theme .css file
    // defaults to 'dark'
    darkTheme?: string

    // how to map pages -> discussions
    // defaults to 'url'
    mapping?: "url" | "title" | "og:title" | "specific" | "number" | "pathname"

    // use strict title matching
    // defaults to true
    strict?: boolean

    // whether to enable reactions for the main post
    // defaults to true
    reactionsEnabled?: boolean

    // where to put the comment input box relative to the comments
    // defaults to 'bottom'
    inputPosition?: "top" | "bottom"

    // set your preference language here
    // defaults to 'en'
    lang?: string
  }
}
```

#### Custom CSS theme

Quartz supports custom theme for Giscus. To use a custom CSS theme, place the `.css` file inside the `quartz/static` folder and set the configuration values.

For example, if you have a light theme `light-theme.css`, a dark theme `dark-theme.css`, and your Quartz site is hosted at `https://example.com/`:

```ts
afterBody: [
  Component.Comments({
    provider: 'giscus',
    options: {
      // Other options

      themeUrl: "https://example.com/static/giscus", // corresponds to quartz/static/giscus/
      lightTheme: "light-theme", // corresponds to light-theme.css in quartz/static/giscus/
      darkTheme: "dark-theme", // corresponds to dark-theme.css quartz/static/giscus/
    }
  }),
],
```

#### Conditionally display comments

Quartz can conditionally display the comment box based on a field `comments` in the frontmatter. By default, all pages will display comments, to disable it for a specific page, set `comments` to `false`.

```
---
title: Comments disabled here!
comments: false
---
```

## Likes & Reactions (Waline)

Quartz also includes an out-of-the-box reactions widget powered by [Waline](https://waline.js.org/). It renders only on content pages and will skip tag or index listings.

1. Prepare a Waline server (for example, using Vercel, Cloudflare Workers, or your own host) and note its public URL.
2. Provide the server details via environment variables before building the site:

```bash
WALINE_SERVER_URL="https://your-waline.example.com"

# Optional settings
WALINE_REACTIONS="👍,🎉,💡,❤️,🤔"   # custom reaction set
WALINE_EMOJI="https://unpkg.com/@waline/emojis@1.1.0/weibo"  # comma-separated emoji CDN links
WALINE_DARK_SELECTOR="html[data-theme='dark']"               # follow your dark selector
WALINE_LANG="en"
# Provide a JSON string for locale overrides if needed
WALINE_LOCALE='{"reactionTitle": "Did you enjoy this post?"}'
```

If you want to disable the reactions bar for a single page, add `reactions: false` in its frontmatter (similar to the `comments` flag).
