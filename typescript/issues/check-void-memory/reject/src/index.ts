import { dag, object, check, func, Container } from "@dagger.io/dagger"

@object()
export class Reject {
  /** Accepted up to v1.0.0-beta.14, rejected from v1.0.0-beta.15 on. */
  @check()
  lint(): Container {
    return dag.container().from("alpine:3.20").withExec(["true"])
  }

  @func()
  marker(): string {
    return "ok"
  }
}
