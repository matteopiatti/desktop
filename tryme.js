class Desktop {
    constructor() {
        this.element = new Box({classList: 'desktop'}).element;
        this.layers = new Box({classList: 'layers'});
        this.iconLayer = new IconLayer();
        this.windowLayer = new WindowLayer();
        this.taskBar = new Box({classList: 'task-bar'})
        this.layers.append(this.iconLayer.render())
        this.layers.append(this.windowLayer.render())
        this.element.append(this.layers.render())
        this.element.append(this.taskBar.render())
    }
    
    render() {
        return this.element;
    }
}

class Box {
    constructor(options, children) {
        this.element = document.createElement('div');
        this.applyOptions(options);
        this.append(children);
    }
    
    render() {
        return this.element;
    }
    
    applyOptions(options) {
        if (!options) return;
        for (const key in options) {
            this.element[key] = options[key] instanceof Object ? options[key] : options[key];
        }
    }
    
    append (children) {
        if (!children) return;
        this.element.append(children)
    }
    
    delete() {
        this.element.remove();
    }
}

class IconLayer extends Box {
    constructor() {
        super({classList: 'icon-layer'})
        this.icons = [];
        this.iconGrid = Array.from({ length: 6 }, () => Array.from({ length: 8 }, () => []))
    }
    
    addIcon(icon) {
        icon.iconLayer = this
        icon.position = icon._position
        this.icons.push(icon);
        this.element.append(icon.render())
    }
    
    getIcon(id) {
        return this.icons.find(icon => icon.id === id)
    }
    
    deleteIcon(id) {
        this.getIcon(id).delete()
        this.icons = this.icons.filter(icon => icon.id !== id)
        this.iconGrid = this.iconGrid.map(row => row.map(cell => cell.filter(icon => icon.id !== id)))
        this.currentZIndex = 100
    }
}

class WindowLayer extends Box {
    constructor() {
        super({classList: 'window-layer'})
        this.windows = []
        this.currentZIndex = 100
    }
    
    addWindow(window) {
        this.windows.push(window)
        window.zIndex = this.currentZIndex
        window.windowLayer = this
        this.currentZIndex++
        this.element.append(window.render())
    }
    
    getWindow(id) {
        return this.windows.find(window => window.id === id)
    }
    
    deleteWindow(id) {
        this.getWindow(id).delete()
        this.windows = this.windows.filter(window => window.id !== id)
    }
}

class Draggable extends Box {
    constructor(options, children, callback) {
        super(options, children)
        this.element.addEventListener('mousedown', (e) => this.drag(e))
        this.callback = callback
        this.initalX
        this.initalY
    }
    
    drag(e) {
        this.element.style.zIndex = 99999999
        this.initialX = e.clientX - this.element.offsetLeft
        this.initialY = e.clientY - this.element.offsetTop
        
        const move = (e) => {
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
            this.element.style.zIndex = 20
            
            this.callback(e)
        }
        
        document.addEventListener('mousemove', move)
        document.addEventListener('mouseup', up)
    }
}

class Icon extends Draggable {
    constructor(id, text, initialPosition) {
        
        super({id, classList: 'icon'}, text, null)
        this.id = 1;
        this._position = initialPosition;
        
        super.callback = () => {
            this.position = {
                x: Math.floor((this.element.offsetLeft + this.element.offsetWidth / 2) / this.element.parentElement.offsetWidth * 8)-1,
                y: Math.floor((this.element.offsetTop + this.element.offsetHeight / 2) / this.element.parentElement.offsetHeight * 6)
            }
        }
    }
    
    get position() {
        return this._position
    }
    
    set position(newPosition) {
        this.iconLayer.iconGrid[this._position.y][this._position.x] = []
        do {
            newPosition.x++;
            if (newPosition.x >= 8) {
                newPosition.x = 0;
                newPosition.y = (newPosition.y + 1) % 6;
            }
        } while (this.iconLayer.iconGrid[newPosition.y][newPosition.x].length > 0);
        this.iconLayer.iconGrid[newPosition.y][newPosition.x].push(this);
        this.element.style.position = 'unset';
        this.element.style.gridArea = `${newPosition.y + 1} / ${newPosition.x + 1} / ${newPosition.y + 2} / ${newPosition.x + 2}`;
        this._position = newPosition;
    }
}

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

class Window extends Resizable {
    constructor(options, children) {
        super(options, children, null);
        this.element.classList.add('window');
        this.windowHeader = new Box({classList: 'window-header'});
        this.windowContent = new Box({classList: 'window-content'});
        this.element.append(this.windowHeader.render());
        this.element.append(this.windowContent.render());

        super.callback = () => {
            this.zIndex = this.windowLayer.currentZIndex;
            this.windowLayer.currentZIndex++;
        };
    }

    set zIndex(zIndex) {
        this.element.style.zIndex = zIndex;
    }
}

const desktop = new Desktop();
desktop.iconLayer.addIcon(new Icon('icon1', 'Icon 1', {x:2,y:1}))
desktop.iconLayer.addIcon(new Icon('icon2', 'Icon 2', {x:7,y:1}))
desktop.windowLayer.addWindow(new Window({}, 'Window 1'))

document.body.appendChild(desktop.render());
