const symbolAndNumberRegex = RegExp('[^a-z1-6-]')

export function getCssRulesString(s: CSSStyleSheet): string | null {
    const CSStoString = (prev: string, cur: CSSRule) => prev + getCssRuleString(cur)
    try {
        const rules = s.rules || s.cssRules
        return rules
            ? Array.from(rules).reduce(CSStoString, '')
            : null
    } catch (error) {
        return null
    }
}

function getCssRuleString(rule: CSSRule): string {
    return isCSSImportRule(rule)
        ? getCssRulesString(rule.styleSheet) || ''
        : rule.cssText
}

function isCSSImportRule(rule: CSSRule): rule is CSSImportRule {
    return 'styleSheet' in rule
}

function extractOrigin(url: string): string {
    let origin
    if (url.indexOf('//') > -1) {
        origin = url.split('/').slice(0, 3).join('/')
    } else {
        origin = url.split('/')[0]
    }
    origin = origin.split('?')[0]
    return origin
}

const URL_IN_CSS_REF = /url\((?:'([^']*)'|"([^"]*)"|([^)]*))\)/gm
const RELATIVE_PATH = /^(?!www\.|(?:http|ftp)s?:\/\/|[A-Za-z]:\\|\/\/).*/
const DATA_URI = /^(data:)([\w\/\+\-]+);(charset=[\w-]+|base64).*,(.*)/i

// export function absoluteToStylesheet(
//     cssText: string | null,
//     href: string,
// ): string {
//     return (cssText || '').replace(
//         URL_IN_CSS_REF,
//         (origin, path1, path2, path3) => {
//             const filePath = path1 || path2 || path3
//             if (!filePath) {
//                 return origin
//             }
//             if (!RELATIVE_PATH.test(filePath)) {
//                 return `url('${filePath}')`
//             }
//             if (DATA_URI.test(filePath)) {
//                 return `url(${filePath})`
//             }
//             if (filePath[0] === '/') {
//                 return `url('${extractOrigin(href) + filePath}')`
//             }
//             const stack = href.split('/')
//             const parts = filePath.split('/')
//             stack.pop()
//             for (const part of parts) {
//                 if (part === '.') {
//                     continue
//                 } else if (part === '..') {
//                     stack.pop()
//                 } else {
//                     stack.push(part)
//                 }
//             }
//             return `url('${stack.join('/')}')`
//         },
//     )
// }

function getAbsoluteSrcsetString(doc: Document, attributeValue: string) {
    if (attributeValue.trim() === '') {
        return attributeValue
    }

    const srcsetValues = attributeValue.split(',')
    // srcset attributes is defined as such:
    // srcset = "url size,url1 size1"
    const resultingSrcsetString = srcsetValues
        .map((srcItem) => {
            // removing all but middle spaces
            const trimmedSrcItem = srcItem.trimLeft().trimRight()
            const urlAndSize = trimmedSrcItem.split(' ')
            // this means we have both 0:url and 1:size
            if (urlAndSize.length === 2) {
                const absUrl = absoluteToDoc(doc, urlAndSize[0])
                return `${absUrl} ${urlAndSize[1]}`
            } else if (urlAndSize.length === 1) {
                const absUrl = absoluteToDoc(doc, urlAndSize[0])
                return `${absUrl}`
            }
            return ''
        })
        .join(', ');

    return resultingSrcsetString
}

export function absoluteToDoc(doc: Document, attributeValue: string): string {
    if (!attributeValue || attributeValue.trim() === '') {
        return attributeValue
    }
    const a: HTMLAnchorElement = doc.createElement('a')
    a.href = attributeValue
    return a.href
}

export function transformAttribute(
    doc: Document,
    name: string,
    value: string,
): string {
    // relative path in attribute
    if (name === 'src' || (name === 'href' && value)) {
        return absoluteToDoc(doc, value)
    } else if (name === 'srcset' && value) {
        return getAbsoluteSrcsetString(doc, value)
    } else {
        return value
    }
}

export function getStylesheet(doc: Document, n: Node) {
    return Array.from(doc.styleSheets).find(s => {
        return s.href === (n as HTMLLinkElement).href
    })
}