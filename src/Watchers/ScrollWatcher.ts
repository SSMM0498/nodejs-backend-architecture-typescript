import { NodeFormated } from '../NodeCaptor/types';
import { EventType, IncrementalSource, eventWithTime } from '../Recorder/types';
import { _NFMHandler, throttle } from '../Recorder/utils';

class ScrollWatcher {
    private callBack: (p: eventWithTime) => void
    private doc: Document
    private handler = (e: Event) => this.capture(e as UIEvent)

    constructor(cb: (p: eventWithTime) => void, doc: Document) {
        this.callBack = cb
        this.doc = doc
    }

    /**
     * watch
     */
    public watch() {
        const options = { capture: true, passive: true }
        this.doc.addEventListener('scroll', this.handler, options)
    }
    
    /**
     * stop
     */
    public stop() {
        const options = { capture: true, passive: true }
        this.doc.removeEventListener('scroll', this.handler, options)
    }

    /**
     * capture
     */
    private capture(evt: UIEvent): void {
        throttle<UIEvent>((evt) => {
            const id = _NFMHandler.getId(evt.target as NodeFormated)
            if (evt.target === this.doc) {
                const scrollEl = (this.doc.scrollingElement || this.doc.documentElement)!
                this.callBack({
                    type: EventType.IncrementalCapture,
                    data: {
                        source: IncrementalSource.Scroll,
                        id,
                        x: scrollEl.scrollLeft,
                        y: scrollEl.scrollTop,
                    },
                    timestamp: Date.now()
                })
            } else {
                this.callBack({
                    type: EventType.IncrementalCapture,
                    data: {
                        source: IncrementalSource.Scroll,
                        id,
                        x: (evt.target as HTMLElement).scrollLeft,
                        y: (evt.target as HTMLElement).scrollTop,
                    },
                    timestamp: Date.now()
                })
            }
        }, 100)(evt)
    }
}

export default ScrollWatcher