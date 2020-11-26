import { NodeCaptured, DocumentNodesMap, NodeFormated, NodeType, ElementNode, TextNode, attributes, } from "./types"
import { transformAttribute, getStylesheet, getCssRulesString, absoluteToStylesheet } from "./utils"

class NodeCaptor {
    private currentId: number
    private documentRoot: Document

    constructor(n: Document) {
        this.currentId = 1
        this.documentRoot = n
    }

    /**
     * captureNode
     */
    public captureNode(n: Node): (ElementNode | TextNode) & { originId?: number } | false {
        let originId: number | undefined
        if (((this.documentRoot as unknown) as NodeFormated)._fnode) {
            const docId = ((this.documentRoot as unknown) as NodeFormated)._fnode.originId;
            originId = docId === 1 ? undefined : docId;
        }
        switch (n.nodeType) {
            case n.ELEMENT_NODE:
                if ((n as HTMLElement).classList.contains('norecord')) {
                    return false;
                }
                // Get the tag name
                const ElementName = (n as HTMLElement).tagName

                // Get the attributes
                let attributes: attributes = {}
                const nodeAttr = Array.from((n as HTMLElement).attributes)
                for (const { name, value } of nodeAttr) {
                    attributes[name] = transformAttribute(this.documentRoot, name, value)
                }
                // Get the scrolling value
                if ((n as HTMLElement).scrollLeft) {
                    attributes._scrollLeft = (n as HTMLElement).scrollLeft
                }
                if ((n as HTMLElement).scrollTop) {
                    attributes._scrollTop = (n as HTMLElement).scrollTop
                }
                // Get the node size
                const {
                    width,
                    height,
                } = (n as HTMLElement).getBoundingClientRect()
                attributes._width = `${width}px`
                attributes._height = `${height}px`

                // Get the css rules
                // external css
                if (ElementName === 'link') {
                    const stylesheet = getStylesheet(this.documentRoot, n)

                    const cssText = getCssRulesString(
                        stylesheet as CSSStyleSheet,
                    )
                    if (cssText) {
                        delete attributes.rel
                        delete attributes.href
                        attributes._cssText = absoluteToStylesheet(
                            cssText,
                            stylesheet!.href!,
                        )
                    }
                }
                // internal css
                if (
                    ElementName === 'style' &&
                    (n as HTMLStyleElement).sheet &&
                    !(
                        (n as HTMLElement).innerText ||
                        (n as HTMLElement).textContent ||
                        ''
                    ).trim().length
                ) {
                    const cssText = getCssRulesString(
                        (n as HTMLStyleElement).sheet as CSSStyleSheet,
                    )
                    if (cssText) {
                        attributes._cssText = absoluteToStylesheet(
                            cssText,
                            location.href,
                        )
                    }
                }
                // form fields
                if (
                    ElementName === 'input' ||
                    ElementName === 'textarea' ||
                    ElementName === 'select'
                ) {
                    const value = (n as HTMLInputElement | HTMLTextAreaElement)
                        .value
                    if (
                        attributes.type !== 'radio' &&
                        attributes.type !== 'checkbox' &&
                        value
                    ) {
                        attributes.value = value
                    } else if ((n as HTMLInputElement).checked) {
                        attributes.checked = (n as HTMLInputElement).checked
                    }
                }
                if (ElementName === 'option') {
                    const selectValue = (n as HTMLOptionElement).parentElement
                    if (
                        attributes.value ===
                        (selectValue as HTMLSelectElement).value
                    ) {
                        attributes.selected = (n as HTMLOptionElement).selected
                    }
                }
                // canvas image data
                if (ElementName === 'canvas') {
                    attributes._dataURL = (n as HTMLCanvasElement).toDataURL()
                }
                // media elements
                if (ElementName === 'audio' || ElementName === 'video') {
                    attributes._mediaState = (n as HTMLMediaElement).paused
                        ? 'paused'
                        : 'played'
                }
                return {
                    originId,
                    type: NodeType.Element,
                    ElementName,
                    attributes,
                    childNodes: [],
                }
            case n.TEXT_NODE:
                // The parent node may not be a html element which has a ElementName attribute.
                // So just let it be undefined which is ok in this use case.
                const parentElementName =
                    n.parentNode && (n.parentNode as HTMLElement).tagName
                let textContent = (n as Text).textContent
                const isCSSRules = parentElementName === 'STYLE' ? true : undefined
                if (isCSSRules && textContent) {
                    textContent = absoluteToStylesheet(
                        textContent,
                        location.href,
                    )
                }
                if (parentElementName === 'SCRIPT') {
                    textContent = 'SCRIPT_PLACEHOLDER'
                }
                return {
                    originId,
                    type: NodeType.Text,
                    textContent: textContent || '',
                    isCSSRules,
                }
            default:
                return false
        }
    }

    /**
     * formatNode
     */
    public formatNode(currentNode: Node | NodeFormated, map: DocumentNodesMap): NodeCaptured | null {
        const _capturedNode = this.captureNode(currentNode as Node)

        if (!_capturedNode) return null

        let nodeId = 1

        if ('_fnode' in currentNode) {
            nodeId = currentNode._fnode.nodeId
        } else {
            nodeId = this.currentId++
        }

        const capturedNode = Object.assign({ nodeId }, _capturedNode)
            ; (currentNode as NodeFormated)._fnode = capturedNode

        map[nodeId] = currentNode as NodeFormated

        if (capturedNode.type === NodeType.Element) {
            for (const childNode of Array.from((currentNode as Node).childNodes)) {
                const capturedChildNode = this.formatNode(childNode, map)
                if (capturedChildNode) {
                    capturedNode.childNodes.push(capturedChildNode)
                }
            }
        }

        return capturedNode
    }

    /**
     * capture
     */
    public capture(): [NodeCaptured | null, DocumentNodesMap] {
        const DocumentNodesMap: DocumentNodesMap = {}
        return [this.formatNode(this.documentRoot, DocumentNodesMap),
            DocumentNodesMap]
    }
}