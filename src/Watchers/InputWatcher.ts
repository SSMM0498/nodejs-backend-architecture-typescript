import { NodeFormated } from '../NodeCaptor/types';
import { eventWithTime, EventType, IncrementalSource, inputValue } from '../Recorder/types';
import { _NFMHandler } from '../Recorder/utils';

const INPUT_TAGS = ['INPUT', 'TEXTAREA', 'SELECT']

class InputWatcher {
    private callBack: (p: eventWithTime) => void
    private handler = (e: Event) => this.capture(e)
    private lastInputValueMap: WeakMap<EventTarget, inputValue> = new WeakMap()

    constructor(cb: (p: eventWithTime) => void) {
        this.callBack = cb
    }

    /**
     * watch
     */
    public watch() {
        const options = { capture: true, passive: true }
        document.addEventListener('input', this.handler, options)
        document.addEventListener('change', this.handler, options)
    }

    /**
     * stop
     */
    public stop() {
        const options = { capture: true, passive: true }
        document.removeEventListener('input', this.handler, options)
        document.removeEventListener('change', this.handler, options)
    }

    /**
     * capture
     */
    private capture(event: Event) {
        const { target } = event

        if (
            !target ||
            !(target as Element).tagName ||
            INPUT_TAGS.indexOf((target as Element).tagName) < 0
        ) {
            return
        }
        const type: string | undefined = (target as HTMLInputElement).type

        let text = (target as HTMLInputElement).value

        let isChecked = false

        if (type === 'radio' || type === 'checkbox') {
            isChecked = (target as HTMLInputElement).checked
        }

        this.cbWithDedup(target, { text, isChecked })

        const name: string | undefined = (target as HTMLInputElement).name
        if (type === 'radio' && name && isChecked) {
            document
                .querySelectorAll(`input[type="radio"][name="${name}"]`)
                .forEach((el) => {
                    if (el !== target) {
                        this.cbWithDedup(el, {
                            text: (el as HTMLInputElement).value,
                            isChecked: !isChecked,
                        })
                    }
                })
        }
    }

    private cbWithDedup(target: EventTarget, v: inputValue) {
        const lastInputValue = this.lastInputValueMap.get(target)
        if (
            !lastInputValue ||
            lastInputValue.text !== v.text ||
            lastInputValue.isChecked !== v.isChecked
        ) {
            this.lastInputValueMap.set(target, v)
            const id = _NFMHandler.getId(target as NodeFormated)
            this.callBack({
                type: EventType.IncrementalCapture,
                data: {
                    source: IncrementalSource.Input,
                    id,
                    ...v,
                },
                timestamp: Date.now()
            })
        }
    }
}

export default InputWatcher