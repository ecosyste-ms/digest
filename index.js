const { createApp } = require('./app.js')
const port = process.env.PORT || 8080

const app = createApp()

app.listen(port, () => {
  console.log(`Listening on port ${port}`)
})
