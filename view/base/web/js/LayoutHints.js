define([
    './highlights',
    './debug/KnockoutDebugger',
    './debug/MageLayoutDebugger'
], function (highlights, KnockoutDebugger, MageLayoutDebugger) {
    var colors = {
        blue4: "36 47 155",
        blue3: "100 111 212",
        blue2: "155 163 235",
        blue1: "219 223 253",
        navy:  "42 37 80",
        brown: "84 18 18",
    }
    var labelStyle = "padding-left: 3px; padding-right: 3px; border-radius: 3px; margin-right: .5em; display: inline-block; cursor: pointer;"
    var labelStyleBlue = `${labelStyle} background: rgb(${colors.blue4}); color: white;`
    var labelStyleNavy = `${labelStyle} background: rgb(${colors.navy}); color: white;`
    var labelStyleBrown = `${labelStyle} background: rgb(${colors.brown}); color: white;`

    return class LayoutHints {
        constructor (mageLayoutTree, initOptions) {
            if (LayoutHints.instance) {
                throw new Error("This function must be called only once. You can access existing instance with LayoutHints.instance")
            }

            LayoutHints.instance = this

            this.debuggers = {}
            this.debuggers.mage = new MageLayoutDebugger(
                this,
                mageLayoutTree,
                {
                    largerFontSize: "1.25em",
                    labelStyleBlue,
                    labelStyleNavy,
                    labelStyleBrown,
                    blockEditUrl: initOptions.blockEditUrl
                }
            )

            this.debuggers.knockout = new KnockoutDebugger(
                this,
                {
                    largerFontSize: "1.25em",
                    labelStyles: labelStyleBrown,
                }
            )

            // set up basic highlight styles
            document.documentElement.style.setProperty('--hl-bg', `rgb(${colors.blue1} / .85)`)
            document.documentElement.style.setProperty('--hl-color', `rgb(${colors.blue4})`)
            document.documentElement.style.setProperty('--hl-border-color', `rgb(${colors.blue2})`)

            this.setupKeyListener()
        }

        inspect (element) {
            var inspectable = findInspectable(element)

            if (!inspectable) {
                console.error("No element found")
                return
            }

            highlight(inspectable, { printOnClick: false })
            consolePrint(inspectable)
        }

        findInspectable (element) {
            do {
                for (var type in this.debuggers) {
                    var typeDebugger = this.debuggers[type]

                    if (!typeDebugger.isInspectable(element)) {
                        continue
                    }

                    var inspectable = typeDebugger.getInspectable(element)
                    inspectable.type = type

                    return inspectable
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
            var closestHighlightable = this.findInspectable(elementUnderMouse)

            if (!closestHighlightable) {
                return
            }

            this.highlight(closestHighlightable)
        }

        highlight (data, options) {
            if (!this.debuggers[data.type]) {
                throw new Error(`Cannot highlight element of type ${data.type}`)
            }

            return this.debuggers[data.type].highlight(data, options)
        }

        consolePrint (data, options) {
            if (!this.debuggers[data.type]) {
                throw new Error(`Cannot consolePrint element of type ${data.type}`)
            }

            return this.debuggers[data.type].consolePrint(data, options)
        }

        onClickHighlight (e) {
            if (e.target.tagName === 'A') {
                return
            }

            e.preventDefault()
            highlights.clear()
            this.removeMouseTracker()
        }

        onRightClickHighlight (inspectable, event) {
            event.preventDefault()
            highlights.clear()
            this.removeMouseTracker()

            if (!inspectable.element.parentElement) {
                return
            }

            var parentInspectable = this.findInspectable(inspectable.element.parentElement)

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
