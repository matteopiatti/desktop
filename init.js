import { Box, Draggable, Resizable } from './OS/index.js';
import { v4 as uuidv4 } from 'uuid';
import { getSolitaire } from './Solitaire/index.js';

/**
 * TODO:
 * - Remove render function
 * - Remove unused class functions (can still be added later if needed)
 * - maybe create a button class?
 * - icon not on top of window on click
 * - change event listeners of document to clickoff box event
 */

class Desktop {
    constructor(size, iconLayer, windowLayer) {
        this.element = new Box({classList: 'desktop'}).element;
        this.layers = new Box({classList: 'layers'});
        this.windowLayer = windowLayer;
        this.iconLayer = iconLayer;
        this.taskBar = new TaskBar(this.windowLayer);

        this.layers.append(this.iconLayer.render())
        this.layers.append(this.windowLayer.render())
        this.element.append(this.layers.render())
        this.element.append(this.taskBar.render())

        this.element.style.width = size.x + 'px';
        this.element.style.height = size.y + 'px';
    }
    
    render() {
        return this.element;
    }
}

class IconLayer extends Box {
    constructor() {
        super({classList: 'icon-layer'})
        this.icons = [];
        this.iconGrid = Array.from({ length: GRIDSIZE.y }, () => Array.from({ length: GRIDSIZE.x }, () => []))
        
        this.element.style.gridTemplateColumns = `repeat(${GRIDSIZE.x}, 1fr)`;
        this.element.style.gridTemplateRows = `repeat(${GRIDSIZE.y}, 1fr)`;
    }
    
    addIcon(icon) {
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
        window.toTop()
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
    constructor(text, initialPosition, fileContent, imgSrc, window) {
        super({classList: 'icon'}, null, null)
        
        this._position = initialPosition;
        this.window = window;
        this.text = text;
        this.fileContent = fileContent;
        this.imgSrc = imgSrc;
        
        this.initElement()

        super.callback = () => {
            this.position = {
                x: Math.floor((this.element.offsetLeft + this.element.offsetWidth / 2) / this.element.parentElement.offsetWidth * GRIDSIZE.x)-1,
                y: Math.floor((this.element.offsetTop + this.element.offsetHeight / 2) / this.element.parentElement.offsetHeight * GRIDSIZE.y)
            }
        }

        this.element.addEventListener('dblclick', () => {
            this.window.toTop()
            if (WINDOWLAYER.windows.includes(this.window) && this.window.minimized) this.window.minimize(true)
            if (WINDOWLAYER.windows.includes(this.window)) return
            WINDOWLAYER.addWindow(this.window)
        })

        this.element.addEventListener('mousedown', (e) => {
            this.element.classList.add('selected')
        })
        
        this.event.addEventListener('clickoff', () => this.element.classList.remove('selected'))
    }

    initElement() {
        const img = document.createElement('img');
        img.draggable = false;
        img.src = this.imgSrc;
        const icon = new Box({classList: 'icon-img'}, img)
        const name = new Box({classList: 'icon-name'}, this.text)
        this.element.append(icon.render())
        this.element.append(name.render())
    }
    
    get position() {
        return this._position
    }
    
    set position(newPosition) {
        ICONLAYER.iconGrid[this._position.y][this._position.x] = []
        do {
            newPosition.x++;
            if (newPosition.x >= GRIDSIZE.x) {
                newPosition.x = 0;
                newPosition.y = (newPosition.y + 1) % GRIDSIZE.y;
            }
        } while (ICONLAYER.iconGrid[newPosition.y][newPosition.x].length > 0);
        ICONLAYER.iconGrid[newPosition.y][newPosition.x].push(this);
        this.element.style.position = 'unset';
        this.element.style.gridArea = `${newPosition.y + 1} / ${newPosition.x + 1} / ${newPosition.y + 2} / ${newPosition.x + 2}`;
        this._position = newPosition;
    }
}

class Window extends Resizable {
    constructor(options, children, title, content, def) {
        super(options, children, null);
        this.id = uuidv4();
        this.element.classList.add('window');
        this.windowHeader = new Box({classList: 'window-header'});
        this.windowContent = new Box({classList: 'window-content'});
        this.windowContent.append(content);
        this.element.append(this.windowHeader.render());
        this.element.append(this.windowContent.render());
        this.event.addEventListener('clickoff', () => this.element.classList.add('inactive'));
        this.windowContent.element.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            this.toTop()
        });
        this.element.addEventListener('mousedown', () => this.toTop());
        this.title = title;
        this.maximized = false;
        this.minimized = false;
        this.def = def
        this.initWindowHeader();
        this.setSizing();

