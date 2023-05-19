define(['knockout', '../highlights'], function (ko, highlights) {
    function getNames (data) {
        var $data = data.context.$data
        var names = []

        var name = $data.name || $data.component || $data.template
        if (name) {
            names.push(name)
        }

        for (var template of data.templates) {
            names.push(template instanceof Node ? `<!-- ${template.textContent} -->` : template)
        }

        return names
    }

    return class KnockoutDebugger {
        constructor (layoutHints, options = {}) {
            this.layoutHints = layoutHints

            this.largerFontSize = options.largerFontSize || '1em'

            this.initTemplateCollector()
        }

        initTemplateCollector() {
            // a map to store a template reference agains an element
            this.templates = new WeakMap()

            var self = this

            // change template binding, to attach into afterRender, so we can
            // collect a templates references for non magento Ui Components
            var origTemplateUpdate = ko.bindingHandlers["template"].update
            ko.bindingHandlers["template"].update = function (element, valueAccessor, allBindings, viewModel, bindingContext) {
                var value = valueAccessor()
                var options = ko.utils.unwrapObservable(value)
                var template = options.name || element

                if (typeof options === 'string') {
                    options = { name: options }
                }

                options.afterRender = function afterRender(rendered) {
                    for (var el of rendered) {
                        if (el.nodeType === 8) {
                            continue
                        }

                        var templates = new Set()

                        if (self.templates.has(el)) {
                            templates = self.templates.get(el)
                        }

                        templates.add(template)
                        self.templates.set(el, templates)
                    }
                }

                function fakeValueAccessor (value) {
                    if (value) {
                        throw new Error("Layout Hints module is breaking things")
                    }

                    return options
                }

                var result = origTemplateUpdate.call(null, element, fakeValueAccessor, allBindings, viewModel, bindingContext)

                return result
            }
        }

        isInspectable (element) {
            return this.templates.has(element)
        }

        getInspectable (element) {
            if (!this.templates.has(element)) {
                throw new Error("This element is not inspectable!")
            }

            const context = ko.contextFor(element)
            const templates = new Set(this.templates.get(element))

            while (ko.contextFor(element.parentElement) === context) {
                element = element.parentElement

                // merge templates
                if (this.templates.has(element)) {
                    for (let template of this.templates.get(element)) {
                        templates.add(template)
                    }
                }
            }

            const parent = element.parentElement
            const elements = []

            for (let child of parent.children) {
                if (ko.contextFor(child) === context) {
                    elements.push(child)
                }
            }

            return { element, elements, context, templates }
        }

        getHighlightsData (element) {
            const inspectable = this.getInspectable(element)
            const $data = inspectable.context.$data

            let content = ''

            if ($data.component) {
                content += `<div>Comp: <code>${$data.component}</code></div>`
            }

            if ($data.template) {
                content += `<div>Templ: <code>${$data.template}</code></div>`
            }

            return [{
                badges: getNames(inspectable),
                content
            }]
        }

        consolePrint (element, { groupPrefix = "", collapse = false } = {}) {
            if (!this.isInspectable(element)) {
                return
            }

            const data = this.getInspectable(element)

            var context = data.context
            var $data = context.$data

            var names = getNames(data)
            var nameString = names.join("%c")

            if (collapse) {
                console.groupCollapsed(
                    `${groupPrefix}%c${nameString}`,
                    ...names.map(n => this.badgeStyle)
                )
            } else {
                console.group(
                    `${groupPrefix}%c${nameString}`,
                    ...names.map(n => `${this.badgeStyle}; font-size: ${this.largerFontSize};`)
                )
            }

            if ($data.component) {
                console.log(`Component:\n%c${$data.component}`, `font-size: ${this.largerFontSize}; font-weight: bold`);
            }

            if ($data.template) {
                console.log(`Component Template:\n%c${$data.template}`, `font-size: ${this.largerFontSize}; font-weight: bold`);
            }

            if (data.templates && data.templates.size > 0) {
                // reverse template order for better understanding
                var templates = [...data.templates].reverse()

                for (var template of templates) {
                    var ref = template instanceof Node ? `<!-- ${template.textContent} -->` : template

                    // try to find property and read that value of knockout data
                    var matches = ref.match(/ template: ([a-zA-Z0-9\-\_]+)/)
                    var templateProp = matches ? matches[1] : null

                    if (templateProp && $data[templateProp]) {
                        var dataTemplateProp = ko.utils.unwrapObservable($data[templateProp])

                        if (typeof dataTemplateProp === 'function') {
                            try {
                                dataTemplateProp = dataTemplateProp()
                            } catch (e) {
                                dataTemplateProp = null
                            }
                        }

                        if (dataTemplateProp) {
                            ref += `\n${dataTemplateProp}`
                        }
                    }

                    console.log(`KO Template ref:\n%c${ref}`, `font-size: ${this.largerFontSize}; font-weight: bold;`);
                }
            }

            console.log("Elements:\n", ...data.elements)
            console.log("Context:\n", data.context)
            console.log("Data:\n", data.context.$data)

            console.groupEnd()
        }
    }
})
