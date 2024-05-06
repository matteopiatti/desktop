
export const reactive = (value) => {
    const listeners = [];

    return {
        get() {
            return value;
        },
        set(newValue) {
            value = newValue;
            listeners.forEach(listener => listener(value));
        },
        toggle() {
            if (typeof value !== 'boolean') {
                throw new Error('Value is not a boolean');
            }
            value = !value;
            listeners.forEach(listener => listener(value));
        },
        subscribe(listener) {
            listeners.push(listener);
            listener(value)
            return () => {
                listeners = listeners.filter(l => l !== listener);
            }
        }
    }
}