const path = require('path')
const AWS = require('aws-sdk')
const delay = require('delay')
const oauthPlugin = require('fastify-oauth2')

require('dotenv').config()

// const fastify = require('fastify')({ logger: true })
const fastify = require('fastify')()

fastify.register(require('fastify-static'), {
  root: path.join(__dirname, 'public')
})

fastify.register(oauthPlugin, {
  // FIXME: GitHub
  name: 'githubOAuth2',
  credentials: {
    client: {
      id: '72308d8f277638d06b63',
      secret: '77b47511697c2a41cfd7a6a1389dd5da7cdb3c77'
    },
    auth: oauthPlugin.GITHUB_CONFIGURATION
  },
  // register a fastify url to start the redirect flow
  startRedirectPath: '/login/github',
  // facebook redirect here after the user login
  callbackUri: 'http://localhost:13023/login/github/callback'
})

fastify.post('/api/publish', (req, reply) => {
  console.log('Publish request:', req.body)
  reply.send({ success: true })
})

fastify.get('/login/github/callback', async function (request, reply) {
  const result = await this.getAccessTokenFromAuthorizationCodeFlow(request)

  console.log(result.access_token)

  reply.send({ access_token: result.access_token })
})

fastify.listen(13023, (err, address) => {
  if (err) throw err
  fastify.log.info(`server listening on ${address}`)
})

