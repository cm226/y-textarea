const path = require('path')
const { defineConfig } = require('vite')

module.exports = defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/y-textArea.ts'),
      name: 'y-textArea',
      fileName: (format) => `y-textArea.${format}.js`
    },
    rollupOptions: {
      // make sure to externalize deps that shouldn't be bundled
      // into your library
      external: ['fast-diff', 'yjs'],
      output: {
        // Provide global variables to use in the UMD build
        // for externalized deps
        globals: {
          'fast-diff': 'diff',
          'yjs' : 'Y'
        }
      }
    }
  }
})