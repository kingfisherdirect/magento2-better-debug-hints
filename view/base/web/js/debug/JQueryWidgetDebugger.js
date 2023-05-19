define(['jquery', '../highlights', 'jquery-ui-modules/widget'], function ($, highlights) {
    const registeredWidgets = []
    const initialized = []

    $.widget = function (_super) {
        const func = function () {
            if (!registeredWidgets.includes(arguments[0])) {
                registeredWidgets.push(arguments[0])
            }

            _super.apply(this, arguments)
        }

        Object.assign(func, _super)

        return func
    }($.widget)

    $.Widget = class extends $.Widget {
        _createWidget() {
            initialized.push({ widget: this.widgetName, element: arguments[1], options: arguments[0] })
            super._createWidget(...arguments)
        }
    }

    return class JQueryWidgetDebugger {
        constructor (options = {}) {
            this.largerFontSize = options.largerFontSize || '1em'
        }

        isInspectable (element) {
            return !!initialized.find(i => i.element === element)
        }

        getInspectable (element) {
            const inspectable = initialized.find(i => i.element === element)

            if (!inspectable) {
                throw new Error("This element is not inspectable!")
            }

            return inspectable
        }

        getHighlightsData (element) {
            const elementInitialized = initialized.filter(i => i.element === element)

            const highlightsData = elementInitialized.map(i => {
                return {
                    badges: ["$." + i.widget],
                    content: `<pre>${JSON.stringify(i.options, null, 2)}</pre>`
                }
            })

            if (element === document.body) {
                const unusedWidgets = this.filterUnusedWidgets()

                highlightsData.push({
                    badges: [`${unusedWidgets.length} Unused jQuery Widgets`],
                    content: `<pre>${unusedWidgets.join('; ')}</pre>`
                })
            }

            return highlightsData
        }

        consolePrint (element) {
            const inits = initialized.filter(i => i.element === element)

            if (!inits.length === 0) {
                return
            }

            inits.forEach(initData => {
                console.group(
                    `%c$.${initData.widget}`,
                    `${this.badgeStyle || ''}; font-size: ${this.largerFontSize}`,
                )
                console.log("Options: ", initData.options)
                console.groupEnd()
            })

            if (document.body === element) {
                console.log("Unused jQuery Widgets: ", this.filterUnusedWidgets())
            }
        }

        filterUnusedWidgets () {
            return registeredWidgets.filter(widgetName => {
                const parts = widgetName.split('.')
                const name = parts[parts.length - 1]

                return !initialized.find(init => init.widget === name)
            })
        }

        dump () {
            console.log("JQuery Registered Widgets: ", registeredWidgets)
            console.log("JQuery Widget Usage: ", initialized)

            console.log("Unused widgets: ", this.filterUnusedWidgets())
        }
    }
})
