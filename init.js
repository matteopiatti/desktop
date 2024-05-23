import { Box, Draggable, Resizable } from './OS/index.js';
import { v4 as uuidv4 } from 'uuid';
import { getSolitaire } from './Solitaire/index.js';
import { Editor } from '@tiptap/core';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align'
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import * as Tone from "tone";

/**
 * TODO:
 * - icon not on top of window on click
 * - solitaire not above box-shadow on small windows
 * - add clickoff to event listeners spec
 * - ms tooltips?
 * - clean up all the parameters
 * - replace close with better function
 * - add close event
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
    constructor(text, initialPosition, icon, window, open) {
        super({classList: 'icon'}, null, null)

        // Properties
        this._position = initialPosition;
        this.window = window;
        this.window.icon = icon;

        // Elements
        this.element.append(createElement(`
            <div class="icon-img">
                <img src="${icon}" draggable="false">
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

        if (open) {
            this.window.toTop()
            WINDOWLAYER.addWindow(this.window)
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
    constructor(options, children, title, content, attributes, icon, functions) {
        super({...options, classList: 'window'}, children, null);
    
        // Properties
        this.id = uuidv4();
        this.maximized = false;
        this.minimized = false;
        this.attributes = attributes
        this.title = title;
        this.icon = icon || '';

        if (SCALE !== 1) {
            this.attributes.x *= SCALE
            this.attributes.y *= SCALE
            this.attributes.w *= SCALE
            this.attributes.h *= SCALE
        }

        // Elements
        this.element.append(createElement(`
            <div class="window-header">
                <div class="window-icon">
                    <img src="${this.icon}">
                </div>
                ${this.title}
                <div class="window-buttons">
                    <button class="minimize"></button>
                    <button class="maximize"></button>
                    <button class="close"></button>
                </div>
            </div>
            <div class="window-content">${this.content}</div>
        `))
        this.windowContent = this.element.querySelector('.window-content')
        this.windowHeader = this.element.querySelector('.window-header')
        const windowButtons = this.element.querySelector('.window-buttons');
        this.minimizeButton = this.element.querySelector('.minimize');
        this.maximizeButton = this.element.querySelector('.maximize');
        const closeButton = this.element.querySelector('.close');

        // Event listeners
        this.event.addEventListener('clickoff', () => this.element.classList.add('inactive'));
        this.windowContent.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            this.toTop()
        });
        this.element.addEventListener('mousedown', () => this.toTop());
        this.minimizeButton.addEventListener('click', () => this.minimize(this.minimized));
        this.maximizeButton.addEventListener('click', () => this.maximize());
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

        // Setters
        this.content = content;
        this.functions = functions;
    }

    set content(newContent) {
        this.windowContent.innerHTML = '';
        this.windowContent.append(newContent);
    }

    get functions() {
        return this.element.querySelector('.window-functions');
    }

    set functions(newFunctions) {
        if (!newFunctions) return;
        this.element.querySelector('.window-functions')?.remove();
        this.element.insertBefore(newFunctions, this.windowContent);
        this.element.querySelector('.window-functions').addEventListener('mousedown', (e) => {
            e.stopPropagation();
        })
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
                <div class="task-bar-icon">
                    <img src="/icons/calendar.png" alt="icon">
                </div>
                <div class="task-bar-icon">
                    <img src="/icons/loudspeaker.png" alt="icon">
                </div>
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
            if (window.type === 'info') return;
            const taskButton = createElement(`
                <button class="task-button">
                    <img src="${window.icon}" alt="icon">
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

class Solitaire extends Window {
    constructor(options, children, title, content) {
        super(options, children, title, content, {x: 100, y: 100, w: 680, h: 406}, '/icons/solitaire.png', null);
        this.deal();
        this.windowContent.style.background = 'green';

        this.functionElement = createElement(`
            <div class="window-functions">
                <div class="dropdown">
                    <div>Game</div>
                    <div class="dropdown-content">
                        <button>Deal</button>
                        <button>Exit</button>
                    </div>
                </div>
            </div>
        `)
        const dropdownContent = this.functionElement.querySelector('.dropdown-content')
        const dropdown = this.functionElement.querySelector('.dropdown')

        dropdownContent.addEventListener('click', (e) => {
            if (e.target.innerText === 'Deal') this.deal()
            if (e.target.innerText === 'Exit') this.element.querySelector('.close').click()
        })
        dropdown.addEventListener('click', () => {
            dropdownContent.style.display = dropdownContent.style.display === 'flex' ? 'none' : 'flex'
            dropdown.classList.toggle('active')
        })

        super.functions = this.functionElement;

        document.addEventListener('click', (e) => {
            if (!super.functions.contains(e.target)) {
                dropdownContent.style.display = 'none'
                dropdown.classList.remove('active')
            }
        });
        document.addEventListener('mousedown', (e) => {
            if (!super.functions.contains(e.target)) {
                dropdownContent.style.display = 'none'
                dropdown.classList.remove('active')
            }
        });
    }

    deal() {
        super.content = getSolitaire();
    }
}

class TextEditor extends Window {
    constructor(options, children, title, content, position, icon) {
        super(options, children, title, content, position || {x: 100, y: 100, w: 680, h: 406}, icon || '/icons/notepad.png', null);
        this.windowContent.style.background = 'white';
        this.windowContent.innerHTML = '';

        this.menu = createElement(`
            <div class="editor-functions">
                <div class="menu">
                    <div class="bold">
                        <b>B</b>
                    </div>
                    <div class="italic">
                        <i>I</i>
                    </div>
                    <div class="underline">
                        <u>U</u>
                    </div>
                    <div class="separator"></div>
                    <div class="bullet">
                        <img src="/icons/bullet_list.png" alt="bullet">
                    </div>
                    <div class="orderedList">
                        <img src="/icons/ordered_list.png" alt="list">
                    </div>
                    <div class="separator"></div>
                    <div class="alignLeft">
                        <img src="/icons/align_left.png" alt="list">
                    </div>
                    <div class="alignCenter">
                        <img src="/icons/align_center.png" alt="list">
                    </div>
                    <div class="alignRight">
                        <img src="/icons/align_right.png" alt="list">
                    </div>
                </div>
            </div>
        `)
        const bold = this.menu.querySelector('.bold')
        const italic = this.menu.querySelector('.italic')
        const underline = this.menu.querySelector('.underline')
        const bullet = this.menu.querySelector('.bullet')
        const orderedList = this.menu.querySelector('.orderedList')
        const alignLeft = this.menu.querySelector('.alignLeft')
        const alignCenter = this.menu.querySelector('.alignCenter')
        const alignRight = this.menu.querySelector('.alignRight')

        bold.addEventListener('click', () => { 
            this.editor.commands.toggleBold()
        })
        italic.addEventListener('click', () => {
            this.editor.commands.toggleItalic()
        })
        underline.addEventListener('click', () => {
            this.editor.commands.toggleUnderline()
        })
        bullet.addEventListener('click', () => {
            this.editor.commands.toggleBulletList()
        })
        orderedList.addEventListener('click', () => {
            this.editor.commands.toggleOrderedList()
        })
        alignLeft.addEventListener('click', () => {
            this.editor.commands.setTextAlign('left')
        })
        alignCenter.addEventListener('click', () => {
            this.editor.commands.setTextAlign('center')
        })
        alignRight.addEventListener('click', () => {
            this.editor.commands.setTextAlign('right')
        })

        this.windowContent.append(this.menu)
        
        this.editor = new Editor({
            element: this.windowContent,
            extensions: [StarterKit, Underline, TextAlign.configure({ types: ['heading', 'paragraph'] }), Link],
            content: content
        })

        this.element.addEventListener('click', (e) => {
            this.editor.isActive('bold') ? bold.classList.add('active') : bold.classList.remove('active')
            this.editor.isActive('italic') ? italic.classList.add('active') : italic.classList.remove('active')
            this.editor.isActive('underline') ? underline.classList.add('active') : underline.classList.remove('active')
            this.editor.isActive('bulletList') ? bullet.classList.add('active') : bullet.classList.remove('active')
            this.editor.isActive('orderedList') ? orderedList.classList.add('active') : orderedList.classList.remove('active')
            this.editor.isActive({ textAlign: 'left' }) ? alignLeft.classList.add('active') : alignLeft.classList.remove('active')
            this.editor.isActive({ textAlign: 'center' }) ? alignCenter.classList.add('active') : alignCenter.classList.remove('active')
            this.editor.isActive({ textAlign: 'right' }) ? alignRight.classList.add('active') : alignRight.classList.remove('active')
        })
    }
}

class Mail extends TextEditor {
    constructor(options, children, title, content) {
        super(options, children, title, content, {x: 100, y: 100, w: 565, h: 400}, '/icons/new_mail.png', null);
        this.windowContent.style.background = 'white';
        this.windowContent.style.margin = '4px';
        this.element.style.minWidth = '565px';
        this.element.style.minHeight = '250px';

        this.menu = createElement(`
        <div class="button-menu">
            <button class="ghost" id="sendMail">
                <img src="/icons/send_mail.png">
                <p>Send</p>
            </button>
            <div class="separator"></div>
            <button class="ghost">
                <img src="/icons/cut.png">
                <p>Cut</p>
            </button>
            <button class="ghost">
                <img src="/icons/copy.png">
                <p>Copy</p>
            </button>
            <button class="ghost">
                <img src="/icons/paste.png">
                <p>Paste</p>
            </button>
            <button class="ghost">
                <img src="/icons/undo.png">
                <p>Undo</p>
            </button>
            <div class="separator"></div>
            <button class="ghost">
                <img src="/icons/check.png">
                <p>Check</p>
            </button>
            <button class="ghost">
                <img src="/icons/spelling.png">
                <p>Spelling</p>
            </button>
            <div class="separator"></div>
 
            <button class="ghost">
                <img src="/icons/attach.png">
                <p>Attach</p>
            </button>
            <button class="ghost">
                <img src="/icons/priority.png">
                <p>Priority</p>
            </button>
            <div class="separator"></div>
            <button class="ghost">
                <img src="/icons/sign.png">
                <p>Sign</p>
            </button>
        </div>`)

        this.address = createElement(`
            <div class="address">
                <div class="iconInput">
                    <div>
                        <img src="/icons/book.png">
                        <label>To:</label>
                    </div>
                    <input type="text" disabled value="matteo@piatti.li">
                </div>
                <div class="iconInput">
                    <div>
                        <img src="/icons/book.png">
                        <label for="from">From:</label>
                    </div>
                    <input type="text" id="from" placeholder="From">
                </div>
                <div class="iconInput">
                    <div>
                        <label for="subject">Subject:</label>
                    </div>
                    <input type="text" id="subject" placeholder="Subject">
                </div>
            </div>
        `)

        const sendButton = this.menu.querySelector('#sendMail')
        sendButton.addEventListener('click', () => {
            const from = this.element.querySelector('#from').value
            const subject = this.element.querySelector('#subject').value
            const content = this.editor.getHTML()
            const form = document.querySelector('#form')

            form.querySelector('input[name="from"]').value = from
            form.querySelector('input[name="subject"]').value = subject
            form.querySelector('input[name="content"]').value = content
            const formData = new FormData(form)
            const infoWindowID = uuidv4()
            WINDOWLAYER.addWindow(new LoadingScreen({}, null, 'Sending Mail', 'Sending Mail', 'Sending Mail', 2000, () => {
                //TODO: fix this...
                WINDOWLAYER.deleteWindow(infoWindowID)
                this.element.querySelector('.close').click()
            }))
            fetch("/", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams(formData).toString(),
            })
                .then(() => console.log("Form successfully submitted"))
                .catch((error) => alert(error));
            // wait 2000 ms and create new infowindow
            setTimeout(() => {
                WINDOWLAYER.addWindow(new InfoWindow({}, null, 'Mail Sent', 'Mail Sent', null, null, () => {
                    this.element.querySelector('.close').click()
                }))
            }, 2000)
        })

        this.windowContent.prepend(this.address)
        this.windowContent.prepend(this.menu)
    }
}

class InfoWindow extends Window {
    constructor(options, children, title, content, position, icon, cb) {
        super(options, children, title, content, position || {x: 350, y: 250, w: 250, h: 100}, icon, null);
        this.type = 'info';
        this.windowContent.style.boxShadow = 'none';
        this.windowContent.innerHTML = '';
        this.resizeable = false;
        this.resizeHandler.remove();

        this.windowContent.append(createElement(`
            <div class="info">
                <p>${content}</p>
                <button>Ok</button>
            </div>
        `))

        const button = this.windowContent.querySelector('.info button')
        button.addEventListener('click', () => {
            this.element.remove()
            if (cb) cb()
        })
    }
}

class LoadingScreen extends InfoWindow {
    constructor(options, children, title, content, text, time, cb) {
        super(options, children, title, content, null, null, null);
        this.windowContent.innerHTML = '';

        this.windowContent.append(createElement(`
            <div class="loading-screen">
                <p>${text}</p>
                <div>
                    <div class="loading-bar">
                        <div></div>
                        <div></div>
                        <div></div>
                        <div></div>
                        <div></div>
                        <div></div>
                        <div></div>
                        <div></div>
                        <div></div>
                        <div></div>
                        <div></div>
                        <div></div>
                        <div></div>
                        <div></div>
                        <div></div>
                        <div></div>
                        <div></div>
                        <div></div>
                        <div></div>
                        <div></div>
                    </div>
                    <button class="cancel">Cancel</button>
                </div>
            </div>`))

            const cancel = this.windowContent.querySelector('.cancel')
            const loadingBar = this.windowContent.querySelector('.loading-bar')
            cancel.addEventListener('click', () => {
                this.element.querySelector('.close').click()
                cb()
            })

            let index = 0;
            const interval = setInterval(() => {
                const bars = loadingBar.querySelectorAll('div')
                bars.forEach((bar, i) => {
                    if (index === i) {
                        bar.style.backgroundColor = 'var(--dark-blue)'
                    }
                })
                index++
                if (index === 20) {
                    clearInterval(interval)
                    this.element.querySelector('.close').click()
                    return
                }
            }, time / 20)

            // remove maximize button
            this.maximizeButton.remove()
            this.minimizeButton.remove()
    }
}

class Piano extends Window {
    constructor(options, children, title, content) {
        super(options, children, title, content, {x: 100, y: 100, w: 570, h: 270}, '/icons/piano.png', null);
        const synth = new Tone.Synth().toDestination();

        const piano = createElement(`
            <div class="piano">
                <div class="key right" data-note="C4"></div>
                <div class="key black" data-note="C#4"></div>
                <div class="key left right" data-note="D4"></div>
                <div class="key black" data-note="D#4"></div>
                <div class="key left" data-note="E4"></div>
                <div class="key right" data-note="F4"></div>
                <div class="key black" data-note="F#4"></div>
                <div class="key left right" data-note="G4"></div>
                <div class="key black" data-note="G#4"></div>
                <div class="key left right" data-note="A4"></div>
                <div class="key black" data-note="A#4"></div>
                <div class="key left" data-note="B4"></div>
                <div class="key right" data-note="C5"></div>
                <div class="key black" data-note="C#5"></div>
                <div class="key left right" data-note="D5"></div>
                <div class="key black" data-note="D#5"></div>
                <div class="key left" data-note="E5"></div>
                <div class="key right" data-note="F5"></div>
                <div class="key black" data-note="F#5"></div>
                <div class="key left right" data-note="G5"></div>
                <div class="key black" data-note="G#5"></div>
                <div class="key left right" data-note="A5"></div>
                <div class="key black" data-note="A#5"></div>
                <div class="key left" data-note="B5"></div>
            </div>
        `)

        piano.querySelectorAll('.key').forEach(key => {
            key.addEventListener('mousedown', () => {
                synth.triggerAttack(key.dataset.note)
                key.classList.add('active')
            })
            key.addEventListener('mouseup', () => {
                synth.triggerRelease()
                key.classList.remove('active')
            })
        })

        this.windowContent.innerHTML = '';
        this.windowContent.append(piano)
    }
}

class Paint extends Window {
    constructor(options, children, title, content) {
        super(options, children, title, content, {x: 0, y: 0, w: 800, h: 600}, '/icons/paint.png', null);
        this.canvas = createElement(`
        <iframe src="https://jspaint.app" width="100%" height="100%"></iframe>
        `)
        this.windowContent.innerHTML = '';
        this.windowContent.append(this.canvas)
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
let SCALE = 1

const welcomeMessage = `
<h1>Welcome to my Desktop</h1>
<p>My name is Matteo and I'm a frontend developer from Switzerland.</p>
<p>My skills include, but are not limited to:</p>
<ul>
    <li>HTML</li>
    <li>CSS</li>
    <li>JavaScript</li>
    <li>React</li>
    <li>Vue.js</li>
    <li>Node.js</li>
    <li>Svelte</li>
    <li>Laravel</li>
    <li>PHP</li>
</ul>
<br />
<p>This is my Windows 98 inspired desktop. It's built with vanilla JavaScript and CSS. The icons are draggable and resizable. The windows can be minimized, maximized and closed.</p>
<p>I built this application by hand (except for solitaire and paint) to showcase my skill and love for retro design.</p>
<p><b>Feel free to use outlook to send me an email</b></p>
<br/>
<a href="https://github.com/matteopiatti/desktop">Github</a>

</br>
<p>Sources:</p>
<ul>
    <li><a href="https://jspaint.app">JS Paint</a></li>
    <li><a href="https://github.com/rjanjic/js-solitaire">Solitaire</a></li>
</ul>
`

// Set css vars
document.documentElement.style.setProperty('--grid-x', GRIDSIZE.x);
document.documentElement.style.setProperty('--grid-y', GRIDSIZE.y);
document.documentElement.style.setProperty('--desktop-x', DESKTOPSIZE.x);
document.documentElement.style.setProperty('--desktop-y', DESKTOPSIZE.y);

const documentWidth = Math.max(
    document.documentElement.clientWidth,
    window.innerWidth || 0
);
const documentHeight = Math.max(
    document.documentElement.clientHeight,
    window.innerHeight || 0
);

if (documentWidth < 960 || documentHeight < 720) {
    DESKTOPSIZE.x = documentWidth;
    DESKTOPSIZE.y = documentHeight;
    document.documentElement.style.setProperty('--desktop-x', DESKTOPSIZE.x);
    document.documentElement.style.setProperty('--desktop-y', DESKTOPSIZE.y);
    SCALE = Math.min(documentWidth / 960, documentHeight / 720);
    document.documentElement.style.setProperty('--scale', SCALE);
}

// Setup
const desktop = new Desktop(DESKTOPSIZE, ICONLAYER, WINDOWLAYER);
ICONLAYER.addIcon(new Icon(
    'Welcome.txt',
    {x:-1,y:2},
    '/icons/notepad.png', 
    new TextEditor({}, null, 'Welcome to my Desktop', welcomeMessage, {x: 160, y: 100, w: 600, h: 400}),
    true
))
ICONLAYER.addIcon(new Icon(
    'Outlook Express',
    {x:-1,y:0},
    '/icons/outlook.png', 
    new Mail({}, null, 'New Mail', 'Hello World')
))
ICONLAYER.addIcon(new Icon(
    'Solitaire',
    {x:-1,y:1},
    '/icons/solitaire.png', 
    new Solitaire({}, null, 'Solitaire', 'Hello World')
))
ICONLAYER.addIcon(new Icon(
    'Piano',
    {x:0,y:0},
    '/icons/piano.png', 
    new Piano({}, null, 'Piano', 'Hello World')
))
ICONLAYER.addIcon(new Icon(
    'Paint',
    {x:0,y:1},
    '/icons/paint.png', 
    new Paint({}, null, 'Paint', 'Hello World')
))
document.body.appendChild(desktop.element);
