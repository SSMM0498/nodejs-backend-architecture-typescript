import {
    NodeFormated,
} from '../NodeCaptor/types';
import NodeCaptor from '../NodeCaptor/NodeCaptor'

import {
    mutationRecord,
    textNodeNewValue,
    attributeNewValue,
    removedNodeMutation,
    addedNodeMutation,
    EventType,
    IncrementalSource,
    eventWithTime,
} from '../Recorder/types';

import { _NFMHandler, isBlocked, isAncestorRemoved } from '../Recorder/utils';
import { transformAttribute } from '../NodeCaptor/utils';

type DoubleLinkedListNode = {
    previous: DoubleLinkedListNode | null;
    next: DoubleLinkedListNode | null;
    value: NodeInLinkedList;
} | null;

type NodeInLinkedList = Node & {
    _ln: DoubleLinkedListNode;
};

function isNodeInLinkedList(n: Node | NodeInLinkedList): n is NodeInLinkedList {
    return ('_ln' in n) && n._ln == null;
}

//  Check on the net for explication
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
        (n as NodeInLinkedList)._ln = node;

        //  Rearrange the previous sibling of the current node
        if (n.previousSibling && isNodeInLinkedList(n.previousSibling)) {
            const current = n.previousSibling._ln!.next;
            node.next = current;
            node.previous = n.previousSibling._ln!;
            n.previousSibling._ln!.next = node;
            if (current) {
                current.previous = node;
            }
        //  Rearrange the next sibling of the current node
        } else if (n.nextSibling && isNodeInLinkedList(n.nextSibling)) {
            const current = n.nextSibling._ln!.previous;
            node.previous = current;
            node.next = n.nextSibling._ln;
            n.nextSibling._ln!.previous = node;
            if (current) {
                current.next = node;
            }
        //  Redefine the head of the list
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
        const current = n._ln!;
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

        if (n.hasOwnProperty('_ln')) {
            n._ln = null;
        }

        this.length--;
    }
}

const moveKey = (id: number, parentId: number) => `${id}@${parentId}`;

function isNodeFormated(n: Node | NodeFormated): n is NodeFormated {
    return '_cnode' in n;
}

/**
 * handle how mutation are emitted
 */
export default class MutationBuffer {
    private frozen: boolean = false;
    private ncaptor: NodeCaptor;

    private texts: textNodeNewValue[] = [];
    private attributes: attributeNewValue[] = [];
    private removes: removedNodeMutation[] = [];    //  Array for a removed node in a Mutation

    private removedNodeMap: Node[] = [];            //  Map for removed node
    private movedNodeMap: Record<string, true> = {};

    private addedNodeSet = new Set<Node>();     // Set of added node
    private movedNodeSet = new Set<Node>();     // Set of moved node
    private droppedNodeSet = new Set<Node>();   // Set of dropped node

    constructor(ncaptor: NodeCaptor) {
        this.ncaptor = ncaptor
    }

    private emissionCallback: (p: eventWithTime) => void;   // Function to save mutations that occur

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
        mutations.forEach(this.bufferizeMutation);
        if (!this.frozen) {
            this.emit();
        }
    };

    public emit = () => {
        // delay any modification of the _NFHandler until this function
        // so that the _NFHandler for takeFullSnapshot doesn't get mutated while it's event is being processed
        const adds: addedNodeMutation[] = [];

        /**
         * Sometimes child node may be pushed before its newly added
         * parent, so we init a queue to store these nodes.
         */
        const addedNodeList = new DoubleLinkedList();

        const getNextId = (n: Node): number | null => {
            let nextId =
                n.nextSibling && _NFMHandler.getId((n.nextSibling as unknown) as NodeFormated);
            if (nextId === -1 && isBlocked(n.nextSibling, 'norecord'))
                nextId = null;

            return nextId;
        };

        const pushAdd = (n: Node) => {
            if (!n.parentNode) {
                return;
            }
            const parentId = _NFMHandler.getId((n.parentNode as Node) as NodeFormated);
            const nextId = getNextId(n);
            if (parentId === -1 || nextId === -1) {
                return addedNodeList.addNode(n);
            }
            adds.push({
                parentId,
                nextId,
                node: this.ncaptor.formatNode(n, _NFMHandler.map)!,
            });
        };

        while (this.removedNodeMap.length) {
            _NFMHandler.removeNodeFromMap(this.removedNodeMap.shift() as NodeFormated);
        }

        for (const n of this.movedNodeSet) {
            if (
                isParentRemoved(this.removes, n) &&
                !this.movedNodeSet.has(n.parentNode!)
            ) {
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
        //  ! : Explain -> how the purge of the adds array
        while (addedNodeList.length) {
            let node: DoubleLinkedListNode | null = null;

            if (candidate) {
                const parentId = _NFMHandler.getId(
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
                    const parentId = _NFMHandler.getId(
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
                    id: _NFMHandler.getId(text.node as NodeFormated),
                    value: text.value,
                }))
                // text mutation's id was not in the _NFHandler map means the target node has been removed
                .filter((text) => _NFMHandler.has(text.id)),
            attributes: this.attributes
                .map((attribute) => ({
                    id: _NFMHandler.getId(attribute.node as NodeFormated),
                    attributes: attribute.attributes,
                }))
                // attribute mutation's id was not in the _NFHandler map means the target node has been removed
                .filter((attribute) => _NFMHandler.has(attribute.id)),
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

    private bufferizeMutation = (m: mutationRecord) => {
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
                let item: attributeNewValue | undefined = this.attributes.find(
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
                    value!,             //  attribute new value
                );
                break;
            }
            case 'childList': {
                m.addedNodes.forEach((n) => this.handleAddedNode(n, m.target));
                m.removedNodes.forEach((n) => this.handleRemovedNode(n, m.target));
                break;
            }
            default:
                break;
        }
    };

    private handleRemovedNode = (n: Node | NodeFormated, target?: Node | NodeFormated) => {
        const nodeId = _NFMHandler.getId(n as NodeFormated);
        const parentId = _NFMHandler.getId(target as NodeFormated);

        if (
            isBlocked(n, 'norecord') ||
            isBlocked(target as Node, 'norecord')
        ) {
            return;
        }
        // the removed node has not been serialized yet, just remove it from the Set
        if (this.addedNodeSet.has(n)) {
            deepDelete(this.addedNodeSet, n);
            this.droppedNodeSet.add(n);
        } else if (this.addedNodeSet.has(target as Node) && nodeId === -1) {
            /**
             * If target was newly added and removed child node was
             * not serialized, it means the child node has been removed
             * before callback fired, so we can ignore it because
             * newly added node will be serialized without child nodes.
             * TODO: verify this
             */
        } else if (isAncestorRemoved(target as NodeFormated)) {
            /**
             * If parent id was not in the _NFHandler map any more, it
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
    }

    private handleAddedNode = (n: Node | NodeFormated, target?: Node | NodeFormated) => {
        if (isBlocked(n, 'norecord')) {
            return;
        }
        if (isNodeFormated(n)) {
            this.movedNodeSet.add(n);
            let targetId: number | null = null;
            if (target && isNodeFormated(target)) {
                targetId = target._cnode.nodeId;
            }
            if (targetId) {
                this.movedNodeMap[moveKey(n._cnode.nodeId, targetId)] = true;
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
    const parentId = _NFMHandler.getId((parentNode as Node) as NodeFormated);
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