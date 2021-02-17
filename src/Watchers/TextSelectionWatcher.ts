import { eventWithTime, EventType, IncrementalSource, inputValue } from '../Recorder/types';

class TextSelectionWatcher {
    private callBack: (p: eventWithTime) => void
    private doc: Document
    private handler = (e: Event) => this.capture(e)

    constructor(cb: (p: eventWithTime) => void, doc: Document) {
        this.callBack = cb
        this.doc = doc
    }

    /**
     * watch
     */
    public watch() {
        const options = { capture: true, passive: true }
        this.doc.addEventListener('selectionchange', this.handler, options)
    }

    /**
     * stop
     */
    public stop() {
        const options = { capture: true, passive: true }
        this.doc.removeEventListener('selectionchange', this.handler, options)
    }

    /**
     * capture
     * TODO : Improve (only take needed data in selectrion attribute)
     * ! : Create the Corresponding Action Trigger
     */
    private capture(event: Event) {
        const sel = this.doc.getSelection()
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