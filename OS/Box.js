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

export default Box