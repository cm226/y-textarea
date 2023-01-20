import { options, color } from './y-textarea-options'

import * as Y from 'yjs'
//@ts-ignore
import getCaretCoordinates from 'textarea-caret'
import intersection from 'rectangle-overlap'

const events = ['keyup', 'mouseup', 'touchstart', 'paste', 'cut', 'selectend']

class Cursor {
  private _div: HTMLDivElement
  private _nameDiv?: HTMLDivElement

  private _color!: color
  private _fontSize: string
  private _selectedIndex: { start: number; end: number }
  private _name?: string

  private _parent: Element

  constructor(
    fontSize: string,
    cssColor: color,
    element: HTMLTextAreaElement | HTMLInputElement,
    name?: string
  ) {
    this._selectedIndex = { start: -1, end: -1 }
    this._fontSize = fontSize
    this._parent = element.offsetParent || document.body
    this._div = document.createElement('div')
    this._div.style.position = 'absolute'
    this._div.style.height = fontSize
    this._div.style.width = '1px'
    this._div.style.display = 'none'
    this._div.classList.add('selectedText')
    this._parent.appendChild(this._div)

    if (name !== undefined) this.updateCursor(name, cssColor)
  }

  show() {
    this._div.style.display = 'block'
    if (this._nameDiv) this._nameDiv.style.display = 'block'
  }

  hide() {
    this._div.style.display = 'none'
    if (this._nameDiv) this._nameDiv.style.display = 'none'
  }

  updateCursor(name: string, cssColor: color) {
    // Don't update if info is the same
    if (
      this._name === name &&
      this._color.r === cssColor.r &&
      this._color.g === cssColor.g &&
      this._color.b === cssColor.b
    )
      return

    this._color = cssColor
    this._name = name

    if (!this._nameDiv) {
      this._nameDiv = document.createElement('div')
      this._nameDiv.style.position = 'absolute'
      this._nameDiv.style.display = 'none'
      this._nameDiv.classList.add('nameTag')
      this._parent.appendChild(this._nameDiv)
    }

    this._nameDiv.innerHTML = name
    this._nameDiv.style.backgroundColor = `rgba(${this._color.r}, ${this._color.g}, ${this._color.b}, 1.0)`
    this._div.style.backgroundColor = `rgba(${this._color.r}, ${this._color.g}, ${this._color.b}, 0.4)`
  }

  setPosition(start: number, end: number) {
    this._selectedIndex = { start, end }
  }

  setWidth(width: number) {
    this._div.style.width = width + 'px'
    if (width === 1) {
      this._div.style.backgroundColor = `rgba(${this._color.r}, ${this._color.g}, ${this._color.b}, 1.0)`
    } else {
      this._div.style.backgroundColor = `rgba(${this._color.r}, ${this._color.g}, ${this._color.b}, 0.4)`
    }
  }

  rePosition(textFeild: HTMLTextAreaElement | HTMLInputElement) {
    if (this._selectedIndex.start === -1 || this._selectedIndex.end === -1)
      return

    const startCoordinates = getCaretCoordinates(
      textFeild,
      this._selectedIndex.start
    )

    const screenSpaceTop = (textFeild.offsetTop -
      textFeild.scrollTop +
      startCoordinates.top) as number

    const screenSpaceLeft = (textFeild.offsetLeft -
      textFeild.scrollLeft +
      startCoordinates.left) as number

    let width = 1
    let height = 0
    if (this._selectedIndex.start !== this._selectedIndex.end) {
      let endCoordinates = getCaretCoordinates(
        textFeild,
        this._selectedIndex.end
      )
      width = endCoordinates.left - startCoordinates.left
      height = endCoordinates.top - startCoordinates.top
      if (height !== 0) width = 1 // dont support multi line select yet
    }

    const areaScreenSpace = {
      x: textFeild.offsetLeft,
      y: textFeild.offsetTop,
      width: textFeild.clientWidth,
      height: textFeild.clientHeight,
    }

    const cursorScreenSpace = {
      x: screenSpaceLeft,
      y: screenSpaceTop,
      width: width,
      height: parseInt(this._fontSize),
    }

    // Check if the selected is out of view
    const overlap = intersection(areaScreenSpace, cursorScreenSpace)
    if (!overlap) {
      this.hide()
      return
    }

    this._div.style.top = overlap.y + 'px'
    this._div.style.left = overlap.x + 'px'

    this.setWidth(overlap.width)

    this.show()

    if (this._nameDiv) {
      this._nameDiv.style.top = overlap.y + parseInt(this._fontSize) + 'px'
      this._nameDiv.style.left = overlap.x + 'px'
    }
  }

  destroy() {
    this._parent.removeChild(this._div)
    if (this._nameDiv) this._parent.removeChild(this._nameDiv)
  }
}

