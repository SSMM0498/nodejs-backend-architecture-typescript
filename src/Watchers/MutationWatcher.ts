import MutationBuffer from "../MutationBuffer/MutationBuffer";
import { eventWithTime } from "../Recorder/types";

class MutationWatcher {
    public mutationBuffer: MutationBuffer
    private observer: MutationObserver;
    private callBack: (p: eventWithTime) => void
    constructor(cb: (p: eventWithTime) => void, mb: MutationBuffer) {
        this.callBack = cb
        this.mutationBuffer = mb
    }

    /**
     * watch
     */
    public watch() {
        
        this.mutationBuffer.init(this.callBack);
        this.observer = new MutationObserver(
            this.mutationBuffer.processMutations.bind(this.mutationBuffer)
        );
    }

    /**
     * capture
     */
    public capture() {
        this.observer.observe(document, {
            attributes: true,
            attributeOldValue: true,
            characterData: true,
            characterDataOldValue: true,
            childList: true,
            subtree: true,
        });
    }
}