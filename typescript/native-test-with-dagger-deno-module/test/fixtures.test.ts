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

// One session for the whole file, in steps: on Deno a second connection() dies
// with ERR_STREAM_PREMATURE_CLOSE, because provisioning the second `dagger
// session` subprocess trips execa under Deno's node compatibility. The steps
// also have to run in this order — serving the module is memoized per
// connection, so the step that expects an unserved module comes first.
Deno.test("dagger clients in a test container", async (t) => {
  await connection(async () => {
    await t.step("the core client reaches the engine from the test process", async () => {
      const out = await core
        .container()
        .from("alpine:3.21")
        .withExec(["echo", "-n", "from the engine"])
        .stdout()

      assert.equal(out, "from the engine")
    })

    await t.step("known bug: a module object nested in a core query does not serve its module", async () => {
      await assert.rejects(
        () => fetchBody(dag.fixtures().httpServer({ body: "pong" })),
        /Cannot query field "fixtures" on type "Query"/,
      )
    })

    await t.step("a module function returns its value to the test process", async () => {
      assert.equal(await dag.fixtures().greeting("deno"), "Hello, deno!")
    })

    await t.step("a module service answers a container the test wires up", async () => {
      assert.equal(
        await fetchBody(dag.fixtures().httpServer({ body: "pong" })),
        "pong",
      )
    })
  })
})
