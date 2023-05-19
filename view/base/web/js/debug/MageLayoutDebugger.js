define(['../highlights'], function (highlights) {
    return class MageLayoutDebugger {
        constructor (layoutTree, options = {}) {
            this.mageInitDebugger = options.mageInitDebugger
            this.blockEditUrl = options.blockEditUrl

            this.largerFontSize = options.largerFontSize || '1em'
            this.labelStyleBrown = options.labelStyleBrown || ''
            this.labelStyleNavy = options.labelStyleNavy || ''

            layoutTree.elements = [document.body]
            document.body.mageLayout = layoutTree

            this.layoutItems = this.flattenLayout(layoutTree)

            for (var childName in this.layoutItems) {
                var layoutElement = this.layoutItems[childName]
                this.collectElements(childName, layoutElement)
            }
        }

        /**
         * HTML layout structure comes as a tree. This funciton flattens it and
         * creates a parent and name properties
         */
        flattenLayout (layout) {
            var flat = {}

            for (var name in layout.children) {
                var child = layout.children[name]
                flat[name] = child
                child.name = name
                child.parent = layout

                if (child.children) {
                    Object.assign(flat, this.flattenLayout(child))
                }
            }

            return flat
        }

        /**
         * Function runs for each layout item and tries to collect it's HTML
         * elements.
         *
         * It does try to find 2 script tags:
         * - `<script type="text/mage-debug" data-mage-debug-position="start"></script>`
         * - `<script type="text/mage-debug" data-mage-debug-position="end"></script>`
         *
         * And then it considers everything in between as a layout output
         */
        collectElements (name, layoutElement) {
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

        isInspectable (element) {
            return !!element.mageLayout
        }

        getInspectable (element) {
            if (!element.mageLayout) {
                throw new Error("This element is not inspectable!")
            }

            return { layout: element.mageLayout }
        }

        getHighlightsData (element) {
            const layout = element.mageLayout
            const badges = layout.name ? [layout.name] : layout.handles

            if (layout.alias) {
                badges.push(`Alias: ${layout.alias}`)
            }

            var label = layout.label ? `<span>Label: <b>${layout.label}</b></span>` : ''

            var blockEditUrl = this.blockEditUrl && layout.blockId ? this.blockEditUrl.replace("__id__", layout.blockId) : null
            var blockId = blockEditUrl && layout.blockId ? `<a href="${blockEditUrl}">Edit Block <b>#${layout.blockId}</b></a>` : ''

            var content = `<div>${blockId} ${label}</div>`

            if (layout.block) {
                content += `
                    <div>Class: <code style="background: transparent">${layout.block.class}</code></div>
                    <div>Template: <code style="background: transparent">${layout.block.template}</code></div>
                `
            }

            if (layout.moduleName) {
                content += '<p><small>${layout.moduleName}</small></p>'
            }

            return layout.elements.map(element => {
                return {
                    element,
                    badges,
                    content
                }
            })
        }

        consolePrint (element, options = {}) {
            let collapse = false

            while (!element.mageLayout) {
                if (!element.parentElement) {
                    return
                }

                element = element.parentElement
                collapse = true
            }

            return this.consolePrintElementData(
                { layout: element.mageLayout },
                Object.assign({}, options, {
                    collapse,
                    groupPrefix: collapse ? 'Closest Layout Element: ' : ''
                }))
        }

        consolePrintElementData (elementData, { collapse = false, withParent = true, withChildren = true, groupPrefix = '' } = {}) {
            const layoutElement = elementData.layout
            const groupName = layoutElement.name ? [layoutElement.name] : layoutElement.handles

            const groupNameWithStyles = '%c' + groupName.join('%c')

            const label = layoutElement.label || ''
            const blockId = layoutElement.blockId ? `Block: ${layoutElement.blockId}` : ''

            if (!collapse) {
                console.group(
                    `${groupNameWithStyles}%c${blockId}%c${label}`,
                    ...groupName.map(() => `${this.badgeStyle} font-size: ${this.largerFontSize}`),
                    `${this.labelStyleBrown} font-size: ${this.largerFontSize}`,
                    `${this.labelStyleNavy} font-size: ${this.largerFontSize}`
                )
            } else {
                console.groupCollapsed(
                    `${groupPrefix}${groupNameWithStyles}%c${blockId}%c${label}`,
                    ...groupName.map(a => this.badgeStyle),
                    `${this.labelStyleBrown}`,
                    `${this.labelStyleNavy}`
                )
            }

            console.log(`Name:\n%c${groupName.join(" ")}`, "font-weight: bold;");

            if (layoutElement.blockId && this.blockEditUrl) {
                const editUrl = this.blockEditUrl.replace("__id__", layoutElement.blockId)
                console.log(`Edit Block:\n%c${editUrl}`, "font-weight: bold;")
            }

            if (layoutElement.label) {
                console.log(`Label:\n%c${layoutElement.label}`, "font-weight: bold;");
            }

            if (layoutElement.alias) {
                console.log(`Alias:\n%c${layoutElement.alias}`, "font-weight: bold;");
            }

            if (layoutElement.block) {
                console.log(`Class:\n%c${layoutElement.block.class}`, `font-size: ${this.largerFontSize}; font-weight: bold;`);
                console.log(`Template:\n%c${layoutElement.block.template}`, `font-size: ${this.largerFontSize}; font-weight: bold;`);

                if (layoutElement.block.moduleName) {
                    console.log(`Module Name:\n%c${layoutElement.block.moduleName}`, "font-weight: bold;");
                }
            }

            if (layoutElement.parent && withParent) {
                console.log(layoutElement.parent)
                // parent element will be certainly magento layout
                this.consolePrintElementData({ layout: layoutElement.parent }, { collapse: true, withChildren: false, groupPrefix: "Parent: " })
            }

            if (layoutElement.children && withChildren) {
                console.groupCollapsed("Children")

                for (var childName in layoutElement.children) {
                    // only same type child supported
                    this.consolePrintElementData({ layout: layoutElement.children[childName] }, { collapse: true, withParent: false })
                }

                console.groupEnd()
            }

            if (layoutElement.elements && layoutElement.elements.length > 0) {
                console.log(`DOM:`, ...layoutElement.elements)
            }

            if (this.mageInitDebugger) {
                var initInspectables = this.mageInitDebugger.getInspectablesInside(layoutElement.elements)

                if (initInspectables && initInspectables.length > 0) {
                    console.log(`Mage Inits (${initInspectables.length}):`)

                    for (var initInspectable of initInspectables) {
                        if (initInspectable.script) {
                            console.log(initInspectable.el, JSON.parse(initInspectable.mageInit), initInspectable.script)
                            continue
                        }

                        console.log(initInspectable.el, JSON.parse(initInspectable.mageInit))
                    }
                }
            }

            console.groupEnd()
        }

        graph (el) {
            var inspectable = this.getInspectable(el || document.body)

            var graph = this.graphLayout(inspectable.layout)

            var fullGraph = `
digraph {
    rankdir="LR"
    splines=polyline

    graph [autosize=false]

    graph [fontname = "Courier"]
    node [fontname = "Courier"]
    edge [fontname = "Courier"]

    ${graph}
}
`

            navigator.clipboard.writeText(fullGraph)
                .then(() => console.log("Written to clipboard"))

            return `http://magjac.com/graphviz-visual-editor/?dot=${encodeURIComponent(fullGraph)}`
        }

        graphLayout (layout, parentName) {
            var name = layout.handles ? "root" : layout.name

            var attributes = {
                shape: "box",
                // label: `${name}`,
                label: `<tr><td align="left" width="100%"><b>${name}</b></td></tr>`,
                style: [],
            }

            if (layout.block) {
                var className = layout.block.class.replace(/\\/g, "\\\\")
                // attributes.label += `\\l${className}`
                attributes.label += `<tr><td align="left" width="100%">${className}</td></tr>`
                attributes.style.push('rounded')

                if (layout.block.template) {
                    var template = layout.block.template.replace(/^([a-zA-Z\/\-\_]+(\/app\/code|\/vendor\/))/, "$2")

                    // attributes.label += `\\l${template}`
                    attributes.label += `<tr><td align="left" width="100%">${template}</td></tr>`
                }

                if (layout.blockId) {
                    attributes.style.push('filled')
                    attributes.fillcolor = "gray90"
                    attributes.color = "gray40"
                    attributes.fontcolor = "gray40"
                }
            } else {
                attributes.style.push('filled')
                attributes.fillcolor = "lightyellow"
            }

            attributes.label = `<table border="0">${attributes.label}</table>`
            // attributes.label += '\\l'

            if (layout.alias) {
                attributes.color = "blue"
            }

            var graph = `"${name}" [${this.objectToDotAttributes(attributes, { htmlLabel: true })}];` + "\n"

            if (parentName) {
                graph += `"${parentName}" -> "${name}";` + "\n"
            }

            if (layout.children) {
                for (let childName in layout.children) {
                    graph += this.graphLayout(layout.children[childName], name)
                }
            }

            return graph
        }

        objectToDotAttributes (object, { htmlLabel = false } = {}) {
            var attributes = []

            for (let key in object) {
                let value = object[key]

                if (Array.isArray(value)) {
                    value = value.join(",")
                }

                if (key === 'label' && htmlLabel) {
                    value = `<${value}>`
                } else if (typeof value === 'string') {
                    value = `"${value}"`
                }

                attributes.push(`${key}=${value}`)
            }

            return attributes.join(', ')
        }
    }
})
