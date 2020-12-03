import MutationBuffer from "../MutationBuffer/MutationBuffer";
import { eventWithTime } from "../Recorder/types";

class MutationWatcher {
    public mutationBuffer: MutationBuffer
    private mutationObserver: MutationObserver
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
        this.mutationObserver = new MutationObserver(
            this.mutationBuffer.processMutations.bind(this.mutationBuffer)
        );
    }

    /**
     * capture
     */
    public capture() {
        this.mutationObserver.observe(document, {
            attributes: true,
            attributeOldValue: true,
            characterData: true,
            characterDataOldValue: true,
            childList: true,
            subtree: true,
        });
    }
}

export default MutationWatcher