import assert from "node:assert/strict"
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

describe("dagger clients in a test container", () => {
  it("the core client reaches the engine from the test process", async () => {
    await connection(async () => {
      const out = await core
        .container()
        .from("alpine:3.21")
        .withExec(["echo", "-n", "from the engine"])
        .stdout()

      assert.equal(out, "from the engine")
    })
  })

  it("a module function returns its value to the test process", async () => {
    await connection(async () => {
      assert.equal(await dag.fixtures().greeting("mocha"), "Hello, mocha!")
    })
  })

  it("a module service answers a container the test wires up", async () => {
    await connection(async () => {
      // Serve the module first: the generated client only runs its serve hook
      // when the module client executes the outermost query, which is not the
      // case below. See the next test.
      await dag.fixtures().id()

      assert.equal(
        await fetchBody(dag.fixtures().httpServer({ body: "pong" })),
        "pong",
      )
    })
  })

  it("known bug: a module object nested in a core query does not serve its module", async () => {
    await connection(async () => {
      await assert.rejects(
        () => fetchBody(dag.fixtures().httpServer({ body: "pong" })),
        /Cannot query field "fixtures" on type "Query"/,
      )
    })
  })
})
