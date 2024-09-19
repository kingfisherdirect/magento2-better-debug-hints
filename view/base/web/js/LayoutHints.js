define([
    './highlights',
    './debug/JQueryWidgetDebugger',
    './debug/KnockoutDebugger',
    './debug/MageLayoutDebugger',
    './debug/MageInitDebugger'
], function (highlights, JQueryWidgetDebugger, KnockoutDebugger, MageLayoutDebugger, MageInitDebugger) {
    var colors = {
        blue5:  "36 80 190",
        blue4:  "36 47 155",
        blue3:  "100 111 212",
        blue2:  "155 163 235",
        blue1:  "219 223 253",
        navy:   "42 37 80",
        brown:  "84 18 18",
        orange: "225 70 0"
    }
    var labelStyle = "padding-left: 3px; padding-right: 3px; border-radius: 3px; margin-right: .5em; display: inline-block; font-weight: bold; cursor: pointer;"
    var labelStyleAqua = `${labelStyle} background: rgb(${colors.blue5}); color: white;`
    var labelStyleBlue = `${labelStyle} background: rgb(${colors.blue4}); color: white;`
    var labelStyleNavy = `${labelStyle} background: rgb(${colors.navy}); color: white;`
    var labelStyleBrown = `${labelStyle} background: rgb(${colors.brown}); color: white;`
    var labelStyleOrange = `${labelStyle} background: rgb(${colors.orange}); color: white;`

    return class LayoutHints {
        constructor (mageLayoutTree, initOptions) {
            if (LayoutHints.instance) {
                throw new Error("This function must be called only once. You can access existing instance with LayoutHints.instance")
            }

            LayoutHints.instance = this

            this.debuggers = {}

            this.debuggers.mageLayout = new MageLayoutDebugger(
                mageLayoutTree,
                {
                    largerFontSize: "1.25em",
                    labelStyleNavy,
                    labelStyleBrown,
                    blockEditUrl: initOptions.blockEditUrl,
                }
            )

            this.debuggers.mageInit = new MageInitDebugger({
                largerFontSize: "1.25em",
            })

            this.debuggers.jqueryWidget = new JQueryWidgetDebugger({
                largerFontSize: "1.25em",
            })

            this.debuggers.knockout = new KnockoutDebugger(this, {
                largerFontSize: "1.25em",
                labelStyles: labelStyleBrown,
            })

            this.debuggers.mageInit.badgeStyle = labelStyleBlue
            this.debuggers.mageLayout.badgeStyle = labelStyleOrange
            this.debuggers.jqueryWidget.badgeStyle = labelStyleAqua
            this.debuggers.knockout.badgeStyle = labelStyleBrown

            // set up basic highlight styles
            document.documentElement.style.setProperty('--hl-bg', `rgb(${colors.blue1} / .85)`)
            document.documentElement.style.setProperty('--hl-color', `rgb(${colors.blue4})`)
            document.documentElement.style.setProperty('--hl-border-color', `rgb(${colors.blue2})`)

            this.setupKeyListener()
        }

        inspect (element) {
            var { element: inspectable } = this.findInspectable(element)

            if (!inspectable) {
                console.error("No element found")
                return
            }

            this.highlight(inspectable, { printOnClick: false })
        }

        findInspectable (element) {
            do {
                for (var type in this.debuggers) {
                    var typeDebugger = this.debuggers[type]

                    if (typeof typeDebugger.isInspectable !== 'function' || !typeDebugger.isInspectable(element)) {
                        continue
                    }

                    return { element, debugger: type }
                }
            } while (element = element.parentElement)
        }

        addMouseTracker () {
            this.boundTrackAndHighlight = this.trackAndHighlight.bind(this)
            document.addEventListener("mousemove", this.boundTrackAndHighlight)
        }

        removeMouseTracker () {
            document.removeEventListener("mousemove", this.boundTrackAndHighlight)
        }

        trackAndHighlight (event) {
            highlights.clear()

            var elementUnderMouse = document.elementsFromPoint(event.clientX, event.clientY).shift()
            var { element: closestHighlightable } = this.findInspectable(elementUnderMouse)

            if (!closestHighlightable) {
                return
            }

            this.highlight(closestHighlightable)
        }

        highlight (element) {
            let elementsData = new Map()

            // collect data from debuggers
            for (let type in this.debuggers) {
                const typeDebugger = this.debuggers[type]

                if (typeof typeDebugger.isInspectable !== 'function'
                    || typeof typeDebugger.getHighlightsData !== 'function'
                    || !typeDebugger.isInspectable(element)
                ) {
                    continue
                }

                const highlights = typeDebugger.getHighlightsData(element)

                for (const highlight of highlights) {
                    const highlightedEl = highlight.element || element

                    const elementData = elementsData.get(highlightedEl) || []
                    elementData.push(Object.assign(highlight, { type }))

                    elementsData.set(highlightedEl, elementData)
                }
            }

            for (const [highlightedEl, highlightData] of elementsData) {
                let content = ''

                for (let highlight of highlightData) {
                    content += `<div style="margin-bottom: .25em;">`

                    for (var badge of highlight?.badges || []) {
                        content += `<span style="${this.debuggers[highlight.type].badgeStyle || labelStyleBlue}">${badge}</span>`
                    }

                    content += `<small>@ ${highlight.type}</small>`

                    if (highlight.content) {
                        content += `<div>${highlight.content}</div>`
                    }

                    content += `</div>`
                }

                const highlightOverlay = highlights.create(highlightedEl, content)

                highlightOverlay.addEventListener("click", event => this.onClickHighlight(element, event))
                highlightOverlay.addEventListener("contextmenu", event => this.onRightClickHighlight(element, event))
            }
        }

        onClickHighlight (element, event) {
            if (event.target.tagName === 'A') {
                return
            }

            console.group("Inspecting: ", element)

            for (var type in this.debuggers) {
                if (typeof this.debuggers[type].consolePrint === 'function') {
                    try {
                        this.debuggers[type].consolePrint(element)
                    } catch (e) {
                        console.error(e)
                    }
                }
            }

            console.groupEnd()

            event.preventDefault()
            highlights.clear()
            this.removeMouseTracker()
        }

        onRightClickHighlight (element, event) {
            event.preventDefault()
            highlights.clear()
            this.removeMouseTracker()

            const inspectable = this.findInspectable(element)

            // offload parent element searching to current debugger
            const parentInspectables = inspectable && typeof this.debuggers[inspectable.debugger]?.parentInspectableElements === 'function'
                ? this.debuggers[inspectable.debugger].parentInspectableElements(element)
                : []

            // only consider it it's parent in debugger, but sibbling in HTML DOM
            if (parentInspectables[0] && parentInspectables[0].parentElement === element.parentElement) {
                return this.highlight(parentInspectables[0])
            }

            if (!element.parentElement) {
                return
            }

            var { element: parentInspectable } = this.findInspectable(element.parentElement)

            if (!parentInspectable) {
                return
            }

            this.highlight(parentInspectable)
        }

        setupKeyListener () {
            document.addEventListener("keydown", event => {
                if (event.code === 'Escape') {
                    this.removeMouseTracker()
                    highlights.clear()

                    return
                }

                if (event.code === 'Backquote') {
                    this.addMouseTracker()

                    return
                }
            })
        }
    }
})
