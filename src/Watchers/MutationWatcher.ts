import MutationBuffer from "../MutationBuffer/MutationBuffer";
import { eventWithTime, Watcher } from "../Recorder/types";

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
        //  Use the capture method as the emission callback to save mutations that occur
        this.mutationBuffer.init(this.capture());

        //  Use the processMutation method as the mutation callback function
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
    private capture() : (p: eventWithTime) => void {
        return this.callBack
    }
}

export default MutationWatcher