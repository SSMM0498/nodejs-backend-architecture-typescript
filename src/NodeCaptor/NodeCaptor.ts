import {
    NodeCaptured,
    DocumentNodesMap,
    NodeFormated,
    NodeType,
    ElementNode,
    TextNode,
    attributes,
    documentNode,
    documentTypeNode
} from "./types"
import {
    transformAttribute,
    getStylesheet,
    getCssRulesString
} from "./utils"

class NodeCaptor {
    private currentId: number       // id for the current node
    private documentRoot: Document  // the root document element

    constructor() {
        this.currentId = 0
    }

    /**
     * capture the node n
     * * retrieve the origin id
     * * get tag name and needed attributes
     * @param Node : Node to capture
     * @returns (ElementNode | TextNode) & { originId?: number } | false
     */
    public captureNode(doc: Document, n: Node): (documentNode | documentTypeNode | ElementNode | TextNode) & { originId?: number } | false {
        let originId: number | undefined;
        if (((doc as unknown) as NodeFormated)._cnode) {
            const docId = ((doc as unknown) as NodeFormated)._cnode.nodeId;
            originId = docId === 1 ? undefined : docId;
        }
    
        switch (n.nodeType) {
            case n.DOCUMENT_NODE:
                return {
                    type: NodeType.Document,
                    childNodes: [],
                    originId,
                };
            case n.DOCUMENT_TYPE_NODE:
                return {
                    type: NodeType.DocumentType,
                    name: (n as DocumentType).name,
                    publicId: (n as DocumentType).publicId,
                    systemId: (n as DocumentType).systemId,
                    originId,
                };
            case n.ELEMENT_NODE:
                if ((n as HTMLElement).classList.contains('norecord')) {
                    return false;
                }
                // Get the tag name
                const ElementName = (n as HTMLElement).tagName.toLowerCase()
                let attributes: attributes = {}
    
                // Get global attribute
                getGlobalAttribute(n, doc, attributes)
    
                // Get the css rules
                // external css
                if (ElementName === 'link') {
                    getExternalCssAttribute(n, doc, attributes)
                }
                // internal css
                if (ElementName === 'style') {
                    getInternalCssAttribute(n, attributes)
                }
                // Get form fields attributes
                if (ElementName === 'input' || ElementName === 'textarea' || ElementName === 'select' || ElementName === 'option') {
                    getFormFieldAttributes(n, ElementName, attributes)
                }
    
                // canvas image data
                if (ElementName === 'canvas') {
                    getCanvasAttributes(n, attributes)
                }
                // media elements
                if (ElementName === 'audio' || ElementName === 'video') {
                    getMediaAttributes(n, attributes)
                }
    
                return {
                    originId,
                    type: NodeType.Element,
                    elementName: ElementName,
                    attributes,
                    childNodes: [],
                }
            case n.TEXT_NODE:
                // The parent node may not be a html element which has a ElementName attribute.
                // So just let it be undefined which is ok in this use case.
                const parentElementName =
                    n.parentNode && (n.parentNode as HTMLElement).tagName
    
                if (parentElementName === 'SCRIPT') {
                    return false;
                }
    
                let textContent = (n as Text).textContent?.trim()
    
                const isCSSRules = parentElementName === 'STYLE' ? true : false
    
                if (textContent && !isCSSRules) {
                    return {
                        originId,
                        type: NodeType.Text,
                        textContent: textContent || '',
                        isCSSRules,
                    }
                } else {
                    return false
                }
            default:
                return false
        }
        
    }

