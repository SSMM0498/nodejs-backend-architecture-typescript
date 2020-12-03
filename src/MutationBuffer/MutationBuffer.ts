import {
    NodeFormated,
} from '../NodeCaptor/types';
import NodeCaptor from '../NodeCaptor/NodeCaptor'

import {
    mutationRecord,
    textCursor,
    attributeCursor,
    removedNodeMutation,
    addedNodeMutation,
    EventType,
    IncrementalSource,
    eventWithTime,
} from '../Recorder/types';

import { mirror, isBlocked, isAncestorRemoved } from '../Recorder/utils';
import { transformAttribute } from '../NodeCaptor/utils';

type DoubleLinkedListNode = {
    previous: DoubleLinkedListNode | null;
    next: DoubleLinkedListNode | null;
    value: NodeInLinkedList;
};

type NodeInLinkedList = Node & {
    __ln: DoubleLinkedListNode;
};

function isNodeInLinkedList(n: Node | NodeInLinkedList): n is NodeInLinkedList {
    return '__ln' in n;
}

class DoubleLinkedList {
    public length = 0;
    public head: DoubleLinkedListNode | null = null;

    public get(position: number) {
        if (position >= this.length) {
            throw new Error('Position outside of list range');
        }

        let current = this.head;
        for (let index = 0; index < position; index++) {
            current = current?.next || null;
        }
        return current;
    }

    public addNode(n: Node) {
        const node: DoubleLinkedListNode = {
            value: n as NodeInLinkedList,
            previous: null,
            next: null,
        };
        (n as NodeInLinkedList).__ln = node;
        if (n.previousSibling && isNodeInLinkedList(n.previousSibling)) {
            const current = n.previousSibling.__ln.next;
            node.next = current;
            node.previous = n.previousSibling.__ln;
            n.previousSibling.__ln.next = node;
            if (current) {
                current.previous = node;
            }
        } else if (n.nextSibling && isNodeInLinkedList(n.nextSibling)) {
            const current = n.nextSibling.__ln.previous;
            node.previous = current;
            node.next = n.nextSibling.__ln;
            n.nextSibling.__ln.previous = node;
            if (current) {
                current.next = node;
            }
        } else {
            if (this.head) {
                this.head.previous = node;
            }
            node.next = this.head;
            this.head = node;
        }
        this.length++;
    }

    public removeNode(n: NodeInLinkedList) {
        const current = n.__ln;
        if (!this.head) {
            return;
        }

        if (!current.previous) {
            this.head = current.next;
            if (this.head) {
                this.head.previous = null;
            }
        } else {
            current.previous.next = current.next;
            if (current.next) {
                current.next.previous = current.previous;
            }
        }
        if (n.__ln) {
            delete n.__ln;
        }
        this.length--;
    }
}

const moveKey = (id: number, parentId: number) => `${id}@${parentId}`;
function isNodeFormated(n: Node | NodeFormated): n is NodeFormated {
    return '_fnode' in n;
}

/**
 * controls behaviour of a MutationObserver
 */
export default class MutationBuffer {
    private frozen: boolean = false;

    private texts: textCursor[] = [];
    private attributes: attributeCursor[] = [];
    private removes: removedNodeMutation[] = [];

    private removedNodeMap: Node[] = [];
    private movedNodeMap: Record<string, true> = {};

    /**
     * the browser MutationObserver emits multiple mutations after
     * a delay for performance reasons, making tracing added nodes hard
     * in our `processMutations` callback function.
     * For example, if we append an element el_1 into body, and then append
     * another element el_2 into el_1, these two mutations may be passed to the
     * callback function together when the two operations were done.
     * Generally we need to trace child nodes of newly added nodes, but in this
     * case if we count el_2 as el_1's child node in the first mutation record,
     * then we will count el_2 again in the second mutation record which was
     * duplicated.
     * To avoid of duplicate counting added nodes, we use a Set to store
     * added nodes and its child nodes during iterate mutation records. Then
     * collect added nodes from the Set which have no duplicate copy. But
     * this also causes newly added nodes will not be serialized with id ASAP,
     * which means all the id related calculation should be lazy too.
     */
    private addedNodeSet = new Set<Node>();
    private movedNodeSet = new Set<Node>();
    private droppedNodeSet = new Set<Node>();

    private emissionCallback: (p: eventWithTime) => void;

    public init(cb: (p: eventWithTime) => void) { this.emissionCallback = cb; }

