import { html } from 'https://unpkg.com/lit-html?module'

const sitesTemplate = (sites) => {
  if (!sites) {
    return html`<h2>Sites</h2>Loading...`
  }
  const sortedSites = sites.sort(siteSort)
  const links = sortedSites.map(site => {
    const url = `https://${site.name}-${site.user}.ipfs.v6z.me/`
    return html`
      <li>
        ${site.user}: <a href=${url}>${site.name}</a>
      </li>
    `
  })
  return html`
    <h2>Sites</h2>
    <ul>${links}</ul>
    <a href="/">Top</a>
  `
}

function siteSort (siteA, siteB) {
  const userCompare = siteA.user.localeCompare(siteB.user)
  if (userCompare) return userCompare
  return siteA.name.localeCompare(siteB.name)
}

export default sitesTemplate
