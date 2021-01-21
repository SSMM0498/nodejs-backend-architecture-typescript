import { NodeFormated } from '../NodeCaptor/types';
import { EventType, IncrementalSource, eventWithTime } from '../Recorder/types';
import { _NFHandler, throttle } from '../Recorder/utils';

class ScrollWatcher {
    private callBack: (p: eventWithTime) => void

    constructor(cb: (p: eventWithTime) => void) {
        this.callBack = cb
    }

    /**
     * watch
     */
    public watch() {
        const options = { capture: true, passive: true }
        document.addEventListener('scroll', (e) => this.capture(e as UIEvent), options)
    }

    /**
     * capture
     */
    private capture(evt: UIEvent): void {
        throttle<UIEvent>((evt) => {
            const id = _NFHandler.getId(evt.target as NodeFormated)
            if (evt.target === document) {
                const scrollEl = (document.scrollingElement || document.documentElement)!
                this.callBack({
                    type: EventType.IncrementalCapture,
                    data: {
                        source: IncrementalSource.Scroll,
                        id: -100,
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