    public freeze() {
        this.frozen = true;
    }

    public unfreeze() {
        this.frozen = false;
    }

    public isFrozen() {
        return this.frozen;
    }

    public processMutations = (mutations: mutationRecord[]) => {
        mutations.forEach(this.processMutation);
        if (!this.frozen) {
            this.emit();
        }
    };

    public emit = () => {
        // delay any modification of the mirror until this function
        // so that the mirror for takeFullSnapshot doesn't get mutated while it's event is being processed
        const adds: addedNodeMutation[] = [];

        /**
         * Sometimes child node may be pushed before its newly added
         * parent, so we init a queue to store these nodes.
         */
        const addedNodeList = new DoubleLinkedList();
        const getNextId = (n: Node): number | null => {
            let nextId =
                n.nextSibling && mirror.getId((n.nextSibling as unknown) as NodeFormated);
            if (nextId === -1 && isBlocked(n.nextSibling, 'norecord')) {
                nextId = null;
            }
            return nextId;
        };

        const pushAdd = (n: Node) => {
            if (!n.parentNode) {
                return;
            }
            const parentId = mirror.getId((n.parentNode as Node) as NodeFormated);
            const nextId = getNextId(n);
            if (parentId === -1 || nextId === -1) {
                return addedNodeList.addNode(n);
            }
            adds.push({
                parentId,
                nextId,
                node: new NodeCaptor(document).capture()[0]!,
            });
        };

        while (this.removedNodeMap.length) {
            mirror.removeNodeFromMap(this.removedNodeMap.shift() as NodeFormated);
        }

        for (const n of this.movedNodeSet) {
            if (
                isParentRemoved(this.removes, n) &&
                !this.movedNodeSet.has(n.parentNode!)) {
                continue;
            }
            pushAdd(n);
        }

        for (const n of this.addedNodeSet) {
            if (
                !isAncestorInSet(this.droppedNodeSet, n) &&
                !isParentRemoved(this.removes, n)
            ) {
                pushAdd(n);
            } else if (isAncestorInSet(this.movedNodeSet, n)) {
                pushAdd(n);
            } else {
                this.droppedNodeSet.add(n);
            }
        }

        let candidate: DoubleLinkedListNode | null = null;
        while (addedNodeList.length) {
            let node: DoubleLinkedListNode | null = null;
            if (candidate) {
                const parentId = mirror.getId(
                    (candidate.value.parentNode as Node) as NodeFormated,
                );
                const nextId = getNextId(candidate.value);
                if (parentId !== -1 && nextId !== -1) {
                    node = candidate;
                }
            }
            if (!node) {
                for (let index = addedNodeList.length - 1; index >= 0; index--) {
                    const _node = addedNodeList.get(index)!;
                    const parentId = mirror.getId(
                        (_node.value.parentNode as Node) as NodeFormated,
                    );
                    const nextId = getNextId(_node.value);
                    if (parentId !== -1 && nextId !== -1) {
                        node = _node;
                        break;
                    }
                }
            }
            if (!node) {
                /**
                 * If all nodes in queue could not find a serialized parent,
                 * it may be a bug or corner case. We need to escape the
                 * dead while loop at once.
                 */
                break;
            }
            candidate = node.previous;
            addedNodeList.removeNode(node.value);
            pushAdd(node.value);
        }

        const payload = {
            texts: this.texts
                .map((text) => ({
                    id: mirror.getId(text.node as NodeFormated),
                    value: text.value,
                }))
                // text mutation's id was not in the mirror map means the target node has been removed
                .filter((text) => mirror.has(text.id)),
            attributes: this.attributes
                .map((attribute) => ({
                    id: mirror.getId(attribute.node as NodeFormated),
                    attributes: attribute.attributes,
                }))
                // attribute mutation's id was not in the mirror map means the target node has been removed
                .filter((attribute) => mirror.has(attribute.id)),
            removes: this.removes,
            adds: adds,
        };

        const evt: eventWithTime = {
            type: EventType.IncrementalCapture,
            data: {
                source: IncrementalSource.Mutation,
                ...payload,
            },
            timestamp: Date.now()
        }

        // payload may be empty if the mutations happened in some blocked elements
        if (
            !payload.texts.length &&
            !payload.attributes.length &&
            !payload.removes.length &&
            !payload.adds.length
        ) {
            return;
        }

        // reset
        this.texts = [];
        this.attributes = [];
        this.removes = [];
        this.addedNodeSet = new Set<Node>();
        this.movedNodeSet = new Set<Node>();
        this.droppedNodeSet = new Set<Node>();
        this.movedNodeMap = {};

        this.emissionCallback(evt);
    };

