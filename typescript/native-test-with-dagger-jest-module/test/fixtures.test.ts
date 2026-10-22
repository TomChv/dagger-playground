import { expect, test } from "@jest/globals"
import { connection, dag as core, Service } from "@dagger.io/dagger"
import { dag } from "@dagger.io/fixtures"

function fetchBody(svc: Service): Promise<string> {
  return core
    .container()
    .from("alpine:3.21")
    .withServiceBinding("fixture", svc)
    .withExec(["wget", "-qO-", "http://fixture"])
    .stdout()
}

test("the core client reaches the engine from the test process", async () => {
  await connection(async () => {
    const out = await core
      .container()
      .from("alpine:3.21")
      .withExec(["echo", "-n", "from the engine"])
      .stdout()

    expect(out).toBe("from the engine")
  })
})

test("a module function returns its value to the test process", async () => {
  await connection(async () => {
    expect(await dag.fixtures().greeting("jest")).toBe("Hello, jest!")
  })
})

test("a module service answers a container the test wires up", async () => {
  await connection(async () => {
    // Serve the module first: the generated client only runs its serve hook
    // when the module client executes the outermost query, which is not the
    // case below. See the next test.
    await dag.fixtures().id()

    expect(await fetchBody(dag.fixtures().httpServer({ body: "pong" }))).toBe(
      "pong",
    )
  })
})

test("known bug: a module object nested in a core query does not serve its module", async () => {
  await connection(async () => {
    await expect(
      fetchBody(dag.fixtures().httpServer({ body: "pong" })),
    ).rejects.toThrow(/Cannot query field "fixtures" on type "Query"/)
  })
})
