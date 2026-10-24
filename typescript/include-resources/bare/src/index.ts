import { readdirSync, readFileSync } from "node:fs"

import { func, object } from "@dagger.io/dagger"

/**
 * The control: the same reads as IncludeApp, from a module that imports
 * nothing outside its own directory.
 *
 * So nothing is derived, and this module generates cleanly — it is only at call
 * time that the files turn out not to be there. Reading a file is not what
 * derivation is for; that is a Workspace argument's job.
 */
@object()
export class Bare {
  /** Fails: ../shared is not in this module's context. */
  @func()
  version(): string {
    return readFileSync("../shared/version.txt", "utf8").trim()
  }

  /** `bare` alone — no `shared`, and nothing else of the repository either. */
  @func()
  siblings(): string {
    return readdirSync("..").sort().join("\n")
  }
}
