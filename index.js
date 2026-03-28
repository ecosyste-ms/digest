var { createApp } = require('./app.js')
var port = process.env.PORT || 8080

var server = createApp()

server.listen(port, () => {
  console.log(`Listening on port ${port}`)
})
