import { findRawLink } from "./dom"

export type GitHubFileContext = {
  owner: string
  repo: string
  ref?: string
  path?: string
  viewType: "blob" | "blame" | "compare" | "repo"
  baseRef?: string
  headRef?: string
}

const parsePathSegments = (value: string) =>
  value
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean)

const getBreadcrumbPath = (doc: Document, owner: string, repo: string): string | null => {
  const nav =
    doc.querySelector<HTMLElement>("nav[aria-label='Breadcrumb']") ||
    doc.querySelector<HTMLElement>("nav[aria-label='Breadcrumbs']")

  if (!nav) return null

  const items = Array.from(nav.querySelectorAll<HTMLAnchorElement>("a"))
    .map((item) => item.textContent?.trim())
    .filter(Boolean) as string[]

  if (!items.length) return null

  if (items[0] === owner && items[1] === repo) {
    return items.slice(2).join("/")
  }

  return items.join("/")
}

const getPathAndRefFromRaw = (doc: Document) => {
  const rawLink = findRawLink(doc)
  if (!rawLink?.href) return null

  try {
    const rawUrl = new URL(rawLink.href)
    const parts = parsePathSegments(rawUrl.pathname)
    if (parts.length < 3) return null

    const [owner, repo, ...rest] = parts
    const ref = rest[0]
    const path = rest.slice(1).join("/")
    return { owner, repo, ref, path }
  } catch {
    return null
  }
}

const parseCompareUrl = (owner: string, repo: string, remaining: string[]): GitHubFileContext | null => {
  const compareString = remaining.join("/")
  const match = compareString.match(/^(.+?)\.\.\.(.+)$/)

  if (match) {
    return {
      owner,
      repo,
      viewType: "compare",
      baseRef: match[1],
      headRef: match[2]
    }
  }

  return {
    owner,
    repo,
    viewType: "compare",
    baseRef: remaining[0],
    headRef: remaining[1]
  }
}

export const parseGitHubFileContext = (doc: Document, href: string): GitHubFileContext | null => {
  let url: URL
  try {
    url = new URL(href)
  } catch {
    return null
  }

  const parts = parsePathSegments(url.pathname)
  if (parts.length < 2) return null

  const [owner, repo] = parts
  const viewType = parts[2]

  // Handle compare page
  if (viewType === "compare" && parts.length >= 4) {
    return parseCompareUrl(owner, repo, parts.slice(3))
  }

  // Handle blob/blame (file) pages
  if ((viewType === "blob" || viewType === "blame") && parts.length >= 4) {
    const raw = getPathAndRefFromRaw(doc)
    if (raw && raw.owner === owner && raw.repo === repo) {
      return {
        owner,
        repo,
        ref: raw.ref,
        path: raw.path,
        viewType
      }
    }

    const remaining = parts.slice(3)
    const breadcrumbPath = getBreadcrumbPath(doc, owner, repo)
    if (breadcrumbPath) {
      const breadcrumbSegments = parsePathSegments(breadcrumbPath)
      if (breadcrumbSegments.length <= remaining.length) {
        const refSegments = remaining.slice(0, remaining.length - breadcrumbSegments.length)
        const ref = refSegments.join("/")
        return {
          owner,
          repo,
          ref: ref || undefined,
          path: breadcrumbSegments.join("/"),
          viewType
        }
      }
    }

    const ref = remaining[0]
    const path = remaining.slice(1).join("/")

    return {
      owner,
      repo,
      ref,
      path: path || undefined,
      viewType
    }
  }

  // Handle tree page or repo root
  if (viewType === "tree" && parts.length >= 4) {
    const ref = parts.slice(3).join("/")
    return {
      owner,
      repo,
      ref,
      viewType: "repo"
    }
  }

  // Default: repo page without specific file
  return {
    owner,
    repo,
    viewType: "repo"
  }
}
