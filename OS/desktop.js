import OS from "."
import { reactive } from "./reactive"
import { drag, controlWindow, dragWindow, dragResize } from "./drag"
import pell from "./pell";

export const desktop = (windowStore) => {
    return OS.create('div', {
        class: 'desktop',
        children: [
            desktopLayer(windowStore),
            taskBar(windowStore)
        ]
    })
}

const desktopLayer = (windowStore) => {
    return OS.create('div', {
        class: 'desktop-layer',
        children: [
            icons(),
            windows(windowStore)
        ]
    })
}

const icons = () => {
    return OS.create('div', {
        class: 'desktop-icons',
        children: [
            icon('icon1', 'Icon 1', {x:1,y:1}),
            icon('icon2', 'Icon 2', {x:2,y:2}),
            icon('icon3', 'Icon 3', {x:3,y:3}),
        ]
    })
}

function icon(id, text, position) {
    const el = OS.create('div', {
        id: id,
        class: 'icon',
        children: text
    });

    const setPosition = (pos) => {
        do {
            pos.x += 1;

            if (pos.x >= 8) {
                pos.x = 0;
                pos.y += 1;
            }
            if (pos.y >= 6) {
                pos.y = 0;
            }
        } while (desktopGrid.get()[pos.y][pos.x].length > 0);

        el.style.gridArea = `${pos.y+1} / ${pos.x+1} / ${pos.y + 2} / ${pos.x + 2}`;
        el.style.position = 'unset';
        desktopGrid.get()[pos.y][pos.x].push(el);
        desktopGrid.set(desktopGrid.get());
        position = pos;
    };
    setPosition(position);

    const remove = () => {
        const arr = desktopGrid.get();
        arr[position.y][position.x].pop();
        desktopGrid.set(arr);
    };

    el.addEventListener('mousedown', (e) => drag(e, el, setPosition, remove));

    return el;
}

const windows = (windowStore) => {
    console.log(windowStore.get())
    return OS.create('div', {
        class: 'windows',
        children: windowStore.get().map(window => window.element)
    })
}

export const window = (name, windowStore, content) => {
    const el = OS.create('div', {
        class: 'window',
        children: [
            OS.create('div', {
                class: 'window-header',
                children: [
                    OS.create('div', {
                        class: 'window-title',
                        children: name
                    }),
                    OS.create('div', {
                        class: 'window-controls',
                        children: [
                            button('-', minimize),
                            button('o', maximize),
                            button('x', close)
                        ]
                    })
                ]
            }),
            OS.create('div', {
                class: 'window-content',
                children: content
            })
        ]
    });

    let maximized = false
    let minimized = false
    let width, height, top, left

    el.style.zIndex = zIndex.get();
    zIndex.set(zIndex.get() + 1);

    function setPosition(pos) {
        el.style.left = pos.x + 'px';
        el.style.top = pos.y + 'px';
    }

    function remove () {
        console.log('asdf')
    }

    function close () {
        windowStore.set(windowStore.get().filter(w => w.name !== name))
        el.remove()
    }

    function minimize () {
        if (!minimized) {
            el.style.display = 'none';
        } else {
            el.style.display = 'block';
        }
        minimized = !minimized
    }

    function maximize () {
        if (!maximized) {
            width = el.offsetWidth;
            height = el.offsetHeight;
            top = el.offsetTop;
            left = el.offsetLeft;
            el.style.position = 'absolute';
            el.style.width = '100%';
            el.style.height = '100%';
            el.style.top = 0;
            el.style.left = 0;
        } else {
            el.style.width = width + 'px';
            el.style.height = height + 'px';
            el.style.top = top + 'px';
            el.style.left = left + 'px';
        }
        maximized = !maximized
    }

    function toTop () {
        el.style.zIndex = zIndex.get();
        zIndex.set(zIndex.get() + 1);
    }

    el.addEventListener('mousedown', (e) => {
        controlWindow(e, el, setPosition, remove)
        toTop()
    });
    el.addEventListener('click', (e) => {
        e.stopPropagation();
        toTop()
    })

    return {
        element: el,
        name: name,
        minimize: minimize,
    }
}

const isStartMenuOpen = reactive(false);
const desktopGrid = reactive([
    [[], [], [], [], [], [], [], []],
    [[], [], [], [], [], [], [], []],
    [[], [], [], [], [], [], [], []],
    [[], [], [], [], [], [], [], []],
    [[], [], [], [], [], [], [], []],
    [[], [], [], [], [], [], [], []],
]);
const zIndex = reactive(100);

const taskBar = (windowStore) => {
    const el = button('Start', () => {isStartMenuOpen.toggle()})

    const taskbar = OS.create('div', {
        class: 'task-bar',
        children: [
            el,
            ...windowStore.get().map(window => button(window.name, (e) => window.minimize())),
            startMenu(el)
        ]
    })

    windowStore.subscribe((value) => {
        taskbar.innerHTML = '';
        taskbar.append(
            el,
            ...windowStore.get().map(window => button(window.name, (e) => window.minimize())),
            startMenu(el)
        );
    })

    return taskbar
}

const button = (text, f) => {
    const el = OS.create('button', {
        class: 'button',
        children: text
    })
    el.addEventListener('click', f)
    return el
}

const startMenu = (btn) => {
    const el = OS.create('div', {
        class: 'start-menu',
        children: [
            OS.create('p', {
                class: 'start-menu-item',
                children: 'Programs'
            }),
            OS.create('p', {
                class: 'start-menu-item',
                children: 'Documents'
            }),
            OS.create('p', {
                class: 'start-menu-item',
                children: 'Settings'
            }),
        ]
    })
    isStartMenuOpen.subscribe((value) => {
        if (value) {
            el.style.display = 'block';
        } else {
            el.style.display = 'none';
        }
    })
    document.addEventListener('click', (event) => {
        if (!el.contains(event.target) && event.target !== btn) {
            isStartMenuOpen.set(false);
        }
    })
    return el
}

export const textEditor = (name, windowStore, content) => {
    const editor = pell.init({
        element: OS.create('div'),
        onChange: (html) => {
            //console.log(html)
        },
        actions: [
            'bold',
            'italic',
            'underline',
            'strikethrough',
            'heading1',
            'heading2',
            'paragraph',
            'quote',
            'olist',
            'ulist',
            'code',
            'line',
            {
                name: 'image',
                icon: '&#128247;',
                title: 'Image',
                result: () => {
                    console.log('asdf')
                }
            }
        ]
    })
    editor.content.innerHTML = content
    return window(name, windowStore, editor)
}