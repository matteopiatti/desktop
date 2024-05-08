class Box {
    constructor(options, children) {
        this.element = document.createElement('div');
        this.applyOptions(options);
        this.append(children);
        
        this.event = new EventTarget();
        document.addEventListener('click', (e) => {
            if (!this.element.contains(e.target)) {
                this.event.dispatchEvent(new Event('clickoff'));
            }
        });

        document.addEventListener('mousedown', (e) => {
            if (!this.element.contains(e.target)) {
                this.event.dispatchEvent(new Event('clickoff'));
            }
        });
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

export default Box