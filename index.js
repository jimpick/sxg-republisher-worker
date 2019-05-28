const path = require('path')
const AWS = require('aws-sdk')
const delay = require('delay')

require('dotenv').config()

// const fastify = require('fastify')({ logger: true })
const fastify = require('fastify')()

fastify.register(require('fastify-static'), {
  root: path.join(__dirname, 'public')
})

fastify.post('/api/publish', (req, reply) => {
  console.log('Publish request:', req.body)
  reply.send({ success: true })
})

fastify.listen(13023, (err, address) => {
  if (err) throw err
  fastify.log.info(`server listening on ${address}`)
})

