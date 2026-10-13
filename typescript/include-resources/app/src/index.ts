import { readdirSync, readFileSync } from "node:fs"

import { func, object } from "@dagger.io/dagger"

// Both come from ../shared, outside this module's directory. `greet` is called
// at run time; `Name` is used in a signature, so the generator's scan has to
// resolve the file too.
import { greet, Name } from "../../shared/greet.js"

@object()
export class IncludeApp {
  /**
   * Calls a function imported from ../shared, which in turn calls one in
   * ../deeper. The trailing `!!` comes from that second directory, which
   * nothing here names.
   */
  @func()
  greet(name: Name = "world"): string {
    return greet(name)
  }

  /**
   * Reads ../shared/version.txt at call time, relative to the module directory.
   *
   * This is the one that shows the cache key: edit the file, call again, and the
   * answer has to change. The default cache policy — no @cache decorator here —
   * is what makes it interesting.
   */
  @func()
  version(): string {
    return readFileSync("../shared/version.txt", "utf8").trim()
  }

  /**
   * What sits beside the module inside the mounted context.
   *
   * `app`, `deeper` and `shared` and nothing else: the container gets the
   * module directory and what its imports reached, not the repository.
   */
  @func()
  siblings(): string {
    return readdirSync("..").sort().join("\n")
  }
}
