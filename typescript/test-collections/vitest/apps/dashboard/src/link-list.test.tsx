import { render } from "preact"
import { describe, expect, it } from "vitest"
import { LinkList, type LinkRow } from "./link-list"

const rows: LinkRow[] = [
  { slug: "abcd", target: "https://example.com/one", clicks: 0 },
  { slug: "efgh", target: "https://example.com/two", clicks: 1200 },
  { slug: "ijkl", target: "https://example.com/three", clicks: 4, expired: true },
]

// A fresh container per render: Preact keeps its vdom on the container, so
// reusing one across tests would diff against the previous tree.
function mount(list: readonly LinkRow[]): HTMLElement {
  const container = document.createElement("div")
  document.body.append(container)
  render(<LinkList rows={list} />, container)

  return container
}

describe("<LinkList>", () => {
  it("renders one row per link", () => {
    expect(mount(rows).querySelectorAll(".links__row")).toHaveLength(3)
  })

  it("links each row to its slug", () => {
    const hrefs = [...mount(rows).querySelectorAll<HTMLAnchorElement>(".links__row a")].map(
      (anchor) => anchor.getAttribute("href"),
    )

    expect(hrefs).toEqual(["/abcd", "/efgh", "/ijkl"])
  })

  it("gives every row its own badge tone", () => {
    const tones = [...mount(rows).querySelectorAll(".badge")].map((badge) =>
      badge.className.replace("badge badge--", ""),
    )

    expect(tones).toEqual(["muted", "hot", "expired"])
  })

  it("falls back to an empty state", () => {
    const container = mount([])

    expect(container.querySelector(".empty")?.textContent).toBe("No links yet")
    expect(container.querySelector(".links")).toBeNull()
  })
})
