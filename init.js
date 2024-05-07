import { Box, Draggable, Resizable } from './OS/index.js';

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
