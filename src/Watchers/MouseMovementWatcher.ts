import { NodeFormated } from '../NodeCaptor/types';
import { EventType, IncrementalSource, eventWithTime, mousePosition } from '../Recorder/types';
import { mirror, isTouchEvent, throttle } from '../Recorder/utils';

class MouseMovementWatcher {
    private callBack: (p: eventWithTime) => void
    
    constructor(cb: (p: eventWithTime) => void) {
        this.callBack = cb
    }

    /**
     * watch
     */
    public watch() {
        const options = { capture: true, passive: true }
        document.addEventListener('mousemove', this.capture, options)
        document.addEventListener('touchmove', this.capture, options)
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
                type: EventType.IncrementalSnapshot,
                data: {
                    source: isTouch ? IncrementalSource.TouchMove : IncrementalSource.MouseMove,
                    positions: pos,
                },
                timestamp: Date.now()
            })
            positions = []
            timeBaseline = null
        }, 500)
    
        const updatePosition = throttle<MouseEvent | TouchEvent>(
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
                    id: mirror.getId(target as NodeFormated),
                    timeOffset: Date.now() - timeBaseline,
                })
                wrappedCb(isTouchEvent(evt))
            },
            50,
            {
                trailing: false,
            },
        )
    }
}

export default MouseMovementWatcher