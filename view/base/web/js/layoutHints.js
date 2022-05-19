define([], function () {
    var highlightEls = []

    return function layoutHints (layout) {
        layout.name = layout.handles.join("; ")
        layout.elements = [document.body]
        document.body.mageLayout = layout

        var flat = flattenStructure(layout)

        for (var childName in flat) {
            var layoutElement = flat[childName]
            collectElements(childName, layoutElement)
        }

        document.addEventListener("keydown", function (event) {
            if (event.code === 'Escape') {
                removeMouseTracker()
                clearHighlights()

                return
            }

            if (event.code === 'Backquote') {
                addMouseTracker()

                return
            }
        })

        return function (element) {
            var mageElement = findMageElement(element)

            if (!mageElement) {
                console.error("No element found")
                return
            }

            var layoutElement = mageElement.mageLayout

            highlightMageElements(layoutElement, false)
            printLayout(layoutElement)
        }
    }

    function flattenStructure (layout) {
        var flat = {}

        for (var name in layout.children) {
            var child = layout.children[name]
            flat[name] = child
            child.name = name
            child.parent = layout

            if (child.children) {
                Object.assign(flat, flattenStructure(child))
            }
        }

        return flat
    }

    function collectElements (name, layoutElement) {
        var matching = Array.from(document.querySelectorAll(`[data-mage-debug='${name}']`))

        var nonHelpers = matching.filter(el => el.tagName !== 'script' && el.type !== 'text/mage-debug')
        layoutElement.elements = nonHelpers

        var starting = matching.find(el => el.dataset.mageDebugPosition === 'start')
        var ending = matching.find(el => el.dataset.mageDebugPosition === 'end')

        if (nonHelpers.length === 0 && starting && ending) {
            if (starting.parentElement === ending.parentElement) {
                var parent = starting.parentElement
                var started = false

                for (var child of parent.children) {
                    if (!started) {
                        if (child === starting) {
                            started = true
                        }

                        continue
                    }

                    if (child === ending) {
                        break
                    }

                    layoutElement.elements.push(child)
                }
            }
        }

        layoutElement.elements.forEach(el => el.mageLayout = layoutElement)

        starting && starting.remove()
        ending && ending.remove()
    }

    function findMageElement (element) {
        do {
            if (element.mageLayout) {
                return element
            }
        } while(element = element.parentElement)
    }

    function printLayout (layoutElement, { collapse = false, withParent = true, withChildren = true, groupPrefix = '' } = {}) {
        var groupName = layoutElement.name

        layoutElement.label

        if (!collapse) {
            console.group(
                `%c${groupName}`,
                "font-size: 1.25em; font-weight: bold; background: rgb(36, 47, 155); color: rgb(219, 223, 253); padding: 3px; border-radius: 3px; display: inline-block; cursor: pointer;"
            )
        } else {
            console.groupCollapsed(
                `%c${groupPrefix}%c${groupName}`,
                'font-weight:bold',
                'background: rgb(36, 47, 155); color: rgb(219, 223, 253); padding: 0 3px; border-radius: 3px; cursor: pointer'
            )
        }

        console.log(`Name:\n%c${layoutElement.name}`, "font-weight: bold;");

        if (layoutElement.label) {
            console.log(`Label:\n%c${layoutElement.label}`, "font-weight: bold;");
        }

        if (layoutElement.alias) {
            console.log(`Alias:\n%c${layoutElement.alias}`, "font-weight: bold;");
        }

        if (layoutElement.block) {
            console.log(`Class:\n%c${layoutElement.block.class}`, "font-size: 1.25em; font-weight: bold;");
            console.log(`Template:\n%c${layoutElement.block.template}`, "font-size: 1.25em; font-weight: bold;");

            if (layoutElement.block.moduleName) {
                console.log(`Module Name:\n%c${layoutElement.block.moduleName}`, "font-weight: bold;");
            }
        }

        if (layoutElement.parent && withParent) {
            printLayout(layoutElement.parent, { collapse: true, withChildren: false, groupPrefix: "Parent: " })
        }

        if (layoutElement.children && withChildren) {
            console.groupCollapsed("Children", layoutElement.children)
            for (var childName in layoutElement.children) {
                printLayout(layoutElement.children[childName], { collapse: true, withParent: false })
            }
            console.groupEnd()
        }

        if (layoutElement.elements && layoutElement.elements.length > 0) {
            console.log(`DOM:`, layoutElement.elements.length === 1 ? layoutElement.elements[0] : layoutElement.elements)
        }

        console.groupEnd()
    }

    function addMouseTracker () {
        document.addEventListener("mousemove", trackAndHighlight)
    }

    function removeMouseTracker () {
        document.removeEventListener("mousemove", trackAndHighlight)
    }

    function trackAndHighlight (event) {
        clearHighlights()

        var elementUnderMouse = document.elementsFromPoint(event.clientX, event.clientY).shift()
        var closestMagentoElement = findMageElement(elementUnderMouse)

        if (!closestMagentoElement) {
            return
        }

        highlightMageElements(closestMagentoElement.mageLayout)
    }

    function highlightMageElements (layoutElement, printOnClick = true) {
        var alias = layoutElement.alias ? `Alias: ${layoutElement.alias}` : ''
        var label = layoutElement.label ? `Label: <u>${layoutElement.label}</u>` : ''

        var title = [`<b>${layoutElement.name}</b>`, alias, label].filter(a => a).join("; ")
        var content = `<p>${title}</p>`

        if (layoutElement.block) {
            content += `
                <p>
                    <b>${layoutElement.block.class}</b>
                    <br/>
                    <b>${layoutElement.block.template}</b>
                </p>
            `
        }

        if (layoutElement.moduleName) {
            content += '<p><small>${layoutElement.moduleName}</small></p>'
        }

        for (var domEl of layoutElement.elements) {
            highlightElement(domEl, content, printOnClick)
        }
    }

    function highlightElement (element, html, printOnClick = true) {
        var highlightEl = document.createElement('div')
        highlightEl.style.position = "absolute"
        highlightEl.style.backgroundColor = "rgba(219, 223, 253, 0.85)"
        highlightEl.style.border = "1px solid rgb(155, 163, 235)"
        highlightEl.style.color = "rgb(36, 47, 155)"
        highlightEl.style.textShadow = "0 0 1px white"
        highlightEl.style.zIndex = 999999
        highlightEl.style.padding = ".5em"
        highlightEl.style.cursor = "pointer"
        highlightEl.style.fontSize = ".8rem"

        if (html) {
            highlightEl.innerHTML = `
                <div style="position: sticky; top: .5em">
                ${html}
                </div>
            `
        }

        highlightEls.push(highlightEl)
        document.body.appendChild(highlightEl)

        var elPos = element.getBoundingClientRect()

        highlightEl.style.left = window.scrollX + elPos.left + "px"
        highlightEl.style.top = window.scrollY + elPos.top + "px"
        highlightEl.style.width = elPos.width + "px"
        highlightEl.style.height = elPos.height + "px"

        highlightEl.addEventListener("click", function (e) {
            e.preventDefault()
            clearHighlights()
            removeMouseTracker()

            if (printOnClick) {
                printLayout(element.mageLayout)
            }
        })

        highlightEl.addEventListener("contextmenu", function (e) {
            e.preventDefault()
            clearHighlights()
            removeMouseTracker()

            var parentMage = findMageElement(element.parentElement)

            if (!parentMage) {
                return
            }

            highlightMageElements(parentMage.mageLayout)
        })
    }

    function clearHighlights () {
        for (var highlightEl of highlightEls) {
            highlightEl.remove()
        }

        highlightEls = []
    }
})
