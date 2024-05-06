const width = 640
const height = 440

export function drag (event, element, position, remove) {
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp)
    element.style.zIndex = 99999999;
    remove()

    const initialX = event.clientX - element.offsetLeft;
    const initialY = event.clientY - element.offsetTop;

    function onMouseMove (event) {
        const x = event.clientX - initialX;
        const y = event.clientY - initialY;
        element.style.gridArea = '';

        element.style.left = Math.min(Math.max(x, 0), width - element.offsetWidth) + 'px';
        element.style.top = Math.min(Math.max(y, 0), height - element.offsetHeight) + 'px';

        const w = element.offsetWidth;
        const h = element.offsetHeight;
        element.style.position = 'absolute';
        element.style.width = w + 'px';
        element.style.height = h + 'px';
    }

    function onMouseUp (event) {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        element.style.zIndex = 20;

        position({
            x: Math.floor((element.offsetLeft + element.offsetWidth / 2) / element.parentElement.offsetWidth * 8) - 1,
            y: Math.floor((element.offsetTop + element.offsetHeight / 2) / element.parentElement.offsetHeight * 6)
        })
    }
}

export function controlWindow(event, element, position, remove) {
    if (event.target.classList.contains('window-header')) {
        dragWindow(event, element, position, remove)
    } else {
        dragResize(event, element, position, remove)
    }

}

export function dragWindow (event, element, position, remove) {
    const initialX = event.clientX - element.offsetLeft;
    const initialY = event.clientY - element.offsetTop;
    remove()

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    function onMouseMove (event) {
        const x = event.clientX - initialX;
        const y = event.clientY - initialY;
        element.style.gridArea = '';

        element.style.left = Math.min(Math.max(x, 0), width - element.offsetWidth) + 'px';
        element.style.top = Math.min(Math.max(y, 0), height - element.offsetHeight) + 'px';
        element.style.position = 'absolute';
    }

    function onMouseUp (event) {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    }
}

export function dragResize (event, element, position, remove) {
    const initialX = event.clientX;
    const initialY = event.clientY;
    const startWidth = element.offsetWidth;
    const startHeight = element.offsetHeight;
    const x = (event.clientX - element.getBoundingClientRect().left) > element.offsetWidth / 2 ? 1 : -1
    const y = (event.clientY - element.getBoundingClientRect().top) > element.offsetHeight / 2 ? 1 : -1
    const direction = {
        x: x,
        y: y
    }
    element.style.userSelect = 'none';

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    function onMouseMove (event) {
        const windowWidth = startWidth + event.clientX - initialX
        const windowHeight = startHeight + event.clientY - initialY

        element.style.width = windowWidth + 'px';
        element.style.height = windowHeight + 'px';
    }

    function onMouseUp (event) {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    }
}
