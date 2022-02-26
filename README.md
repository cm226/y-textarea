# y-TextArea

This binding maps a Y.Text to a HTML input element where type="text" or a TextArea element. There is no awareness support, but shared cursors are supported. 

## Example

```js
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import {TextAreaBinding} from 'y-textArea'

..
const yTextArea = doc.getText("textArea");
const AreaBinding = new TextAreaBinding(yTextArea, textArea);

```

## Run Demo

```bash
npm install
HOST=localhost PORT=1234 npx y-websocket-server
npm run dev
```



