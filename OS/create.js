
export function create(e, options) {
    const element = document.createElement(e);
    for (const key in options) {
        if (key === 'children') {
            const children = options[key];
            if (Array.isArray(children)) {
                children.forEach(child => {
                    element.append(child);
                });
            } else {
                element.append(children);
            }
        } else if (key === 'class') {
            element.className = options[key];
        } else if (key === 'id') {
            element.id = options[key];
        } else if (key === 'style') {
            element.style.cssText = options[key];
        }else {
            element[key] = options[key];
        }
    }
    return element;
}