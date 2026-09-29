import { render } from "preact"
import { describe, expect, it } from "vitest"
import { Badge } from "./badge"

// A fresh container per render: Preact keeps its vdom on the container, so
// reusing one across tests would diff against the previous tree.
function mount(clicks: number, expired?: boolean): HTMLElement {
  const container = document.createElement("div")
  document.body.append(container)
  render(<Badge clicks={clicks} expired={expired} />, container)

  const badge = container.querySelector<HTMLElement>(".badge")
  if (badge === null) {
    throw new Error("Badge did not render")
  }

  return badge
}

describe("<Badge>", () => {
  it("renders the label as its text", () => {
    expect(mount(3).textContent).toBe("3 clicks")
  })

  it("puts the tone in the class list", () => {
    expect(mount(0).className).toBe("badge badge--muted")
    expect(mount(4200).className).toBe("badge badge--hot")
  })

  it("marks an expired link whatever its clicks", () => {
    const badge = mount(4200, true)

    expect(badge.className).toContain("badge--expired")
    expect(badge.textContent).toBe("4.2k clicks")
  })

  it("exposes the raw count as a data attribute", () => {
    expect(mount(7).dataset.clicks).toBe("7")
  })
})
