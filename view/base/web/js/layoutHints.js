define([], function () {
    var colors = {
        blue: "rgb(36, 47, 155)",
        highlightBackground: "rgba(219, 223, 253, 0.85)",
        navy: "rgb(42, 37, 80)"
    }
    var labelStyle = "padding-left: 3px; padding-right: 3px; border-radius: 3px; margin-right: .5em; display: inline-block; cursor: pointer;"
    var labelStyleBlue = `${labelStyle} background: ${colors.blue}; color: white;`
    var labelStyleNavy = `${labelStyle} background: ${colors.navy}; color: white;`

    var highlightEls = []

    return function layoutHints (layout) {
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
        var groupName = layoutElement.name ? [layoutElement.name] : layoutElement.handles
        var groupNameWithStyles = '%c' + groupName.join('%c')

        var label = layoutElement.label || ''
        var mainLabelStyles = 'font-size: 1.25em; font-weight: bold;'

        if (!collapse) {
            console.group(
                `${groupNameWithStyles}%c${label}`,
                ...groupName.map(a => `${labelStyleBlue} ${mainLabelStyles}`),
                `${labelStyleNavy} ${mainLabelStyles}`
            )
        } else {
            console.groupCollapsed(
                `%c${groupPrefix}${groupNameWithStyles}%c${label}`,
                'font-weight:bold',
                ...groupName.map(a => labelStyleBlue),
                `${labelStyleNavy}`
            )
        }

        console.log(`Name:\n%c${groupName.join(" ")}`, "font-weight: bold;");

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
        var names = layoutElement.name ? [layoutElement.name] : layoutElement.handles
        var namesHtml = names.map(n => `<b style="${labelStyleBlue}">${n}</b>`).join('')

        var alias = layoutElement.alias ? `Alias: <b>${layoutElement.alias}</b>` : ''
        var label = layoutElement.label ? `<span style="${labelStyleNavy}">${layoutElement.label}</span>` : ''

        var content = `<p>${namesHtml} ${alias} ${label}</p>`

        if (layoutElement.block) {
            content += `
                <p><code style="background: transparent">${layoutElement.block.class}</code></p>
                <p><code style="background: transparent">${layoutElement.block.template}</code></p>
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
        highlightEl.style.backgroundColor = colors.highlightBackground
        highlightEl.style.border = `1px solid ${colors.blue}`
        highlightEl.style.color = colors.blue
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
