import { dag, Service, object, func } from "@dagger.io/dagger"

@object()
export class Fixtures {
  @func()
  greeting(name: string): string {
    return `Hello, ${name}!`
  }

  @func()
  httpServer(body = "pong"): Service {
    return dag
      .container()
      .from("nginx:1.27-alpine")
      .withNewFile("/usr/share/nginx/html/index.html", body)
      .withExposedPort(80)
      .asService()
  }
}
