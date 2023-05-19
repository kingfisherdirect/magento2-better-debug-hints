define([], function () {
    return class MageInitDebugger {
        constructor (options = {}) {
            this.largerFontSize = options.largerFontSize || '1em'

            this.inits = new Map()
            this.collectInits()
        }

        collectInits () {
            var mageInits = document.querySelectorAll('[data-mage-init], script[type="text/x-magento-init"]')

            for (var el of mageInits) {
                var script = el.tagName === 'SCRIPT'
                    ? el
                    : null

                var targetElement = script
                    ? el.parentElement
                    : el

                var elementInits = this.inits.has(targetElement)
                    ? this.inits.get(targetElement)
                    : []

                var mageInit = JSON.parse(script
                    ? el.innerHTML
                    : el.dataset.mageInit)

                elementInits.push({
                    el: targetElement,
                    script,
                    mageInit
                })

                this.inits.set(targetElement, elementInits)
            }
        }

        isInspectable (element) {
            return this.inits.has(element)
        }

        getHighlightsData (element) {
            const highlightData = []

            const init = this.inits.get(element)
            const badges = [`${init.length} inits`]

            let insideInits = 0
            let headInits = 0

            for (var [initElement, initConfigs] of this.inits) {
                if (element.contains(initElement) && initElement !== element) {
                    insideInits += initConfigs.length
                }

                if (element === document.body && document.head.contains(initElement)) {
                    headInits += initConfigs.length
                }
            }

            if (insideInits > 0) {
                badges.push(`${insideInits} inside`)
            }

            if (headInits > 0) {
                badges.push(`${headInits} head inits`)
            }

            return [{ badges }]
        }

        consolePrint (element) {
            const inits = this.inits.get(element)

            if (!inits) {
                return
            }

            inits.forEach(init => {
                const initType = init.script
                    ? '<script> init'
                    : 'data-mage-init'

                console.group(`%c${initType}`, `${this.badgeStyle || ''}; font-size: ${this.largerFontSize}`)
                if (element !== init.el) {
                    console.log("Element: ", init.el)
                }
                console.log("Options: ", init.mageInit)
                console.groupEnd()
            })

            if (element === document.body) {
                console.group('%cHead Inits:', `font-size: ${this.largerFontSize}`)
                this.consolePrint(document.head)
                console.groupEnd()
            }
        }

        getInspectablesInside (elements) {
            if (!Array.isArray(elements)) {
                elements = [elements]
            }

            var matches = []

            if (elements.includes(document.body)) {
                matches = this.inits.keys()
            } else {
                for (var element of elements) {
                    for (var [initElement] of this.inits) {
                        if (element === initElement || element.contains(initElement)) {
                            matches.push(initElement)
                        }
                    }
                }
            }

            var allInits = []

            for (var element of matches) {
                allInits.push(...this.inits.get(element))
            }

            return allInits
        }
    }
})
