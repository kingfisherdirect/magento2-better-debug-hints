define(['jquery', 'jquery-ui-modules/widget'], function ($) {
    const registeredWidgets = []
    const initialized = []

    $.widget = function (_super) {
        const func = function () {
            const constructorFn = _super.apply(this, arguments)

            if (!registeredWidgets.includes(arguments[0])) {
                const parent = typeof arguments[1] === 'function'
                    ? arguments[1]
                    : null

                const nameParts = arguments[0].split('.')
                const name = nameParts[nameParts.length - 1]

                const trace = (new Error()).stack.split("\n")
                const definedAt = trace
                    .find(line => line.match(/\/version\d+\//) && !line.includes("BetterDebugHints"))
                    ?.replace(/^@/, '')

                registeredWidgets.push({
                    fullName: arguments[0],
                    name,
                    parent,
                    constructorFn,
                    definedAt
                })
            }

            return constructorFn
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

                const unusedText = unusedWidgets.map(w => {
                    const definedAtParts = w.definedAt.split(/version\d+\//)
                    const definedAt = definedAtParts[definedAtParts.length - 1]

                    return `${w.fullName} <small style="opacity: .6">@ ${definedAt}</small>`
                }).join("\n")

                highlightsData.push({
                    badges: [`${unusedWidgets.length} Unused jQuery Widgets`],
                    content: `<pre>${unusedText}</pre>`
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
            const registeredWidgetsRev = [...registeredWidgets].reverse()
            const usedWidgets = new Set()

            for (const init of initialized) {
                const directlyUsedWidget = registeredWidgetsRev.find(widget => init.widget === widget.name)

                if (!directlyUsedWidget) {
                    continue
                }

                usedWidgets.add(directlyUsedWidget)
                let parentConstructor = directlyUsedWidget.parent

                while (parentConstructor) {
                    const parentInit = registeredWidgetsRev.find(widget => widget.constructorFn === parentConstructor)

                    if (!parentInit) {
                        break
                    }

                    usedWidgets.add(parentInit)
                    parentConstructor = parentInit.parent

                    console.log(parentInit)
                }
            }

            return registeredWidgets.filter(widget => !usedWidgets.has(widget))
        }

        dump () {
            console.log("JQuery Registered Widgets: ", registeredWidgets)
            console.log("JQuery Widget Usage: ", initialized)

            console.log("Unused widgets: ", this.filterUnusedWidgets())
        }
    }
})
