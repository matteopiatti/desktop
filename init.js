import { Box, Draggable, Resizable } from './OS/index.js';
import { v4 as uuidv4 } from 'uuid';
import { getSolitaire } from './Solitaire/index.js';

/**
 * TODO:
 * - Remove render function
 * - icon not on top of window on click
 * - change event listeners of document to clickoff box event
 * - webcomponents?
 */

class Desktop {
    constructor(size, iconLayer, windowLayer) {
        this.element = new Box({classList: 'desktop'}).element;
        this.layers = new Box({classList: 'layers'});
        this.taskBar = new TaskBar();

        this.layers.append(iconLayer.element)
        this.layers.append(windowLayer.element)
        this.element.append(this.layers.element)
        this.element.append(this.taskBar.element)

        this.element.style.width = size.x + 'px';
        this.element.style.height = size.y + 'px';
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
        this.element.append(icon.element)
    }
    
    getIcon(id) {
        return this.icons.find(icon => icon.id === id)
    }
    
    deleteIcon(id) {
        this.getIcon(id).element.remove()
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
        this.element.append(window.element)
        this.event.dispatchEvent(new Event('windowChange'))
    }
    
    getWindow(id) {
        return this.windows.find(window => window.id === id)
    }
    
    deleteWindow(id) {
        this.getWindow(id).element.remove()
        this.windows = this.windows.filter(window => window.id !== id)
        this.event.dispatchEvent(new Event('windowChange'))
    }
}

class Icon extends Draggable {
    constructor(text, initialPosition, imgSrc, window) {
        super({classList: 'icon'}, null, null)

        // Properties
        this._position = initialPosition;
        this.window = window;
        this.window.imgSrc = imgSrc;

        // Elements
        this.element.append(createElement(`
            <div class="icon-img">
                <img src="${imgSrc}" draggable="false">
            </div>
            <div class="icon-name">${text}</div>
        `))

        // Event listeners
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

        // Further methods
        super.callback = () => {
            this.position = {
                x: Math.floor((this.element.offsetLeft + this.element.offsetWidth / 2) / this.element.parentElement.offsetWidth * GRIDSIZE.x)-1,
                y: Math.floor((this.element.offsetTop + this.element.offsetHeight / 2) / this.element.parentElement.offsetHeight * GRIDSIZE.y)
            }
        }  
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
    constructor(options, children, title, content, attributes) {
        super({...options, classList: 'window'}, children, null);
    
        // Properties
        this.id = uuidv4();
        this.maximized = false;
        this.minimized = false;
        this.attributes = attributes
        this.title = title;

        // Elements
        this.element.append(createElement(`
            <div class="window-header">
                ${this.title}
                <div class="window-buttons">
                    <button class="minimize"></button>
                    <button class="maximize"></button>
                    <button class="close"></button>
                </div>
            </div>
            <div class="window-content">${content}</div>
        `))
        this.windowContent = this.element.querySelector('.window-content')
        this.windowHeader = this.element.querySelector('.window-header')
        const windowButtons = this.element.querySelector('.window-buttons');
        const minimizeButton = this.element.querySelector('.minimize');
        const maximizeButton = this.element.querySelector('.maximize');
        const closeButton = this.element.querySelector('.close');

        // Event listeners
        this.event.addEventListener('clickoff', () => this.element.classList.add('inactive'));
        this.windowContent.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            this.toTop()
        });
        this.element.addEventListener('mousedown', () => this.toTop());
        minimizeButton.addEventListener('click', () => this.minimize(this.minimized));
        maximizeButton.addEventListener('click', () => this.maximize());
        closeButton.addEventListener('click', () => {
            this.element.remove();
            WINDOWLAYER.deleteWindow(this.id)
        });

        windowButtons.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            this.toTop()
        })

        // Further methods
        this.setSizing();
        super.callback = () => {
            this.toTop()
            if (this.maximized) return;
            this.setSizing({
                x: this.element.offsetLeft,
                y: this.element.offsetTop,
                w: this.element.offsetWidth,
                h: this.element.offsetHeight
            })
        };
    }

    toTop() {
        this.element.classList.remove('inactive')
        WINDOWLAYER.currentZIndex++;
        this.element.style.zIndex = WINDOWLAYER.currentZIndex;
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
            this.setSizing({x: 0, y: 0, w: '100%', h: '100%'})
        }
        this.element.classList.toggle('maximized');
        this.maximized = !this.maximized;
    }

    setSizing(attr = this.attributes) {
        this.element.style.width = typeof attr.w === 'number' ? attr.w + 'px' : attr.w;
        this.element.style.height = typeof attr.h === 'number' ? attr.h + 'px' : attr.h;
        this.element.style.left = typeof attr.x === 'number' ? attr.x + 'px' : attr.x;
        this.element.style.top = typeof attr.y === 'number' ? attr.y + 'px' : attr.y;
    }
}

