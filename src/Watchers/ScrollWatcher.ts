import { NodeFormated } from '../NodeCaptor/types';
import { EventType, IncrementalSource, eventWithTime } from '../Recorder/types';
import { _NFMHandler, throttle } from '../Recorder/utils';

class ScrollWatcher {
    private callBack: (p: eventWithTime) => void
    private handler = (e: Event) => this.capture(e as UIEvent)

    constructor(cb: (p: eventWithTime) => void) {
        this.callBack = cb
    }

    /**
     * watch
     */
    public watch() {
        const options = { capture: true, passive: true }
        document.addEventListener('scroll', this.handler, options)
    }
    
    /**
     * stop
     */
    public stop() {
        const options = { capture: true, passive: true }
        document.removeEventListener('scroll', this.handler, options)
    }

    /**
     * capture
     */
    private capture(evt: UIEvent): void {
        throttle<UIEvent>((evt) => {
            const id = _NFMHandler.getId(evt.target as NodeFormated)
            if (evt.target === document) {
                const scrollEl = (document.scrollingElement || document.documentElement)!
                this.callBack({
                    type: EventType.IncrementalCapture,
                    data: {
                        source: IncrementalSource.Scroll,
                        id: -100,   //  ! : CHECK THIS IN THE REPLAYER
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