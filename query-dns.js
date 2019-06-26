const AWS = require('aws-sdk')

require('dotenv').config()

async function queryDns () {
  const route53 = new AWS.Route53({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  })
  const zones = (await route53.listHostedZones().promise()).HostedZones
  const zone = zones.filter(({ Name }) => Name === 'v6z.me.')[0]
  const zoneId = zone.Id

  const records = (await route53.listResourceRecordSets({
    HostedZoneId: zoneId
  }).promise()).ResourceRecordSets
  return records
}

module.exports = queryDns

