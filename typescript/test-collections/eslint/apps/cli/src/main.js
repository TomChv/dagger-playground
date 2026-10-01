const USAGE = "guardrail <command> [options]";

export function parse(argv) {
  const [command, ...rest] = argv;
  if (command === undefined) {
    return { command: "help", args: [], usage: USAGE };
  }
  return { command, args: rest, usage: USAGE };
}
