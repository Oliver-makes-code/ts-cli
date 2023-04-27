export class Node {
    name?: JSX.Key
    children: (Node|string)[]
    params: Record<string, any>|null

    constructor(children: (Node|string)[], params: Record<string,any>|null, name?: JSX.Key) {
        this.children = children
        this.name = name
        this.params = params
    }
}

export function createElement(t: ((t: {children: Node[]}) => Node)|JSX.Key|undefined, params: Record<string, any>|null, ...children: any[]): Node {
    function collapseChildren(children: any[]): any[] {
        let newChildren = []
        let currStr = ""
        for (let child of children) {
            if (child instanceof Node) {
                newChildren.push(currStr)
                currStr = ""
                newChildren.push(child)
            } else if (Array.isArray(child)) {
                newChildren.push(currStr)
                currStr = ""
                newChildren.push(...collapseChildren(child))
            } else if (typeof child == "object") {
                currStr += JSON.stringify(child)
            } else {
                currStr += child
            }
        }
    
        if (currStr != "") newChildren.push(currStr)
        return newChildren
    }

    

    children = collapseChildren(children)

    if (typeof t == "string") return new Node(children, params, t)

    if (t) return t({ children })

    return new Node(children, params)
}

export function print(node: Node) {
    console.log(getString(node))
}

export function getString(node: Node, style: JSX.Key[] = []): string {
    let out = ""

    const FG_COLOR: JSX.Key[] = [
        "black",
        "red",
        "green",
        "yellow",
        "blue",
        "magenta",
        "cyan",
        "white",
        "default"
    ]
    const BG_COLOR: JSX.Key[] = [
        "bg-black",
        "bg-red",
        "bg-green",
        "bg-yellow",
        "bg-blue",
        "bg-magenta",
        "bg-cyan",
        "bg-white",
        "bg-default"
    ]

    function getStyle(style: JSX.Key): number {
        switch (style) {
            case "black": return 30
            case "red": return 31
            case "green": return 32
            case "yellow": return 33
            case "blue": return 34
            case "magenta": return 35
            case "cyan": return 36
            case "white": return 37
            case "default": return 39

            case "bg-black": return 40
            case "bg-red": return 41
            case "bg-green": return 42
            case "bg-yellow": return 43
            case "bg-blue": return 44
            case "bg-magenta": return 45
            case "bg-cyan": return 46
            case "bg-white": return 47
            case "bg-default": return 49

            case "bold": return 1
            case "italic": return 3
            case "underline": return 4
            case "strikethrough": return 9

            default: return 0
        }
    }

    function getStyleString() {
        let styles: JSX.Key[] = []
        for (let curr of style) {
            if (FG_COLOR.indexOf(curr) != -1) {
                styles = styles.filter(key => FG_COLOR.indexOf(key) == -1)
                styles.push(curr)
            } else if (BG_COLOR.indexOf(curr) != -1) {
                styles = styles.filter(key => BG_COLOR.indexOf(key) == -1)
                styles.push(curr)
            } else if (styles.indexOf(curr) != -1) {
                styles = styles.filter(key => styles.indexOf(curr) == -1)
                styles.push(curr)
            } else if (curr == "reset") {
                styles = []
            } else {
                styles.push(curr)
            }
        }
        return styles.map(getStyle).join(";")
    }

    function printStyle() {
        out += `\u001b[0;${getStyleString()}m`
    }

    function appendStyle(newStyle: JSX.Key) {
        style.push(newStyle)
        printStyle()
    }

    function removeStyle() {
        style.pop()
        printStyle()
    }

    if (node.name == "br") return "\n"
    if (node.name == "tab") return " ".repeat((node.params ?? {})["idt"] ?? 1)

    if (node.name) appendStyle(node.name)

    for (let child of node.children) {
        if (typeof child == "string")
            out += child
        else out += getString(child, style)
    }

    if (node.name) removeStyle()

    return out
}

declare global {
    namespace JSX {
        type Color = "black"|"red"|"green"|"yellow"|"blue"|"magenta"|"cyan"|"white"|"default"
        type Key = "reset"|"bold"|"italic"|"underline"|"strikethrough"|Color|`bg-${Color}`|"br"|"tab"

        type Elem = { [key in Key]: {} }

        interface IntrinsicElements extends Elem {
            tab: {
                idt?: number
            }
        }
    }
}
