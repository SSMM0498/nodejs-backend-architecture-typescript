import { EventType, IncrementalSource, eventWithTime } from '../Recorder/types';
import { throttle, getWindowHeight, getWindowWidth } from '../Recorder/utils';

class ViewPortWatcher {
    private callBack: (p: eventWithTime) => void
    private handler = (e: Event) => this.capture(e as UIEvent)

    constructor(cb: (p: eventWithTime) => void) {
        this.callBack = cb
        this.handler = this.handler.bind(this)
    }

    /**
     * watch
     */
    public watch() {
        const options = { capture: true, passive: true }
        document.addEventListener('resize', this.handler, options)
    }

    /**
     * stop
     */
    public stop() {
        const options = { capture: true, passive: true }
        document.removeEventListener('resize', this.handler, options)
    }

    /**
     * capture
     */
    private capture(evt: Event): void {
        let last_h = -1;
        let last_w = -1;
        throttle(() => {
            const height = getWindowHeight();
            const width = getWindowWidth();
            if (last_h !== height || last_w != width) {
                this.callBack({
                    type: EventType.IncrementalCapture,
                    data: {
                        source: IncrementalSource.ViewportResize,
                        width: Number(width),
                        height: Number(height),
                    },
                    timestamp: Date.now()
                });
                last_h = height;
                last_w = width;
            }
        }, 200)(evt)
    }
}

export default ViewPortWatcher