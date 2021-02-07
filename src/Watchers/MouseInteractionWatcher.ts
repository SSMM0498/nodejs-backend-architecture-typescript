import { NodeFormated } from '../NodeCaptor/types';
import { eventWithTime, MouseInteractions, EventType, IncrementalSource } from '../Recorder/types';
import { _NFMHandler, isTouchEvent, isBlocked } from '../Recorder/utils';

type MouseInteractionHandler = (eventKey: keyof typeof MouseInteractions) => ((event: MouseEvent | TouchEvent) => void)

// ! Verify if it works
class MouseInteractionWatcher {
    private callBack: (p: eventWithTime) => void
    private handler: MouseInteractionHandler[]
    
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
            const index = this.handler.push((eventKey) => this.capture(eventKey))
            const eventName = eventKey.toLowerCase()
            document.addEventListener(eventName, this.handler[index - 1](eventKey), options)
        })
    }

    /**
     * stop
     */
    public stop() {
        const options = { capture: true, passive: true }
        Object.keys(MouseInteractions)
        .filter(
            (key) => Number.isNaN(Number(key)),
        )
        .forEach((eventKey: keyof typeof MouseInteractions) => {
            const index = this.handler.push((eventKey) => this.capture(eventKey))
            const eventName = eventKey.toLowerCase()
            document.removeEventListener(eventName, this.handler[index - 1](eventKey), options)
        })
    }

    /**
     * capture
     */
    private capture(eventKey: keyof typeof MouseInteractions) : ((event: MouseEvent | TouchEvent) => void) {
        return (event: MouseEvent | TouchEvent) => {
            const id = _NFMHandler.getId(event.target as NodeFormated)
            const { clientX, clientY } = isTouchEvent(event)
                ? event.changedTouches[0]
                : event
            this.callBack({
                type: EventType.IncrementalCapture,
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