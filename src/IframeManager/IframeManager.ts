import { NodeCaptured, NodeFormated } from '../NodeCaptor/types';
import { mutationCallBack } from '../Recorder/types';

export class IframeManager {
    private iframes: WeakMap<HTMLIFrameElement, true> = new WeakMap()
    private mutationCb: mutationCallBack
    private loadListener?: (iframeEl: HTMLIFrameElement) => unknown

    constructor(options: { mutationCb: mutationCallBack }) {
        this.mutationCb = options.mutationCb
    }

    public addIframe(iframeEl: HTMLIFrameElement) {
        this.iframes.set(iframeEl, true)
    }

    public addLoadListener(cb: (iframeEl: HTMLIFrameElement) => unknown) {
        this.loadListener = cb;
    }

    public attachIframe(iframeEl: NodeFormated, childSn: NodeCaptured) {
        this.mutationCb({
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
        });
        this.loadListener?.((iframeEl as unknown) as HTMLIFrameElement);
    }
}
