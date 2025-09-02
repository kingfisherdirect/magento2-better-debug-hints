define([], function () {
    var highlightEls = []

    return {
        create (element, html) {
            var highlightEl = document.createElement('div')
            highlightEl.style.position = "absolute"
            highlightEl.style.background = "var(--hl-bg, rgba(255, 50, 100))"
            highlightEl.style.border = `1px solid var(--hl-border-color, currentColor)`
            highlightEl.style.color = 'var(--hl-color, blue))'
            highlightEl.style.textShadow = "0 0 1px var(--hl-bg, rgba(255, 50, 100))"
            highlightEl.style.zIndex = 999999
            highlightEl.style.padding = ".5em"
            highlightEl.style.cursor = "pointer"
            highlightEl.style.fontSize = "1rem"

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

            if (html) {
                // remove sticky to allow better scrolling if content exceeds highlgiht
                const content = highlightEl.children[0]
                const { height } = content.getBoundingClientRect()

                console.log(height, window.innerHeight)

                if (height > window.innerHeight) {
                    content.style.position = "static"
                }
            }

            return highlightEl
        },

        clear () {
            for (var highlightEl of highlightEls) {
                highlightEl.remove()
            }

            highlightEls = []
        }
    }
})
