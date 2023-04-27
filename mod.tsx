import * as React from "./fakeReact.tsx"
import { print, getString } from "./fakeReact.tsx"

export type ArgData<T> = {
    name: string|string[],
    parse(iter: ArgIter): T|undefined,
    literal?: boolean,
    optional?: boolean
}

export type Argument<T extends any[]> = {
    args: ArgData<any>[],
    call(...args: T): void,
    description?: string
}

const error = {
    or: {
        literal(val: any) {
            return new Error(getString(
                <red>
                    Cannot or with a literal argument.
                    <br/>
                    {val}
                </red>
            ))
        },
        optional(val: any) {
            return new Error(getString(
                <red>
                    Cannot or with an optional argument, optional must be the last method.\n
                    <br/>
                    {val}
                </red>
            ))
        }
    }
}

export const Builtin = {
    STRING: {
        name: "string",
        parse(iter: ArgIter): string|undefined {
            return iter.next()
        }
    } as ArgData<string>,
    NUMBER: {
        name: "number",
        parse(iter: ArgIter): number|undefined {
            let numStr = iter.next()
            if (!numStr) return
            let num = parseInt(numStr)
            if (isNaN(num)) return
            return num
        }
    } as ArgData<number>,
    BOOLEAN: {
        name: "boolean",
        parse(iter: ArgIter): boolean|undefined {
            let str = iter.next()
            if (!str) return
            if (str.toLocaleLowerCase() == "true") return true
            if (str.toLocaleLowerCase() == "false") return false
            return
        }
    } as ArgData<boolean>
} as const

export class ArgIter {
    args: string[]
    idx = -1

    constructor(args: string[] = Deno.args) {
        this.args = args
    }

    next(): string|undefined {
        this.idx++
        if (this.idx >= this.args.length) {
            this.idx = this.args.length-1
            return 
        }
        return this.args[this.idx]
    }

    last(): string|undefined {
        this.idx--
        if (this.idx < 0) {
            this.idx = 0
            return
        }
        return this.args[this.idx]
    }
}

export function optional<T>(type: ArgData<T>): ArgData<T|null> {
    return {
        name: type.name,
        parse(args: ArgIter): T|null {
            let startIdx = args.idx
            let parse = type.parse(args)
            args.idx = startIdx
            return parse ?? null
        },
        optional: true
    }
}

export function or<T1, T2>(type1: ArgData<T1>, type2: ArgData<T2>): ArgData<T1|T2> {
    if (type1.literal) 
        throw error.or.literal(type1)
    if (type2.literal) 
        throw error.or.literal(type2)

    if (type1.optional) 
        throw error.or.optional(type1)
    if (type2.optional) 
        throw error.or.optional(type1)
    
    let name = []
    if (Array.isArray(type1.name))
        name.push(...type1.name)
    else name.push(type1.name)
    if (Array.isArray(type2.name))
        name.push(...type2.name)
    else name.push(type2.name)
    return {
        name,
        parse(args: ArgIter): T1 | T2 | undefined {
            let startIdx = args.idx
            let first = type1.parse(args)
            if (first) return first
            args.idx = startIdx
            return type2.parse(args)
        }
    }
}

export function literal(val: string): ArgData<boolean> {
    return {
        name: val,
        parse(args: ArgIter): boolean {
            return args.next()?.toLocaleLowerCase() == val.toLocaleLowerCase()
        },
        literal: true
    }
}

export class CLI {
    args: Argument<any[]>[] = []
    appName?: string
    description?: string

    constructor(appName?: string, description?: string) {
        this.appName = appName
        this.description = description
    }

    register(...args: Argument<any[]>[]) {
        this.args.push(...args)
    }

    execute() {
        for (let arg of this.args) {
            if (this.tryExecute(arg)) return
        }


    }

    printHelp() {
        let commands: React.Node[] = []

        function buildParamArr(names: string[]): React.Node[] {
            let out: React.Node[] = []
            for (let name of names) {
                out.push(<>{name}</>)
                out.push(<blue>|</blue>)
            }
            out.pop()
            return out
        }

        for (let arg of this.args) {
            let params: React.Node[] = []
            for (let param of arg.args) {
                let name = <green>
                    { typeof param.name == "string"
                        ? param.name
                        : buildParamArr(param.name)
                    }
                </green>
                params.push(<>
                    {
                        param.literal
                            ? <blue>{param.name}</blue>
                            : <blue>{"<"}<green>{name}</green>{">"}</blue>
                    }
                    {
                        param.optional
                            ? <red>?</red>
                            : ""
                    }<tab/>
                </>)
            }
            commands.push(<>
                <tab idt={2}/>- {params}<br/>
                { arg.description ? <green><tab idt={6}/>{arg.description}</green> : "" }
                <br/>
            </>)
        }

        print(
            <>
                <tab idt={2}/>
                <green>
                    Usage
                        {
                            this.appName
                                ? <>
                                    <tab/>for 
                                    <blue> {this.appName}</blue>
                                </> 
                                : ""
                        }
                    :
                </green>
                {
                    this.description
                        ? <blue>
                            <br/>
                            <tab idt={4}/>
                            {this.description}
                        </blue>
                        : ""
                }
                <br/><br/>
                {commands}
            </>
        )
    }

    private tryExecute(arg: Argument<any[]>): boolean {
        let iter = new ArgIter()
        let input: any[] = []
        let success = true
        for (let type of arg.args) {
            let parsed = type.parse(iter)
            if (parsed == undefined)
                return false
            if (!type.literal) input.push(parsed)
        }
        arg.call(...input)
        return true
    }
}
