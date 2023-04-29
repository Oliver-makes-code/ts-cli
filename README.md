# TS CLI
A simple, extendable CLI tool for TypeScript/Deno!

## Usage

- Create an instance of the CLI class

```ts
const cli = new CLI()
```

- Register commands

```ts
cli.register({
    args: [literal("owo"), named(Builtin.STRING, "uwu")],
    call(uwu: string) {
        console.log(uwu)
    },
    description: "nya!"
})
```

- Execute the CLI

```ts
cli.execute()
```
