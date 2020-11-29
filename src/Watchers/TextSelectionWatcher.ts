import { eventWithTime, EventType, IncrementalSource, inputValue } from '../Recorder/types';

class TextSelectionWatcher {
    private callBack: (p: eventWithTime) => void
    private lastInputValueMap: WeakMap<EventTarget, inputValue> = new WeakMap()

    constructor(cb: (p: eventWithTime) => void) {
        this.callBack = cb
    }

    /**
     * watch
     */
    public watch() {
        const options = { capture: true, passive: true }
        document.addEventListener('selectionchange',this.capture, options)
    }

    /**
     * capture
     */
    private capture(event: Event) {
        const sel = document.getSelection()
        if (sel) {
            this.callBack({
                type: EventType.IncrementalSnapshot,
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