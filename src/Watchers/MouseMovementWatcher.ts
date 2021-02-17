import { NodeFormated } from '../NodeCaptor/types';
import { EventType, IncrementalSource, eventWithTime, mousePosition } from '../Recorder/types';
import { _NFMHandler, isTouchEvent, throttle } from '../Recorder/utils';

class MouseMovementWatcher {
    private callBack: (p: eventWithTime) => void
    private doc: Document
    private handler = (e: MouseEvent | TouchEvent) => this.capture(e);
    
    constructor(cb: (p: eventWithTime) => void, doc: Document) {
        this.callBack = cb
        this.doc = doc
    }

    /**
     * watch
     */
    public watch() {
        const options = { capture: true, passive: true }
        this.doc.addEventListener('mousemove', this.handler, options)
        this.doc.addEventListener('touchmove', this.handler, options)
    }
    
    /**
     * stop
     */
    public stop() {
        const options = { capture: true, passive: true }
        this.doc.removeEventListener('mousemove', this.handler, options)
        this.doc.removeEventListener('touchmove', this.handler, options)
    }

    /**
     * capture
     */
    private capture(evt: MouseEvent | TouchEvent): void  {
        let positions: mousePosition[] = []
        let timeBaseline: number | null

        const wrappedCb = throttle((isTouch: boolean) => {
            const totalOffset = Date.now() - timeBaseline!
            const pos = positions.map((p) => {
                p.timeOffset -= totalOffset
                return p
            })
            this.callBack({
                type: EventType.IncrementalCapture,
                data: {
                    source: isTouch ? IncrementalSource.TouchMove : IncrementalSource.MouseMove,
                    positions: pos,
                },
                timestamp: Date.now()
            })
            positions = []
            timeBaseline = null
        }, 500)
    
        throttle<MouseEvent | TouchEvent>(
            (evt) => {
                const { target } = evt
                const { clientX, clientY } = isTouchEvent(evt)
                    ? evt.changedTouches[0]
                    : evt
                if (!timeBaseline) {
                    timeBaseline = Date.now()
                }
                positions.push({
                    x: clientX,
                    y: clientY,
                    id: _NFMHandler.getId(target as NodeFormated),
                    timeOffset: Date.now() - timeBaseline,
                })
                wrappedCb(isTouchEvent(evt))
            },
            50,
            {
                trailing: false,
            },
        )(evt)
    }
}

export default MouseMovementWatcher