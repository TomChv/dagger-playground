import { dag, Secret, Directory, Container, object, func } from "@dagger.io/dagger"

@object()
export class Test {
  public readonly source: Directory;
  public readonly token: Secret | undefined;

  constructor(source: Directory, token: Secret | undefined) {
    this.source = source;
    this.token = token;
  }

  @func() hello(): string {
    return "hi";
  }
}
