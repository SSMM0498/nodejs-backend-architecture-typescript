import { NodeCaptured, NodeFormated } from '../NodeCaptor/types';
import { EventType, eventWithTime, IncrementalSource } from '../Recorder/types';

export class IframeManager {
    private iframes: WeakMap<HTMLIFrameElement, true> = new WeakMap()
    private mutationCb: (p: eventWithTime) => void
    private loadListener?: (iframeEl: HTMLIFrameElement) => unknown

    constructor(mutationCb: (p: eventWithTime) => void ) {
        this.mutationCb = mutationCb
    }

    public addIframe(iframeEl: HTMLIFrameElement) {
        this.iframes.set(iframeEl, true)
    }

    public addLoadListener(cb: (iframeEl: HTMLIFrameElement) => unknown) {
        this.loadListener = cb;
    }

    public attachIframe(iframeEl: NodeFormated, childSn: NodeCaptured) {
        this.mutationCb({
                type: EventType.IncrementalCapture,
                data: {
                    source: IncrementalSource.Mutation,
                        adds: [
                            {
                                parentId: iframeEl._cnode.nodeId,
                                nextId: null,
                                node: childSn,
                            },
                        ],
                        removes: [],
                        texts: [],
                        attributes: [],
                },
                timestamp: Date.now()
        });
        this.loadListener?.((iframeEl as unknown) as HTMLIFrameElement);
    }
}
