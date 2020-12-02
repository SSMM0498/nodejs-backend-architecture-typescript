import { NodeFormated } from '../NodeCaptor/types';
import { eventWithTime, MouseInteractions, EventType, IncrementalSource } from '../Recorder/types';
import { mirror, isTouchEvent, isBlocked } from '../Recorder/utils';

class MouseInteractionWatcher {
    private callBack: (p: eventWithTime) => void
    
    constructor(cb: (p: eventWithTime) => void) {
        this.callBack = cb
    }

    /**
     * watch
     */
    public watch() {
        const options = { capture: true, passive: true }
        Object.keys(MouseInteractions)
        .filter(
            (key) => Number.isNaN(Number(key)),
        )
        .forEach((eventKey: keyof typeof MouseInteractions) => {
            const eventName = eventKey.toLowerCase()
            const handler = this.capture(eventKey)
            document.addEventListener(eventName, handler, options)
        })
    }

    /**
     * capture
     */
    private capture(eventKey: keyof typeof MouseInteractions) : ((event: MouseEvent | TouchEvent) => void) {
        return (event: MouseEvent | TouchEvent) => {
            const id = mirror.getId(event.target as NodeFormated)
            const { clientX, clientY } = isTouchEvent(event)
                ? event.changedTouches[0]
                : event
            this.callBack({
                type: EventType.IncrementalSnapshot,
                data: {
                    source: IncrementalSource.MouseInteraction,
                    type: MouseInteractions[eventKey],
                    id,
                    x: clientX,
                    y: clientY,
                },
                timestamp: Date.now()
            })
        }
    }
}

export default MouseInteractionWatcher