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
        this.mutationBuffer.init(this.capture());
        this.mutationObserver = new MutationObserver(
            this.mutationBuffer.processMutations.bind(this.mutationBuffer)
        );
        this.mutationObserver.observe(document, {
            attributes: true,
            attributeOldValue: true,
            characterData: true,
            characterDataOldValue: true,
            childList: true,
            subtree: true,
        });
    }

    /**
     * capture
     */
    public capture() : (p: eventWithTime) => void {
        return this.callBack
    }
}

export default MutationWatcher