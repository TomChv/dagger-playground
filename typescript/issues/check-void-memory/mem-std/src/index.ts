import { readFileSync } from "node:fs"

import { dag, object, func, Container } from "@dagger.io/dagger"

const SLEEP = 30

function work(tag: string): Container {
  return dag
    .container()
    .from("alpine:3.20")
    .withExec(["sh", "-c", `echo running ${tag}; sleep ${SLEEP}`])
}

const mb = (n: number) => Math.round(n / 2 ** 20)

function snap(label: string): string {
  const m = process.memoryUsage()
  // VmHWM is the peak RSS the kernel has seen for this process, which is what
  // the engine's cgroup is charged for; process.memoryUsage() only sees now.
  let hwm = "n/a"
  try {
    hwm =
      readFileSync("/proc/self/status", "utf8")
        .split("\n")
        .find((l) => l.startsWith("VmHWM:"))
        ?.replace(/\s+/g, " ") ?? "n/a"
  } catch {
    /* not linux */
  }
  return `${label}: up=${process.uptime().toFixed(1)}s rss=${mb(m.rss)}MiB heap=${mb(m.heapUsed)}MiB ext=${mb(m.external)}MiB ${hwm}`
}

@object()
export class MemStd {
  // Ctor-less classes are omitted from the dang manifest's main-object marker,
  // which makes the module invisible (entrypoint_dang.go:233).
  constructor() {}

  /**
   * What a v1 check has to do: await the container, so this runtime process
   * stays resident for the whole exec. Returns the memory it held while waiting.
   */
  @func()
  async voidStyle(tag: string): Promise<string> {
    const out = [snap("entered")]
    const t = setInterval(() => out.push(snap("awaiting sync")), 10000)
    try {
      await work(tag).sync()
    } finally {
      clearInterval(t)
    }
    out.push(snap("sync returned"))
    return out.join("\n")
  }

  /**
   * What a pre-v1 check did: hand the Container back and let the engine sync
   * it, so this runtime process exits before the exec starts. Sync it with
   * `container-style --tag=x sync` to make the engine run it.
   */
  @func()
  containerStyle(tag: string): Container {
    return work(tag)
  }

  /** The same measurement as voidStyle, taken at the point containerStyle returns. */
  @func()
  containerStyleCost(tag: string): string {
    work(tag)
    return snap("returning container")
  }

  /** Which SDK bundle this runtime actually loaded, and whether it pulls tsc. */
  @func()
  whichSdk(): string {
    const resolved = import.meta.resolve("@dagger.io/dagger")
    const path = resolved.replace(/^file:\/\//, "")
    const v = process.versions as Record<string, string>
    const out = [
      `argv0=${process.argv0} bun=${v.bun ?? "no"} node=${v.node} argv=${process.argv.join(" ")}`,
      `resolved=${path}`,
    ]
    for (const f of [path, path.replace(/index\.(ts|js)$/, "core.js")]) {
      try {
        const src = readFileSync(f, "utf8")
        const hits = src.match(/from "typescript"/g)?.length ?? 0
        out.push(`${f}: ${src.length} bytes, ${hits} typescript imports`)
      } catch (e) {
        out.push(`${f}: ${(e as Error).message}`)
      }
    }
    return out.join("\n")
  }
}
