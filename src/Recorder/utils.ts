import { NodeCaptured, NodeFormated, NodeType } from '../NodeCaptor/types';
import {
    addedNodeMutation,
    DocumentDimension,
    NodeFormatedMapHandler,
    throttleOptions
} from './types'

type blockClass = String | RegExp;

export const _NFMHandler: NodeFormatedMapHandler = {
    map: {},
    getId(n) {
        // if n is not a serialized NodeFormated, use -1 as its id.
        if (!n._cnode) { return -1 }
        return n._cnode.nodeId
    },
    getNode(id) { return _NFMHandler.map[id] || null },
    // TODO: use a weakmap to get rid of manually memory management
    removeNodeFromMap(n) {
        const id = n._cnode && n._cnode.nodeId
        delete _NFMHandler.map[id]
        if (n.childNodes) {
            n.childNodes.forEach((child) =>
                _NFMHandler.removeNodeFromMap((child as Node) as NodeFormated),
            )
        }
    },
    has(id) { return _NFMHandler.map.hasOwnProperty(id) },
}

/**
 * A throttle is a common technique used in the browser to improve an application’s performance by limiting the number of events your code needs to handle
 */
export function throttle<T>(
    func: (arg: T) => void,
    wait: number,
    options: throttleOptions = {},
) {
    let timeout: number | null = null
    let previous = 0
    // tslint:disable-next-line: only-arrow-functions
    return function (arg: T) {
        let now = Date.now()
        if (!previous && options.leading === false) {
            previous = now
        }
        let remaining = wait - (now - previous)
        let context = this
        let args = arguments
        if (remaining <= 0 || remaining > wait) {
            if (timeout) {
                window.clearTimeout(timeout)
                timeout = null
            }
            previous = now
            func.apply(context, args)
        } else if (!timeout && options.trailing !== false) {
            timeout = window.setTimeout(() => {
                previous = options.leading === false ? 0 : Date.now()
                timeout = null
                func.apply(context, args)
            }, remaining)
        }
    }
}

export function getWindowWidth(): number {
    return (
        window.innerWidth ||
        (document.documentElement && document.documentElement.clientWidth) ||
        (document.body && document.body.clientWidth)
    )
}

export function getWindowHeight(): number {
    return (
        window.innerHeight ||
        (document.documentElement && document.documentElement.clientHeight) ||
        (document.body && document.body.clientHeight)
    )
}

export function isBlocked(node: Node | null, blockClass: blockClass): boolean {
    if (!node) {
        return false
    }
    if (node.nodeType === node.ELEMENT_NODE) {
        let needBlock = false
        if (typeof blockClass === 'string') {
            needBlock = (node as HTMLElement).classList.contains(blockClass)
        } else {
            ; (node as HTMLElement).classList.forEach((className) => {
                if ((blockClass as RegExp).test(className)) {
                    needBlock = true
                }
            })
        }
        return needBlock || isBlocked(node.parentNode, blockClass)
    }
    return isBlocked(node.parentNode, blockClass)
}

export function isAncestorRemoved(target: NodeFormated): boolean {
    const id = _NFMHandler.getId(target)
    if (!_NFMHandler.has(id)) {
        return true
    }
    if (
        target.parentNode &&
        target.parentNode.nodeType === target.DOCUMENT_NODE
    ) {
        return false
    }
    // if the root is not document, it means the node is not in the DOM tree anymore
    if (!target.parentNode) {
        return true
    }
    return isAncestorRemoved((target.parentNode as unknown) as NodeFormated)
}

export function isTouchEvent(
    event: MouseEvent | TouchEvent,
): event is TouchEvent {
    return Boolean((event as TouchEvent).changedTouches)
}

export function polyfill() {
    if ('NodeList' in window && !NodeList.prototype.forEach) {
        NodeList.prototype.forEach = (Array.prototype
            .forEach as unknown) as NodeList['forEach']
    }
}

type HTMLIFrameNodeFormated = HTMLIFrameElement & {
    _cnode: NodeCaptured;
};
export type AppendedIframe = {
    mutationInQueue: addedNodeMutation;
    builtNode: HTMLIFrameNodeFormated;
};

export function isIframeNodeFormated(node: NodeFormated): node is HTMLIFrameNodeFormated {
    // node can be document fragment when using the virtual parent feature
    if (!node._cnode) {
        return false;
    }
    return node._cnode.type === NodeType.Element && node._cnode.elementName === 'iframe';
}

export function getBaseDimension(node: Node): DocumentDimension {
    const frameElement = node.ownerDocument?.defaultView?.frameElement;
    if (!frameElement) {
        return {
            x: 0,
            y: 0,
        };
    }

    const frameDimension = frameElement.getBoundingClientRect();
    const frameBaseDimension = getBaseDimension(frameElement);
    return {
        x: frameDimension.x + frameBaseDimension.x,
        y: frameDimension.y + frameBaseDimension.y,
    };
}

