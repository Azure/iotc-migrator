import hmacSha256 from 'crypto-js/hmac-sha256'
import base64 from 'crypto-js/enc-base64'

type DTDLCapability = {
    '@id'?: string
    '@type': string
    name: string
    schema?: any
    contents?: DTDLCapability[]
}
export function findComponent(
    dtdlInterface: DTDLCapability,
    componentId: string
): DTDLCapability | null {
    let res = null
    if (
        dtdlInterface['@type'] === 'Component' &&
        (dtdlInterface['@id'] === componentId ||
            dtdlInterface.schema['@id'] === componentId)
    ) {
        res = dtdlInterface
    }
    if (dtdlInterface.contents && dtdlInterface.contents.length > 0) {
        res =
            dtdlInterface.contents.find(
                (c) => findComponent(c, componentId) !== null
            ) || null
    }

    return res
}

export function generateSaSToken(
    hubName: string,
    signingKey: string,
    policyName: string
) {
    const resourceUri = encodeURIComponent(hubName)

    // Set expiration in seconds
    const expires = Math.ceil(Date.now() / 1000 + 3600)
    const toSign = resourceUri + '\n' + expires

    // Use crypto
    const hmac = hmacSha256(toSign, base64.parse(signingKey))
    const base64UriEncoded = encodeURIComponent(base64.stringify(hmac))

    // Construct authorization string
    return `SharedAccessSignature sr=${resourceUri}&sig=${base64UriEncoded}&se=${expires}${
        policyName ? `&skn=${policyName}` : ''
    }`
}

export function filterHubs(hubs: any[], hubHosts: string[]) {
    const hubNames = hubHosts.map((h) => h.split('.azure-devices.net')[0])
    return hubs.filter((h) => hubNames.includes(h.name))
}
