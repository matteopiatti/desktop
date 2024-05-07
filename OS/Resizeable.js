import Draggable from './Draggable.js';

class Resizable extends Draggable {
    constructor(options, children, callback) {
        super(options, children, callback);
        
        this.resizeHandlers = {};
        this.initResizeHandlers();
    }
    
    initResizeHandlers() {
        const directions = ['nw', 'n', 'ne', 'w', 'empty', 'e', 'sw', 's', 'se'];
        const resizeHandler = document.createElement('div');
        resizeHandler.classList.add('resize-handler');
        this.element.appendChild(resizeHandler);
        directions.forEach(dir => {
            const handler = document.createElement('div');
            handler.classList.add(`${dir}`);
            resizeHandler.appendChild(handler);
            this.resizeHandlers[dir] = handler;
            handler.addEventListener('mousedown', (e) => this.resize(e, dir));
        });
    }
    
    resize(e, direction) {
        e.stopPropagation();
        this.initialX = e.clientX;
        this.initialY = e.clientY;
        this.initialWidth = this.element.offsetWidth;
        this.initialHeight = this.element.offsetHeight;
        this.initialTop = this.element.offsetTop;
        this.initialBottom = this.element.offsetTop + this.element.offsetHeight;
        this.initialLeft = this.element.offsetLeft;
        this.initialRight = this.element.offsetLeft + this.element.offsetWidth;

        const copy = this.element.cloneNode(true);
        copy.style.cssText = 'width: 0px; height: 0px; position: absolute; visibility: hidden;';
        document.body.appendChild(copy);
        this.minWidth = copy.offsetWidth;
        this.minHeight = copy.offsetHeight;
        document.body.removeChild(copy);

        const move = (e) => {
            const parentRect = this.element.parentElement.getBoundingClientRect();
            const deltaX = e.clientX - this.initialX;
            const deltaY = e.clientY - this.initialY;
            let newWidth = this.initialWidth;
            let newHeight = this.initialHeight;
            let newTop = this.initialTop;
            let newLeft = this.initialLeft;
            
            switch (direction) {
                case 'n':
                    newHeight = Math.min(this.initialHeight - deltaY, newHeight + this.initialTop);
                    newTop = Math.max(this.initialTop + deltaY, 0);
                    break;
                case 's':
                    newHeight = Math.min(this.initialHeight + deltaY, parentRect.height - this.initialTop);
                    break;
                case 'e':
                    newWidth = Math.min(this.initialWidth + deltaX, parentRect.width - this.initialLeft);
                    break;
                case 'w':
                    newWidth = Math.min(this.initialWidth - deltaX, newWidth + this.initialLeft);
                    newLeft = Math.max(this.initialLeft + deltaX, 0);
                    break;
                case 'ne':
                    newWidth = Math.min(this.initialWidth + deltaX, parentRect.width - this.initialLeft);
                    newHeight = Math.min(this.initialHeight - deltaY, newHeight + this.initialTop);
                    newTop = Math.max(this.initialTop + deltaY, 0);
                    break;
                case 'nw':
                    newWidth = Math.min(this.initialWidth - deltaX, newWidth + this.initialLeft);
                    newHeight = Math.min(this.initialHeight - deltaY, newHeight + this.initialTop);
                    newTop = Math.max(this.initialTop + deltaY, 0);
                    newLeft = Math.max(this.initialLeft + deltaX, 0);
                    break;
                case 'se':
                    newWidth = Math.min(this.initialWidth + deltaX, parentRect.width - this.initialLeft);
                    newHeight = Math.min(this.initialHeight + deltaY, parentRect.height - this.initialTop);
                    break;
                case 'sw':
                    newWidth = Math.min(this.initialWidth - deltaX, newWidth + this.initialLeft);
                    newHeight = Math.min(this.initialHeight + deltaY, parentRect.height - this.initialTop);
                    newLeft = Math.max(this.initialLeft + deltaX, 0);
                    break;
            }

            if (newWidth >= this.minWidth) {
                this.element.style.width = newWidth + 'px';
                this.element.style.left = newLeft + 'px';
            } else {
                this.element.style.width = this.minWidth + 'px';
                if (deltaX > 0) {
                    this.element.style.left = this.initialLeft + this.initialWidth - this.minWidth + 'px';
                }
            }
            if (newHeight >= this.minHeight) {
                this.element.style.top = newTop + 'px';
                this.element.style.height = newHeight + 'px';
            } else {
                this.element.style.height = this.minHeight + 'px';
                if (deltaY > 0) {
                    this.element.style.top = this.initialTop + this.initialHeight - this.minHeight + 'px';
                }
            }
        };
        
        const up = () => {
            document.removeEventListener('mousemove', move);
            document.removeEventListener('mouseup', up);
            this.callback();
        };
        
        document.addEventListener('mousemove', move);
        document.addEventListener('mouseup', up);
    }
}

export default Resizable