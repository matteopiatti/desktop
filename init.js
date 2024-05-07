import { Box, Draggable, Resizable } from './OS/index.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * TODO:
 * - Remove render function
 * - Remove unused class functions (can still be added later if needed)
 * - maybe create a button class?
 * - icon not on top of window on click
 */

class Desktop {
    constructor() {
        this.element = new Box({classList: 'desktop'}).element;
        this.layers = new Box({classList: 'layers'});
        this.windowLayer = new WindowLayer();
        this.iconLayer = new IconLayer(this.windowLayer);
        this.taskBar = new TaskBar(this.windowLayer);
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
    constructor(windowLayer) {
        super({classList: 'icon-layer'})
        this.icons = [];
        this.windowLayer = windowLayer
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
        this.event = new EventTarget()
    }
    
    addWindow(window) {
        this.windows.push(window)
        window.zIndex = this.currentZIndex
        window.windowLayer = this
        this.currentZIndex++
        this.element.append(window.render())
        this.event.dispatchEvent(new Event('windowChange'))
    }
    
    getWindow(id) {
        return this.windows.find(window => window.id === id)
    }
    
    deleteWindow(id) {
        this.getWindow(id).delete()
        this.windows = this.windows.filter(window => window.id !== id)
        this.event.dispatchEvent(new Event('windowChange'))
    }
}

class Icon extends Draggable {
    constructor(id, text, initialPosition, fileContent) {
        super({id, classList: 'icon'}, text, null)
        this.id = 1;
        this._position = initialPosition;
        this.window = null;
        
        super.callback = () => {
            this.position = {
                x: Math.floor((this.element.offsetLeft + this.element.offsetWidth / 2) / this.element.parentElement.offsetWidth * 8)-1,
                y: Math.floor((this.element.offsetTop + this.element.offsetHeight / 2) / this.element.parentElement.offsetHeight * 6)
            }
        }

        this.element.addEventListener('dblclick', () => {
            if (this.window) {
                this.window.zIndex = this.iconLayer.windowLayer.currentZIndex
                this.iconLayer.windowLayer.currentZIndex++
                return
            }
            this.window = new Window({}, null, text, fileContent)
            this.window.windowLayer = this.iconLayer.windowLayer
            this.window.zIndex = this.iconLayer.windowLayer.currentZIndex
            this.iconLayer.windowLayer.currentZIndex++
            this.iconLayer.windowLayer.addWindow(this.window)
            this.window.connectedIcon = this
        })

        this.element.addEventListener('mousedown', (e) => {
            this.element.classList.toggle('selected')
        })

        document.addEventListener('click', (e) => {
            if (!this.element.contains(e.target)) {
                this.element.classList.remove('selected')
            }
        })
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
    constructor(options, children, title, content) {
        super(options, children, null);
        this.id = uuidv4();
        this.element.classList.add('window');
        this.windowHeader = new Box({classList: 'window-header'});
        this.windowContent = new Box({classList: 'window-content'});
        this.windowContent.append(content);
        this.element.append(this.windowHeader.render());
        this.element.append(this.windowContent.render());
        this.windowContent.element.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            this.zIndex = this.windowLayer.currentZIndex;
            this.windowLayer.currentZIndex++;
        });
        this.title = title;
        this.initWindowHeader();
        this.maximized = false;
        this.minimized = false;

        // TODO: fix this later
        this.initialWidth = this.element.offsetWidth;
        this.initialHeight = this.element.offsetHeight;
        this.initialTop = this.element.offsetTop;
        this.initialLeft = this.element.offsetLeft;

        super.callback = () => {
            this.zIndex = this.windowLayer.currentZIndex;
            this.windowLayer.currentZIndex++;
            if (this.maximized) return;
            this.initialWidth = this.element.offsetWidth;
            this.initialHeight = this.element.offsetHeight;
            this.initialTop = this.element.offsetTop;
            this.initialLeft = this.element.offsetLeft;
        };
    }