/*
    This class handles the awareness data for all cursors on a textfield (local and remote)
*/
export class TextAreaCursors {
  private _unobserveFns: VoidFunction[] = []
  private _cursors: Map<number, Cursor> = new Map<number, Cursor>()
  private _areaID: string = '' // ID for this textfield (used by all remote clients)
  private _textField?: HTMLTextAreaElement | HTMLInputElement

  constructor(
    yText: Y.Text,
    textField: HTMLTextAreaElement | HTMLInputElement,
    options: options
  ) {
    this._areaID = textField.id
    this._textField = textField

    if (textField.id === '') {
      throw new Error(
        'ID attribute is required on textarea/field if using cursors'
      )
    }

    if (textField.selectionStart === null || textField.selectionEnd === null) {
      throw new Error('unSupported Input type')
    }

    const doc = yText.doc
    if (doc === null) {
      throw new Error('Missing doc on yText')
    }

    const awarenessUpdate = (event: { removed: number[] }) => {
      if (event.removed.length != 0) {
        for (const id of event.removed) {
          if (this._cursors.has(id)) {
            const cursor = this._cursors.get(id)
            cursor?.destroy()
            this._cursors.delete(id)
          }
        }
      }

      const fontSize = getComputedStyle(textField).getPropertyValue('font-size')
      const changes = options.awareness.getStates()
      for (const [clientID, change] of changes.entries()) {
        if (clientID === options.awareness.clientID) continue // dont show local cursor

        const user = change[this._areaID]
        if (user === undefined) continue

        const encodedStart = user['start'] as any
        const encodedEnd = user['end'] as any
        const name = user['name'] as string
        const color = user['color'] as color
        const selection = user['selection'] as boolean

        if (!this._cursors.has(clientID) && !selection) {
          // We don't know anything about this cursor yet,
          // but its not selecting anything, when it does we will
          // create it
          continue
        }

        if (!this._cursors.has(clientID)) {
          this._cursors.set(
            clientID,
            new Cursor(fontSize, color, textField, name)
          )
        }
        const cursorMarker = this._cursors.get(clientID)

        if (!selection) {
          cursorMarker?.setPosition(-1, -1)
          cursorMarker?.hide()
          continue
        }

        cursorMarker?.updateCursor(name, color)

        if (encodedStart === undefined || encodedEnd === undefined) continue

        const start = Y.createAbsolutePositionFromRelativePosition(
          JSON.parse(encodedStart),
          doc
        )
        const end = Y.createAbsolutePositionFromRelativePosition(
          JSON.parse(encodedEnd),
          doc
        )

        if (start === null || end === null) {
          cursorMarker?.hide()
          continue
        }

        cursorMarker?.setPosition(start.index, end.index)
        cursorMarker?.rePosition(textField)
      }
    }
    options.awareness.on('update', awarenessUpdate)
    this._unobserveFns.push(() =>
      options.awareness.off('update', awarenessUpdate)
    )

    const textFieldChanged = () => {
      const start = textField.selectionStart as number
      const end = textField.selectionEnd as number

      const startRel = Y.createRelativePositionFromTypeIndex(yText, start)
      const endRel = Y.createRelativePositionFromTypeIndex(yText, end)

      options.awareness.setLocalStateField(this._areaID, {
        user: options.awareness.clientID,
        selection: true,
        start: JSON.stringify(startRel),
        end: JSON.stringify(endRel),
        name: options.clientName,
        color: options.color || { r: 45, g: 80, b: 237 },
      })
    }
    for (const event of events) {
      textField.addEventListener(event, textFieldChanged)
      this._unobserveFns.push(() => {
        textField.removeEventListener(event, textFieldChanged)
      })
    }

    const onFocusOut = () => {
      options.awareness.setLocalStateField(this._areaID, {
        user: options.awareness.clientID,
        selection: false,
      })
    }
    textField.addEventListener('focusout', onFocusOut)
    this._unobserveFns.push(() => {
      textField.removeEventListener('focusout', onFocusOut)
    })

    const onScroll = () => {
      this.rePositionCursors()
    }
    textField.addEventListener('scroll', onScroll)
    this._unobserveFns.push(() => {
      textField.removeEventListener('scroll', onScroll)
    })
  }

  public rePositionCursors() {
    if (this._textField) {
      for (const [_index, cursor] of this._cursors) {
        cursor.rePosition(this._textField)
      }
    }
  }

  public destroy() {
    for (const unobserveFn of this._unobserveFns) {
      unobserveFn()
    }

    this._unobserveFns = []
    for (const [__key, value] of this._cursors) {
      value.destroy()
    }

    this._cursors.clear()
  }
}
