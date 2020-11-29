import { NodeFormated } from '../NodeCaptor/types';
import { EventType, IncrementalSource, eventWithTime } from '../Recorder/types';
import { mirror, throttle } from '../Recorder/utils';

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
        document.addEventListener('scroll', this.capture, options)
    }

    /**
     * capture
     */
    private capture(evt: UIEvent): void {
        throttle<UIEvent>((evt) => {
            const id = mirror.getId(evt.target as NodeFormated)
            if (evt.target === document) {
                const scrollEl = (document.scrollingElement || document.documentElement)!
                this.callBack({
                    type: EventType.IncrementalSnapshot,
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
                    type: EventType.IncrementalSnapshot,
                    data: {
                        source: IncrementalSource.Scroll,
                        id,
                        x: (evt.target as HTMLElement).scrollLeft,
                        y: (evt.target as HTMLElement).scrollTop,
                    },
                    timestamp: Date.now()
                })
            }
        }, 100)
    }
}

export default ScrollWatcher