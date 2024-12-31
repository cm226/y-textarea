import { TextAreaCursors } from './y-textArea-Cursors'
import { options } from './y-textarea-options'

import * as Y from 'yjs'
import diff from 'fast-diff'

export class TextAreaBinding {
  private _cursors?: TextAreaCursors
  private _unobserveFns: VoidFunction[] = []

  constructor(
    yText: Y.Text,
    textField: HTMLTextAreaElement | HTMLInputElement,
    options?: options
  ) {
    let doc = yText.doc as Y.Doc
    if (doc === null) {
      throw new Error('Missing doc on yText')
    }

    if (
      textField.selectionStart === undefined ||
      textField.selectionEnd === undefined
    ) {
      throw new Error("textField argument doesn't look like a text field")
    }

    if (options) {
      this._cursors = new TextAreaCursors(yText, textField, options)
    }

    textField.value = yText.toString()

    let relPosStart: Y.RelativePosition
    let relPosEnd: Y.RelativePosition
    let direction: typeof textField.selectionDirection

    const onDocBeforeTransaction = () => {
      direction = textField.selectionDirection
      const r = this.createRange(textField)
      relPosStart = Y.createRelativePositionFromTypeIndex(yText, r.left)
      relPosEnd = Y.createRelativePositionFromTypeIndex(yText, r.right)
    }
    doc.on('beforeTransaction', onDocBeforeTransaction)
    this._unobserveFns.push(() =>
      doc.off('beforeTransaction', onDocBeforeTransaction)
    )

    let textfieldChanged = false
    const yTextObserver = (
      __event: Y.YTextEvent,
      transaction: Y.Transaction
    ) => {
      if (transaction.local && textfieldChanged) {
        textfieldChanged = false
        return
      }

      textField.value = yText.toString()

      if ((textField.getRootNode() as Document).activeElement === textField) {
        const startPos = Y.createAbsolutePositionFromRelativePosition(
          relPosStart,
          doc
        )
        const endPos = Y.createAbsolutePositionFromRelativePosition(
          relPosEnd,
          doc
        )

        if (startPos !== null && endPos !== null) {
          if (direction === null) direction = 'forward'
          textField.setSelectionRange(startPos.index, endPos.index, direction)
        }
      }
    }
    yText.observe(yTextObserver)
    this._unobserveFns.push(() => yText.unobserve(yTextObserver))

    const onTextFieldInput = () => {
      textfieldChanged = true
      const r = this.createRange(textField)
      textfieldChanged = true
      let oldContent = yText.toString()
      let content = textField.value
      let diffs = diff(oldContent, content, r.left)
      let pos = 0
      doc.transact(tr => {
        for (let i = 0; i < diffs.length; i++) {
          let d = diffs[i]
          if (d[0] === 0) {
            // EQUAL
            pos += d[1].length
          } else if (d[0] === -1) {
            // DELETE
            yText.delete(pos, d[1].length)
          } else {
            // INSERT
            yText.insert(pos, d[1])
            pos += d[1].length
          }
        }
      })
    }
    textField.addEventListener('input', onTextFieldInput)
    this._unobserveFns.push(() =>
      textField.removeEventListener('input', onTextFieldInput)
    )
  }

  private createRange(element: HTMLInputElement | HTMLTextAreaElement) {
    const left = element.selectionStart as number
    const right = element.selectionEnd as number
    return { left, right }
  }

  public rePositionCursors() {
    this._cursors?.rePositionCursors()
  }

  public destroy() {
    for (const unobserveFn of this._unobserveFns) {
      unobserveFn()
    }

    this._unobserveFns = []

    if (this._cursors) {
      this._cursors.destroy()
    }
  }
}