    /**
     * format the node currentNode
     * @param Node : Node to format
     * @returns NodeCaptured
     */
    public formatNode(
        currentNode: Node | NodeFormated | null,
        map: DocumentNodesMap,
        doc: Document,
        onSerialize?: (n: NodeFormated) => unknown,
        onIframeLoad?: (iframeNodeFormated: NodeFormated, node: NodeCaptured) => unknown
    ): NodeCaptured | null {
        if (!currentNode) return null

        const _capturedNode = this.captureNode(doc, currentNode as Node)

        if (!_capturedNode) return null

        let nodeId = 1

        // Determine the node id
        if ('_cnode' in currentNode) {
            nodeId = currentNode._cnode.nodeId
        } else {
            nodeId = this.currentId++
        }

        const capturedNode = Object.assign({ nodeId }, _capturedNode)
            ; (currentNode as NodeFormated)._cnode = capturedNode

        map[nodeId] = currentNode as NodeFormated

        if (onSerialize) {
            onSerialize(currentNode as NodeFormated);
        }

        //  format and capture each child of the current node
        if (capturedNode.type === NodeType.Element) {
            for (const childNode of Array.from((currentNode as Node).childNodes)) {
                const capturedChildNode = this.formatNode(childNode, map, doc)
                if (capturedChildNode) {
                    capturedNode.childNodes.push(capturedChildNode)
                }
            }
        }

        //  format and capture each element of the current node if it's an iframe
        if (
            capturedNode.type === NodeType.Element &&
            capturedNode.elementName === 'iframe'
        ) {
            onceIframeLoaded(
                currentNode as HTMLIFrameElement,
                () => {
                    const iframeDoc = (currentNode as HTMLIFrameElement).contentDocument;
                    if (iframeDoc && onIframeLoad) {
                        const iframeElements = Array.from((iframeDoc as Document).childNodes);
                        const parsedIframeNode = this.formatNode(
                            iframeElements[1],
                            map,
                            iframeDoc,
                        );
                        if (parsedIframeNode) {
                            onIframeLoad(currentNode as NodeFormated, parsedIframeNode);
                        }
                    }
                }
            );
        }

        return capturedNode
    }

    /**
     * capture
     */
    public capture(
        doc: Document,
        onSerialize: (n: NodeFormated) => unknown,
        onIframeLoad: (iframeNodeFormated: NodeFormated, node: NodeCaptured) => unknown
    ): [NodeCaptured | null, DocumentNodesMap] {
        const DocumentNodesMap: DocumentNodesMap = {}
        const n = Array.from((this.documentRoot as Node).childNodes)
        return [
            this.formatNode(
                n[1],
                DocumentNodesMap,
                doc,
                onSerialize,
                onIframeLoad
            ),
            DocumentNodesMap
        ]
    }
}

function getGlobalAttribute(n: Node, doc: Document, attributes: attributes): void {
    const nodeAttr = Array.from((n as HTMLElement).attributes)
    for (const { name, value } of nodeAttr) {
        attributes[name] = transformAttribute(doc, name, value)
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
}

function getExternalCssAttribute(n: Node, doc: Document, attributes: attributes): void {
    const stylesheet = getStylesheet(doc, n)

    const cssText = getCssRulesString(
        stylesheet as CSSStyleSheet,
    )
    if (cssText) {
        delete attributes.rel
        delete attributes.href
        attributes.cssText = cssText
    }
}

function getInternalCssAttribute(n: Node, attributes: attributes) {
    const cssText = getCssRulesString((n as HTMLStyleElement).sheet as CSSStyleSheet)
    if (cssText) {
        attributes.cssText = cssText
    }
}

function getFormFieldAttributes(n: Node, ElementName: string, attributes: attributes) {
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
}

function getCanvasAttributes(n: Node, attributes: attributes) {
    attributes._dataURL = (n as HTMLCanvasElement).toDataURL()
}

function getMediaAttributes(n: Node, attributes: attributes) {
    attributes._mediaState = (n as HTMLMediaElement).paused
        ? 'paused'
        : 'played'
}

function onceIframeLoaded(
    iframeEl: HTMLIFrameElement,
    listener: () => unknown,
) {
    const win = iframeEl.contentWindow;
    if (!win) {
        return;
    }
    // document is loading
    let fired = false;
    if (win.document.readyState !== 'complete') {
        const timer = setTimeout(() => {
            if (!fired) {
                listener();
                fired = true;
            }
        }, 5000);
        iframeEl.addEventListener('load', () => {
            clearTimeout(timer);
            fired = true;
            listener();
        });
        return;
    }
    // check blank frame for Chrome
    const blankUrl = 'about:blank';
    if (
        win.location.href !== blankUrl ||
        iframeEl.src === blankUrl ||
        iframeEl.src === ''
    ) {
        listener();
        return;
    }
    // use default listener
    iframeEl.addEventListener('load', listener);
}

export default NodeCaptor