class TaskBar extends Box {
    constructor() {
        super({classList: 'task-bar'});
        // Elements
        this.element.append(createElement(`
            <div class="start-menu">
                <div class="start-menu-banner"><b>Windows</b>98<b>PiattiEdition</b></div>
                <div class="start-menu-items">
                    <div class="start-menu-item">Item 1</div>
                </div>
            </div>
            <button class="start-button">
                <img src="/icons/windows.png" alt="icon">
                Start
            </button>
            <span class="separator"></span>
            <span class="pull"></span>
            <div class="task-bar-windows"></div>
            <span class="pull"></span>
            <div class="task-bar-infos">
                <div class="clock"></div>
            </div>
        `));

        this.startButton = this.element.querySelector('.start-button');
        this.startMenu = this.element.querySelector('.start-menu');
        this.windows = this.element.querySelector('.task-bar-windows');
        this.clock = this.element.querySelector('.clock');
        
        // Event listeners
        this.startButton.addEventListener('click', () => this.toggleStartMenu());
        WINDOWLAYER.event.addEventListener('windowChange', () => this.updateWindows())
        this.event.addEventListener('clickoff', () => this.toggleStartMenu(false));

        // Further methods
        this.updateClock(this.clock)
    }

    toggleStartMenu(opened = true) {
        this.startMenu.style.display = opened ? (opened = !this.startMenu.style.display.includes('flex')) ? 'flex' : 'none' : 'none';
        this.startButton.classList.toggle('active', opened);
    }

    updateClock(e) {
        const date = new Date();
        e.innerHTML = `${formatTime(date.getHours())}:${formatTime(date.getMinutes())}`;
        setTimeout(() => this.updateClock(e), 60000 - date.getSeconds() - date.getMilliseconds());
    }

    updateWindows() {
        this.windows.innerHTML = '';
        WINDOWLAYER.windows.forEach(window => {
            const taskButton = createElement(`
                <button class="task-button">
                    <img src="${window.imgSrc}" alt="icon">
                    ${window.title}
                </button>
            `);
            taskButton.querySelector('.task-button').addEventListener('click', () => {
                window.minimize(true);
            });

            this.windows.append(taskButton);
        });
    }
}

// utils
function createElement(literal) {
    const fragment = document.createDocumentFragment();
    const template = document.createElement('template');
    template.innerHTML = literal;
    fragment.append(template.content);
    return fragment
}

function formatTime(time) {
    return time < 10 ? `0${time}` : time;
}

// global variables
const DESKTOPSIZE = {x: 960, y: 720};
const GRIDSIZE = {x: 16, y: 12};
const WINDOWLAYER = new WindowLayer();
const ICONLAYER = new IconLayer();

// Setup
const desktop = new Desktop(DESKTOPSIZE, ICONLAYER, WINDOWLAYER);
ICONLAYER.addIcon(new Icon(
    'random.txt',
    {x:2,y:1},
    '/icons/notepad_filepng.png', 
    new Window({}, null, 'Window 1', 'Hello World', {x: 200, y: 150, w: 300, h: 200})
))
ICONLAYER.addIcon(new Icon(
    'herewehaveaverylongfilename.txt',
    {x:2,y:1},
    '/icons/notepad_filepng.png', 
    new Window({}, null, 'Window 2', 'Hello World', {x: 400, y: 300, w: 150, h: 80})
))

document.body.appendChild(desktop.element);

// Set css vars
document.documentElement.style.setProperty('--grid-x', GRIDSIZE.x);
document.documentElement.style.setProperty('--grid-y', GRIDSIZE.y);
document.documentElement.style.setProperty('--desktop-x', DESKTOPSIZE.x);
document.documentElement.style.setProperty('--desktop-y', DESKTOPSIZE.y);
