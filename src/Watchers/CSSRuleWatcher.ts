import { NodeFormated } from '../NodeCaptor/types';
import { eventWithTime, EventType, IncrementalSource, inputValue, styleSheetRuleParam } from '../Recorder/types';
import { mirror } from '../Recorder/utils';


class CSSRuleWatcher {
    private callBack: (p: eventWithTime) => void

    constructor(cb: (p: eventWithTime) => void) {
        this.callBack = cb
    }

    /**
     * watch
     */
    public watch() {
        const insertRule = CSSStyleSheet.prototype.insertRule
        const self = this
        CSSStyleSheet.prototype.insertRule = function (
            rule: string,
            index?: number,
        ) {
            const id = mirror.getId(this.ownerNode as NodeFormated)
            if (id !== -1) {
                self.capture({
                    type: 'insert',
                    id,
                    adds: [{ rule, index }]
                })
            }
            return insertRule.apply(this, arguments)
        }

        const deleteRule = CSSStyleSheet.prototype.deleteRule
        CSSStyleSheet.prototype.deleteRule = function (index: number) {
            const id = mirror.getId(this.ownerNode as NodeFormated)
            if (id !== -1) {
                self.capture({
                    type: 'remove',
                    id,
                    removes: [{ index }]
                })
            }
            return deleteRule.apply(this, arguments)
        }
    }

    /**
     * capture
     */
    private capture(evt: (styleSheetRuleParam & { type: string })) {
        if (evt.type === 'insert') {
            this.callBack({
                type: EventType.IncrementalSnapshot,
                data: {
                    source: IncrementalSource.StyleSheetRule,
                    id: evt.id,
                    adds: evt.adds,
                },
                timestamp: Date.now()
            })
        } else {
            this.callBack({
                type: EventType.IncrementalSnapshot,
                data: {
                    source: IncrementalSource.StyleSheetRule,
                    id: evt.id,
                    removes: evt.removes,
                },
                timestamp: Date.now()
            })
        }
    }
}

export default CSSRuleWatcher