        super.callback = () => {
            this.toTop()
            if (this.maximized) return;
            this.def.w = this.element.offsetWidth;
            this.def.h = this.element.offsetHeight;
            this.def.x = this.element.offsetLeft;
            this.def.y = this.element.offsetTop;
        };
    }

    toTop() {
        this.element.classList.remove('inactive')
        WINDOWLAYER.currentZIndex++;
        this.element.style.zIndex = WINDOWLAYER.currentZIndex;
    }

    setSizing() {
        this.element.style.width = this.def.w + 'px';
        this.element.style.height = this.def.h + 'px';
        this.element.style.left = this.def.x + 'px';
        this.element.style.top = this.def.y + 'px';
    }

    initWindowHeader() {
        this.windowHeader.element.append(this.title);
        const windowButtons = new Box({classList: 'window-buttons'});
        
        const minimizeButton = document.createElement('button')
        minimizeButton.classList.add('minimize');
        const maximizeButton = document.createElement('button')
        maximizeButton.classList.add('maximize');
        const closeButton = document.createElement('button')
        closeButton.classList.add('close');
        windowButtons.append(minimizeButton);
        windowButtons.append(maximizeButton);
        windowButtons.append(closeButton);
        minimizeButton.addEventListener('click', () => this.minimize(this.minimized));
        maximizeButton.addEventListener('click', () => this.maximize());
        closeButton.addEventListener('click', () => {
            this.delete()
            WINDOWLAYER.deleteWindow(this.id)
        });

        windowButtons.element.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            this.toTop()
        })
        this.windowHeader.append(windowButtons.render());
    }

    minimize(minimized) {
        this.element.style.display = minimized ? '' : 'none';
        this.minimized = !minimized;
        this.toTop()
        WINDOWLAYER.event.dispatchEvent(new Event('windowChange'));
    }

    maximize() {
        if (this.maximized) {
            this.setSizing();
        } else {
            this.element.style.width = '100%';
            this.element.style.height = '100%';
            this.element.style.left = '0';
            this.element.style.top = '0';
        }
        this.element.classList.toggle('maximized');
        this.maximized = !this.maximized;
    }
}

class TaskBar extends Box {
    constructor() {
        super({classList: 'task-bar'});
        this.startButton = document.createElement('button');
        this.startButton.classList.add('start-button');
        const icon = document.createElement('img');
        icon.src = '/icons/windows.png';
        this.startButton.append(icon,'Start')
        this.startButton.addEventListener('click', () => this.toggleStartMenu());
        this.startMenu = this.initStartMenu();
        this.windows = new Box({classList: 'task-bar-windows'});
        this.append(this.startButton);
        this.append(this.windows.render());

        WINDOWLAYER.event.addEventListener('windowChange', () => this.updateWindows())
        this.event.addEventListener('clickoff', () => this.toggleStartMenu(false));
    }

    toggleStartMenu(opened = true) {
        if (opened) {
            this.startMenu.element.style.display = this.startMenu.element.style.display === 'none' ? 'flex' : 'none';   
            this.startButton.classList.toggle('active'); 
        } else {
            this.startMenu.element.style.display = 'none';
            this.startButton.classList.remove('active');
        }
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
        WINDOWLAYER.windows.forEach(window => {
            if (window.minimized) classes += ' minimized';
            const taskButton = document.createElement('button');
            taskButton.classList.add('task-button');
            taskButton.innerHTML = window.title;
            taskButton.addEventListener('click', () => {
                window.minimize(true);
            });
            this.windows.append(taskButton);
        });
    }
}

// global variables
const DESKTOPSIZE = {x: 960, y: 720};
const GRIDSIZE = {x: 16, y: 12};
const WINDOWLAYER = new WindowLayer();
const ICONLAYER = new IconLayer();

const desktop = new Desktop(DESKTOPSIZE, ICONLAYER, WINDOWLAYER);
ICONLAYER.addIcon(new Icon(
    'random.txt',
    {x:2,y:1},
    'Hello World',
    '/icons/notepad_filepng.png', 
    new Window({}, null, 'Window 1', 'Hello World', {x: 200, y: 150, w: 300, h: 200})
))
ICONLAYER.addIcon(new Icon(
    'herewehaveaverylongfilename.txt',
    {x:2,y:1},
    'Hello World',
    '/icons/notepad_filepng.png', 
    new Window({}, null, 'Window 1', 'Hello World', {x: 400, y: 300, w: 150, h: 80})
))

document.body.appendChild(desktop.render());

// Set css vars
document.documentElement.style.setProperty('--grid-x', GRIDSIZE.x);
document.documentElement.style.setProperty('--grid-y', GRIDSIZE.y);
document.documentElement.style.setProperty('--desktop-x', DESKTOPSIZE.x);
document.documentElement.style.setProperty('--desktop-y', DESKTOPSIZE.y);
