import OS from "./OS";
import { window, textEditor } from "./OS/desktop";
import { reactive } from "./OS/reactive";

const app = document.querySelector('#app');

const windowStore = reactive([]);
windowStore.set([window('Window 1', windowStore, 'lol')])

// add new window
const windows = windowStore.get();
windows.push(textEditor('Text Editor', windowStore, 'New Text Document'));
windowStore.set(windows);
OS.render(OS.desktop(windowStore), app);