const path = require('path')
const AWS = require('aws-sdk')
const delay = require('delay')

require('dotenv').config()

const user = 'jimpick'

/*
const siteName = 'index'
const cid = 'QmaESbPUk9ifYSiTgjXizp4DahbfpFGKKFyj5WGDuJyG8W'
const sxgCid = 'QmbjzfWagtGAeNeiM1msmxhLK5oEgY7VHLsNfQiwKmufxx'
*/

/*
const siteName = 'ipfs-docs'
const cid = 'QmQnTyd54imxXb9oC49ujk7HnJJt9dfctmRhUxz1XoM3om'
const sxgCid = 'Qmct2SvuWTjmUsSP3djgCNDafDnMRTJxQ6qef1R8LwYAos'
*/

/*
const siteName = 'ipld'
const cid = 'QmXb2bKQdgNhC7vaiKQgXFtt7daUZD382L54UTTNXnwQTD'
const sxgCid = 'Qme6j9Q2w74U9JqYHPMyge54jJc6ffM8P3uG8ZtTcsLeAk'
*/

const siteName = 'peerpad'
const cid = 'QmWbsqqqG9YpNYDt5afp6HY8TrKMtCtdGUtUfgkS9fRYeH'
const sxgCid = 'QmXqRHSzn4moGLu831DXLaoVHyeY5BE9FP1fL939yrVfsp'

async function run () {
  const route53 = new AWS.Route53({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  })
  const zones = (await route53.listHostedZones().promise()).HostedZones
  const zone = zones.filter(({ Name }) => Name === 'v6z.me.')[0]
  const zoneId = zone.Id

  /*
  const records = (await route53.listResourceRecordSets({
    HostedZoneId: zoneId
  }).promise()).ResourceRecordSets
  console.log('records', JSON.stringify(records, null, 2))
  */

  const startTime = Date.now()
  const upsert = (await route53.changeResourceRecordSets({
    HostedZoneId: zoneId,
    ChangeBatch: {
      Changes: [
        {
          Action: 'UPSERT',
          ResourceRecordSet: {
            Name: `${siteName}-${user}.ipfs.v6z.me.`,
            Type: 'A',
            TTL: 60,
            ResourceRecords: [
              {
                Value: '64.46.28.178'
              }
            ]
          }
        },
        {
          Action: 'UPSERT',
          ResourceRecordSet: {
            Name: `_dnslink.${siteName}-${user}.ipfs.v6z.me.`,
            Type: 'TXT',
            TTL: 60,
            ResourceRecords: [
              {
                Value: `"dnslink=/ipfs/${cid}"`
              }
            ]
          }
        },
        {
          Action: 'UPSERT',
          ResourceRecordSet: {
            Name: `sxg.${siteName}-${user}.ipfs.v6z.me.`,
            Type: 'A',
            TTL: 60,
            ResourceRecords: [
              {
                Value: '64.46.28.178'
              }
            ]
          }
        },
        {
          Action: 'UPSERT',
          ResourceRecordSet: {
            Name: `_dnslink.sxg.${siteName}-${user}.ipfs.v6z.me.`,
            Type: 'TXT',
            TTL: 60,
            ResourceRecords: [
              {
                Value: `"dnslink=/ipfs/${sxgCid}"`
              }
            ]
          }
        }
      ]
    }
  }).promise()).ChangeInfo

  console.log('upsert', upsert)
  const upsertId = upsert.Id
  while (true) {
    const change = (await route53.getChange({ Id: upsertId }).promise())
      .ChangeInfo
    console.log(
      `${Math.floor((Date.now() - startTime) / 1000)}s`,
      change.Status
    )
    if (change.Status !== 'PENDING') break
    await delay(1000)
  }
}

run()