    private processMutation = (m: mutationRecord) => {
        switch (m.type) {
            case 'characterData': {
                const value = m.target.textContent;
                if (!isBlocked(m.target, 'norecord') && value !== m.oldValue) {
                    this.texts.push({
                        value,
                        node: m.target,
                    });
                }
                break;
            }
            case 'attributes': {
                const value = (m.target as HTMLElement).getAttribute(m.attributeName!);
                if (isBlocked(m.target, 'norecord') || value === m.oldValue) {
                    return;
                }
                let item: attributeCursor | undefined = this.attributes.find(
                    (a) => a.node === m.target,
                );
                if (!item) {
                    item = {
                        node: m.target,
                        attributes: {},
                    };
                    this.attributes.push(item);
                }
                // overwrite attribute if the mutations was triggered in same time
                item.attributes[m.attributeName!] = transformAttribute(
                    document,
                    m.attributeName!,
                    value!,
                );
                break;
            }
            case 'childList': {
                m.addedNodes.forEach((n) => this.handleAddedNode(n, m.target));
                m.removedNodes.forEach((n) => {
                    const nodeId = mirror.getId(n as NodeFormated);
                    const parentId = mirror.getId(m.target as NodeFormated);
                    if (
                        isBlocked(n, 'norecord') ||
                        isBlocked(m.target, 'norecord')
                    ) {
                        return;
                    }
                    // removed node has not been serialized yet, just remove it from the Set
                    if (this.addedNodeSet.has(n)) {
                        deepDelete(this.addedNodeSet, n);
                        this.droppedNodeSet.add(n);
                    } else if (this.addedNodeSet.has(m.target) && nodeId === -1) {
                        /**
                         * If target was newly added and removed child node was
                         * not serialized, it means the child node has been removed
                         * before callback fired, so we can ignore it because
                         * newly added node will be serialized without child nodes.
                         * TODO: verify this
                         */
                    } else if (isAncestorRemoved(m.target as NodeFormated)) {
                        /**
                         * If parent id was not in the mirror map any more, it
                         * means the parent node has already been removed. So
                         * the node is also removed which we do not need to track
                         * and replay.
                         */
                    } else if (
                        this.movedNodeSet.has(n) &&
                        this.movedNodeMap[moveKey(nodeId, parentId)]
                    ) {
                        deepDelete(this.movedNodeSet, n);
                    } else {
                        this.removes.push({
                            parentId,
                            id: nodeId,
                        });
                    }
                    this.removedNodeMap.push(n);
                });
                break;
            }
            default:
                break;
        }
    };

    private handleAddedNode = (n: Node | NodeFormated, target?: Node | NodeFormated) => {
        if (isBlocked(n, 'norecord')) {
            return;
        }
        if (isNodeFormated(n)) {
            this.movedNodeSet.add(n);
            let targetId: number | null = null;
            if (target && isNodeFormated(target)) {
                targetId = target._fnode.nodeId;
            }
            if (targetId) {
                this.movedNodeMap[moveKey(n._fnode.nodeId, targetId)] = true;
            }
        } else {
            this.addedNodeSet.add(n);
            this.droppedNodeSet.delete(n);
        }
        n.childNodes.forEach((childN) => this.handleAddedNode(childN));
    };
}

/**
 * Some utils to handle the mutation observer DOM records.
 * It should be more clear to extend the native data structure
 * like Set and Map, but currently Typescript does not support
 * that.
 */

function deepDelete(addsSet: Set<Node>, n: Node) {
    addsSet.delete(n);
    n.childNodes.forEach((childN) => deepDelete(addsSet, childN));
}

function isParentRemoved(removes: removedNodeMutation[], n: Node): boolean {
    const { parentNode } = n;
    if (!parentNode) {
        return false;
    }
    const parentId = mirror.getId((parentNode as Node) as NodeFormated);
    if (removes.some((r) => r.id === parentId)) {
        return true;
    }
    return isParentRemoved(removes, parentNode);
}

function isAncestorInSet(set: Set<Node>, n: Node): boolean {
    const { parentNode } = n;
    if (!parentNode) {
        return false;
    }
    if (set.has(parentNode)) {
        return true;
    }
    return isAncestorInSet(set, parentNode);
}