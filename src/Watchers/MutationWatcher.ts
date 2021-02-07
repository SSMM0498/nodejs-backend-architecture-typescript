import MutationBuffer from "../MutationBuffer/MutationBuffer";
import { eventWithTime, Watcher } from "../Recorder/types";

class MutationWatcher {
    public mutationBuffer: MutationBuffer
    private mutationObserver: MutationObserver
    private callBack: (p: eventWithTime) => void

    constructor(cb: (p: eventWithTime) => void, mb: MutationBuffer) {
        this.callBack = cb
        this.mutationBuffer = mb

        //  Use the capture method as the emission callback to save mutations that occur
        this.mutationBuffer.init(this.capture());

        //  Use the processMutations method as the mutation callback function
        this.mutationObserver = new MutationObserver(
            this.mutationBuffer.processMutations.bind(this.mutationBuffer)
        );
    }

    /**
     * watch
     */
    public watch() {
        //  Start observing the Document DOM
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
     * stop
     */
    public stop() {
        this.mutationObserver.disconnect()
    }

    /**
     * capture
     */
    private capture() : (p: eventWithTime) => void {
        return this.callBack
    }
}

export default MutationWatcher