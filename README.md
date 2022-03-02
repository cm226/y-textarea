# y-TextArea

This package binds a YJS, Y.Text type to a HTML input element where type="text" or a TextArea element. Shared cursors are not yet supported. 

## Example

```js
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { TextAreaBinding } from 'y-textarea'

..
const yTextArea = doc.getText("textArea");
const AreaBinding = new TextAreaBinding(yTextArea, textArea);

```

## Run Demo
Clone this repo, and run:
```bash
npm install
HOST=localhost PORT=1234 npx y-websocket-server
npm run dev
```



