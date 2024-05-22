import Box from './Box.js'

class Draggable extends Box {
    constructor(options, children, callback) {
        super(options, children)
        this.element.addEventListener('mousedown', (e) => this.drag(e))
        this.element.addEventListener('touchstart', (e) => this.drag(e.touches[0]))
        this.callback = callback
        this.initalX
        this.initalY
    }
    
    drag(e) {
        this.element.style.zIndex = 99999999
        this.initialX = e.clientX - this.element.offsetLeft
        this.initialY = e.clientY - this.element.offsetTop
        
        const move = (e) => {
            if (e.touches) {
                e = e.touches[0]
            }
            const x = e.clientX - this.initialX
            const y = e.clientY - this.initialY
            this.element.style.gridArea = ''
            
            this.element.style.left = Math.min(Math.max(x, 0), this.element.parentElement.offsetWidth - this.element.offsetWidth) + 'px'
            this.element.style.top = Math.min(Math.max(y, 0), this.element.parentElement.offsetHeight - this.element.offsetHeight) + 'px'
            
            const w = this.element.offsetWidth
            const h = this.element.offsetHeight
            this.element.style.position = 'absolute'
            this.element.style.width = w + 'px'
            this.element.style.height = h + 'px'
        }
        
        const up = (e) => {
            document.removeEventListener('mousemove', move)
            document.removeEventListener('mouseup', up)
            document.removeEventListener('touchmove', move)
            document.removeEventListener('touchend', up)
            this.element.style.zIndex = 20
            
            this.callback(e)
        }
        
        document.addEventListener('mousemove', move)
        document.addEventListener('mouseup', up)
        document.addEventListener('touchmove', move)
        document.addEventListener('touchend', up)
    }
}

export default Draggable