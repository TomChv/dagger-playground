const { attributes, tag } = require("../helpers/render")

describe("attributes", () => {
  it("renders name=value pairs", () => {
    expect(attributes({ class: "row", id: "billing" })).toBe('class="row" id="billing"')
  })

  it("renders a true value as a bare attribute", () => {
    expect(attributes({ hidden: true })).toBe("hidden")
  })

  it("drops false and undefined values", () => {
    expect(attributes({ hidden: false, title: undefined, class: "row" })).toBe('class="row"')
  })

  it("is empty for no pairs", () => {
    expect(attributes({})).toBe("")
  })
})

describe("tag", () => {
  it("wraps children", () => {
    expect(tag("td", { class: "n" }, "42")).toBe('<td class="n">42</td>')
  })

  it("leaves no stray space when there are no attributes", () => {
    expect(tag("td", {}, "42")).toBe("<td>42</td>")
  })

  it("renders empty children", () => {
    expect(tag("td", {})).toBe("<td></td>")
  })
})
