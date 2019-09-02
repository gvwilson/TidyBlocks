// Share the workspace between functions.
let TidyBlocksWorkspace = null

// Regular expressions to match valid single column names and multiple column names.
const SINGLE_COLUMN_NAME = /^ *[_A-Za-z][_A-Za-z0-9]* *$/
const MULTIPLE_COLUMN_NAMES = /^ *([_A-Za-z][_A-Za-z0-9]*)( *, *[_A-Za-z][_A-Za-z0-9]*)* *$/

// Names of single-column fields in various blocks (for generating validators).
const SINGLE_COLUMN_FIELDS = [
  'COLUMN',
  'LEFT_TABLE',
  'LEFT_COLUMN',
  'RIGHT_TABLE',
  'RIGHT_COLUMN',
  'NAME',
  'COLOR',
  'X_AXIS',
  'Y_AXIS'
]

// Names of multiple-column fields in various blocks (for generating validators).
const MULTIPLE_COLUMN_FIELDS = [
  'MULTIPLE_COLUMNS'
]

/**
 * Set the display property of the two input toggleable panes.
 * (Has to be done manually rather than in CSS because properties are being reset.)
 */
const initializeDisplay = () => {
  for (let [nodeId, state] of [
    ['codeOutput', 'none'],
    ['blockDisplay', 'block']]) {
    document.getElementById(nodeId).style.display = state
  }
}

/**
 * Toggle between block input and text input panes.
 */
const generateCodePane = () => {
  for (let nodeId of ['codeOutput', 'blockDisplay']) {
    const node = document.getElementById(nodeId)
    if (node.style.display === 'none') {
      node.style.display = 'block'
    }
    else {
      node.style.display = 'none'
    }
  }
}

/**
 * Show the text based code corresponding to selected blocks.
 */
const showCode = () => {
  const code = Blockly.JavaScript.workspaceToCode(TidyBlocksWorkspace)
  document.getElementById('codeOutput').innerHTML = code
}

/**
 * Set up Blockly display by injecting XML data into blockDisplay div.
 * As a side effect, sets the global TidyBlocksWorkspace variable for later use.
 */
const setUpBlockly = () => {
  TidyBlocksWorkspace = Blockly.inject(
    document.getElementById('blockDisplay'),
    {
      media: 'media/',
      toolbox: document.getElementById('toolbox'),
      horizontalLayout: false,
      scrollbars: false, 
      theme: Blockly.Themes.Tidy
    }
  )

  TidyBlocksWorkspace.addChangeListener(Blockly.Events.disableOrphans)

  TidyBlocksWorkspace.addChangeListener((event) => {
    if (event.type === Blockly.Events.CREATE) {
      const block = TidyBlocksWorkspace.getBlockById(event.blockId)
      PipelineManager.addNewBlock(block)
    }
    else if (event.type === Blockly.Events.DELETE) {
      // FIXME: handle deletion
    }
  })

  SINGLE_COLUMN_FIELDS.forEach(col => {
    Blockly.Extensions.register(`validate_${col}`, createValidator(col, SINGLE_COLUMN_NAME))
  })

  MULTIPLE_COLUMN_FIELDS.forEach(col => {
    Blockly.Extensions.register(`validate_${col}`, createValidator(col, MULTIPLE_COLUMN_NAMES))
  })
}

/**
 * Create a Blockly field validation function for a column.
 * See https://developers.google.com/blockly/guides/create-custom-blocks/fields/validators
 * and https://developers.google.com/blockly/guides/create-custom-blocks/extensions for details.
 * @param {string} columnName Name of column to be validated.
 * @param {regex} pattern Regular expression that must be matched.
 * @returns A function (defined with old-style syntax so that 'this' manipulation will work) to validate column values.
 */
const createValidator = (columnName, pattern) => {
  return function () {
    const field = this.getField(columnName)
    field.setValidator((newValue) => {
      if (newValue.match(pattern)) {
        return newValue.trim() // strip leading and trailing spaces
      }
      return null // fails validation
    })
  }
}

/**
 * Callback for displaying a plot.
 * @param {Object} spec Vega-Lite spec for plot with data filled in.
 */
const displayPlot = (spec) => {
  vegaEmbed('#plotOutput', spec, {})
}

/**
 * Callback for displaying a table as HTML.
 * @param {Object} table JSON array of uniform objects.
 */
const displayTable = (table) => {
  document.getElementById('dataOutput').innerHTML = json2table(table)
}

/**
 * Callback fro displaying an error online.
 * @param {string} error The message to display.
 */
const displayError = (error) => {
  console.log(error) // FIXME display in the GUI
}

/**
 * Run the code generated from the user's blocks.
 * Depends on the global TidyBlocksWorkspace variable.
 */
const runCode = () => {
  Blockly.JavaScript.INFINITE_LOOP_TRAP = null
  PipelineManager.run(() => Blockly.JavaScript.workspaceToCode(TidyBlocksWorkspace),
                        displayTable, displayPlot, displayError, readCSV)
}

/**
 * Save the code generated from the user's workspace.
 * Depends on the global TidyBlocksWorkspace variable.
 */
const saveCode = () => {
  const filename = document.getElementById('filename').value
  if (! filename) {
    window.alert("Empty filename")
  }
  else {
    const xml = Blockly.Xml.workspaceToDom(TidyBlocksWorkspace)
    const text = Blockly.Xml.domToText(xml)
    const link = document.getElementById('download')
    link.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text))
    link.setAttribute('download', filename)
  }
}

/**
 * Load saved code.
 * Depends on the global TidyBlocksWorkspace variable.
 * @param {string[]} fileList List of files (only first element is valid).
 */
const loadCode = (fileList) => {
  const file = fileList[0]
  const text = file.text().then((text) => {
    const xml = Blockly.Xml.textToDom(text)
    Blockly.Xml.clearWorkspaceAndLoadFromXml(xml, TidyBlocksWorkspace)
  })
}
