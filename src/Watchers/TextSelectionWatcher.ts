import { eventWithTime, EventType, IncrementalSource, inputValue } from '../Recorder/types';

class TextSelectionWatcher {
    private callBack: (p: eventWithTime) => void
    private handler = (e: Event) => this.capture(e)

    constructor(cb: (p: eventWithTime) => void) {
        this.callBack = cb
    }

    /**
     * watch
     */
    public watch() {
        const options = { capture: true, passive: true }
        document.addEventListener('selectionchange', this.handler, options)
    }

    /**
     * stop
     */
    public stop() {
        const options = { capture: true, passive: true }
        document.removeEventListener('selectionchange', this.handler, options)
    }

    /**
     * capture
     * TODO : Improve
     * ! : Create the Corresponding Action Trigger
     */
    private capture(event: Event) {
        const sel = document.getSelection()
        if (sel) {
            this.callBack({
                type: EventType.IncrementalCapture,
                data: {
                    source: IncrementalSource.TextSelection,
                    selection: sel,
                },
                timestamp: Date.now()
            })
        }
    }
}

export default TextSelectionWatcher