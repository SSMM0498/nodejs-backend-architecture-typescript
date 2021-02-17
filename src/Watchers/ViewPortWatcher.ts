import { EventType, IncrementalSource, eventWithTime } from '../Recorder/types';
import { throttle, getWindowHeight, getWindowWidth } from '../Recorder/utils';

class ViewPortWatcher {
    private callBack: (p: eventWithTime) => void
    private handler = () => this.capture()

    constructor(cb: (p: eventWithTime) => void) {
        this.callBack = cb
    }

    /**
     * watch
     */
    public watch() {
        const options = { capture: true, passive: true }
        window.addEventListener('resize', this.handler, options)
    }

    /**
     * stop
     */
    public stop() {
        const options = { capture: true, passive: true }
        window.removeEventListener('resize', this.handler, options)
    }

    /**
     * capture
     */
    private capture(): void {
        let last_h = -1;
        let last_w = -1;
        throttle<void>(() => {
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
        }, 500)()
    }
}

export default ViewPortWatcher