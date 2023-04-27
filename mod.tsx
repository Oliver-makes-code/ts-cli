import * as React from "./fakeReact.tsx"
import { print, getString } from "./fakeReact.tsx"

export type ArgData<T> = {
    name?: string,
    type: string|string[],
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
        type: "string",
        parse(iter: ArgIter): string|undefined {
            return iter.next()
        }
    } as ArgData<string>,
    NUMBER: {
        type: "number",
        parse(iter: ArgIter): number|undefined {
            let numStr = iter.next()
            if (!numStr) return
            let num = parseInt(numStr)
            if (isNaN(num)) return
            return num
        }
    } as ArgData<number>,
    BOOLEAN: {
        type: "boolean",
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
        type: type.type,
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
    
    let type = []
    if (Array.isArray(type1.type))
        type.push(...type1.type)
    else type.push(type1.type)
    if (Array.isArray(type2.type))
        type.push(...type2.type)
    else type.push(type2.type)
    return {
        type,
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
        type: val,
        parse(args: ArgIter): boolean|undefined {
            let next = args.next()
            if (!next) return 
            return next.toLocaleLowerCase() == val.toLocaleLowerCase() ? true : undefined
        },
        literal: true
    }
}

export function named<T>(arg: ArgData<T>, name: string): ArgData<T> {
    return {
        name,
        ...arg
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

        this.printHelp()
    }

    printHelp() {
        let commands: React.Node[] = []

        function buildParamArr(names: string[]): React.Node[] {
            let out: React.Node[] = []
            for (let name of names) {
                out.push(<> { name } </>)
                out.push(<blue> | </blue>)
            }
            out.pop()
            return out
        }

        for (let arg of this.args) {
            let params: React.Node[] = []
            for (let param of arg.args) {
                let name = param.name ? <cyan>{param.name}<blue>: </blue></cyan> : <></>
                
                let type = <green>
                    { name }
                    {
                        typeof param.type == "string"
                            ? param.type
                            : buildParamArr(param.type)
                    }
                </green>
                params.push(<>
                    {
                        param.literal
                            ? <blue>
                                { param.type }
                            </blue>
                            : <blue>
                                {"<"}
                                <green>
                                    { type }
                                </green>
                                {">"}
                            </blue>
                    }
                    {
                        param.optional
                            ? <red>?</red>
                            : ""
                    }
                    <tab/>
                </>)
            }
            commands.push(<>
                <tab idt={2}/>
                - { params }
                <br/>
                {
                    arg.description
                        ? <green>
                            <tab idt={6}/>
                            {arg.description}
                        </green>
                        : "" 
                }
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
                                    <tab/>
                                    for
                                    <tab/>
                                    <blue>
                                        { this.appName }
                                    </blue>
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
                            { this.description }
                        </blue>
                        : ""
                }
                <br/><br/>
                { commands }
            </>
        )
    }

    private tryExecute(arg: Argument<any[]>): boolean {
        let iter = new ArgIter()
        let input: any[] = []
        for (let type of arg.args) {
            let parsed = type.parse(iter)
            if (parsed === undefined)
                return false
            if (!type.literal) input.push(parsed)
        }
        arg.call(...input)
        return true
    }
}