    set zIndex(zIndex) {
        this.element.style.zIndex = zIndex;
    }

    initWindowHeader() {
        this.windowHeader.element.append(this.title);
        const windowButtons = new Box({classList: 'window-buttons'});
        
        const minimizeButton = new Box({classList: 'minimize-button button'}, '—');
        const maximizeButton = new Box({classList: 'maximize-button button'}, '⛶');
        const closeButton = new Box({classList: 'close-button button'}, '×');
        windowButtons.append(minimizeButton.render());
        windowButtons.append(maximizeButton.render());
        windowButtons.append(closeButton.render());
        minimizeButton.element.addEventListener('click', () => this.minimize(this.minimized));
        maximizeButton.element.addEventListener('click', () => this.maximize());
        closeButton.element.addEventListener('click', () => {
            this.delete()
            this.windowLayer.deleteWindow(this.id)
            this.connectedIcon.window = null
            this.connectedIcon = null
        });

        windowButtons.element.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            this.zIndex = this.windowLayer.currentZIndex;
            this.windowLayer.currentZIndex++;
        })
        this.windowHeader.append(windowButtons.render());
    }

    minimize(minimized) {
        this.element.style.display = minimized ? '' : 'none';
        this.minimized = !minimized;
        this.windowLayer.event.dispatchEvent(new Event('windowChange'));
    }

    maximize() {
        this.element.style.width = this.maximized ? this.initialWidth + 'px' : '100%';
        this.element.style.height = this.maximized ? this.initialHeight + 'px' : '100%';
        this.element.style.left = this.maximized ? this.initialLeft + 'px' : '0';
        this.element.style.top = this.maximized ? this.initialTop + 'px' : '0';
        this.maximized = !this.maximized;
    }
}

class TaskBar extends Box {
    constructor(windowLayer) {
        super({classList: 'task-bar'});
        this.windowLayer = windowLayer
        this.startButton = new Box({classList: 'start-button button', role: 'button'}, 'Start');
        this.startButton.element.addEventListener('click', () => this.toggleStartMenu());
        this.startMenu = this.initStartMenu();
        this.windows = new Box({classList: 'task-bar-windows'});
        this.append(this.startButton.render());
        this.append(this.windows.render());

        this.windowLayer.event.addEventListener('windowChange', () => this.updateWindows())
        document.addEventListener('mousedown', (e) => {
            if (!this.startButton.element.contains(e.target) && !this.startMenu.element.contains(e.target) && this.startMenu.element.style.display !== 'none') {
                this.toggleStartMenu()
            }
        })
    }

    toggleStartMenu() {
        this.startMenu.element.style.display = this.startMenu.element.style.display === 'none' ? 'flex' : 'none';    
    }

    initStartMenu() {
        const startMenu = new Box({classList: 'start-menu'});
        this.append(startMenu.render());
        const startMenuItems = new Box({classList: 'start-menu-items'});
        startMenu.append(startMenuItems.render());
        startMenu.element.style.display = 'none';
        startMenuItems.append(new Box({classList: 'start-menu-item'}, 'Item 1').render());
        return startMenu;
    }

    updateWindows() {
        this.windows.element.innerHTML = '';
        this.windowLayer.windows.forEach(window => {
            let classes = 'task-button button';
            if (window.minimized) classes += ' minimized';
            const taskButton = new Box({classList: classes}, window.title);
            taskButton.element.addEventListener('click', () => {
                window.zIndex = this.windowLayer.currentZIndex;
                this.windowLayer.currentZIndex++;
                window.minimize(true);
            });
            this.windows.append(taskButton.render());
        });
    }
}



const desktop = new Desktop();
desktop.iconLayer.addIcon(new Icon('icon1', 'Icon 1', {x:2,y:1}, 'Hello World'))
desktop.iconLayer.addIcon(new Icon('icon2', 'Icon 2', {x:7,y:1}, 'Hello World'))

document.body.appendChild(desktop.render());
