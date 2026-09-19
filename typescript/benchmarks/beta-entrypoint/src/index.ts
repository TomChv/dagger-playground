import { object, func } from "@dagger.io/dagger"

@object()
export class HelloWorld {
  @func()
  hello(): string {
    return "hello"
  }
}
