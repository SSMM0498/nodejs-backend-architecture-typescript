import { NodeFormated } from '../NodeCaptor/types';
import { eventWithTime, MouseInteractions, EventType, IncrementalSource } from '../Recorder/types';
import { _NFMHandler, isTouchEvent, isBlocked } from '../Recorder/utils';

type MouseInteractionHandler = (event: MouseEvent | TouchEvent) => void
class MouseInteractionWatcher {
    private callBack: (p: eventWithTime) => void
    private doc: Document
    private handler: MouseInteractionHandler[] = []
    
    constructor(cb: (p: eventWithTime) => void, doc: Document) {
        this.callBack = cb
        this.doc = doc
        this.setEventListeners = this.setEventListeners.bind(this)
    }

    /**
     * watch
     */
    public watch() {
        Object.keys(MouseInteractions)
        .filter(
            (key) => Number.isNaN(Number(key)),
        )
        .forEach(this.setEventListeners)
    }

    private setEventListeners(eventKey: keyof typeof MouseInteractions) {
        const options = { capture: true, passive: true }
        const index = this.handler.push(this.capture(eventKey))
        const eventName = eventKey.toLowerCase()
        this.doc.addEventListener(eventName, this.handler[index - 1], options)
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
            const index = this.handler.push(this.capture(eventKey))
            const eventName = eventKey.toLowerCase()
            this.doc.removeEventListener(eventName, this.handler[index - 1], options)
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