import { object, func } from "@dagger.io/dagger"

@object()
export class HelloWorld {    
  @func()
  helloWorld(): string {
    return "Hello World!"
  }
}
