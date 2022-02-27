import * as Y from 'yjs'
import diff from 'fast-diff'

export class TextAreaBinding {

    constructor(yText : Y.Text, textField : HTMLTextAreaElement | HTMLInputElement)
    {
        let doc = yText.doc as Y.Doc;
        if(doc === null){
            throw new Error("Missing doc on yText");
        }

        if(textField.selectionStart === undefined || textField.selectionEnd === undefined){
            throw new Error("textField argument doesn't look like a text field");
        }

        textField.value = yText.toString();

        let relPosStart : Y.RelativePosition;
        let relPosEnd : Y.RelativePosition;

        doc.on('beforeTransaction', () => {
            const r = this.createRange(textField);
            relPosStart = Y.createRelativePositionFromTypeIndex(yText, r.left);
            relPosEnd = Y.createRelativePositionFromTypeIndex(yText, r.right);
        });

        yText.observe((__event, transaction)=>{
            if(transaction.local) return;

            const startPos = Y.createAbsolutePositionFromRelativePosition(relPosStart, doc)
            const endPos = Y.createAbsolutePositionFromRelativePosition(relPosEnd, doc)

            textField.value = yText.toString();

            if(startPos !== null && endPos !== null) {
                textField.selectionStart = startPos.index;
                textField.selectionEnd = endPos.index;
            }
        });

        textField.addEventListener('input', ()=>{
            const r = this.createRange(textField);

            let oldContent = yText.toString()
            let content = textField.value
            let diffs = diff(oldContent, content, r.left)
            let pos = 0
            for (let i = 0; i < diffs.length; i++) {
                let d = diffs[i]
            if (d[0] === 0) { // EQUAL
                pos += d[1].length
            } else if (d[0] === -1) { // DELETE
                yText.delete(pos, d[1].length)
            } else { // INSERT
                yText.insert(pos, d[1])
                pos += d[1].length
            }
            }
        });
    }

    private createRange(element : HTMLInputElement|HTMLTextAreaElement) {
        const left = element.selectionStart as number;
        const right = element.selectionEnd as number;
        return {left, right};
    }
}
