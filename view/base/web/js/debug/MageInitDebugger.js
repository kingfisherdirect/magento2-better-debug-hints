define([], function () {
    return class MageInitDebugger {
        constructor (layoutHints) {
            this.layoutHints = layoutHints
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

                var mageInit = script
                    ? el.innerHTML
                    : el.dataset.mageInit

                elementInits.push({
                    el: targetElement,
                    script,
                    mageInit
                })

                this.inits.set(targetElement, elementInits)
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
