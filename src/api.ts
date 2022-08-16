import {
    AccountInfo,
    LogLevel,
    PublicClientApplication,
} from '@azure/msal-browser'
import {
    API_VERSIONS,
    TOKEN_AUDIENCES,
    ApiError,
    JOB_DESCRIPTION,
    JobResult,
    JobPayload,
    EnrollmentGroup,
} from './types'
import { v4 as uuid } from 'uuid'
import axios from 'axios'

export const msalConfig = {
    auth: {
        clientId: process.env['REACT_APP_AAD_APP_CLIENT_ID'] || '',
        authority: `https://login.microsoftonline.com/${process.env['REACT_APP_AAD_APP_TENANT_ID']}`,
        redirectUri: process.env['REACT_APP_AAD_APP_REDIRECT_URI'] || '',
    },
    cache: {
        cacheLocation: 'sessionStorage',
        storeAuthStateInCookie: false,
    },
    system: {
        loggerOptions: {
            loggerCallback: (
                level: LogLevel,
                message: string,
                containsPii: boolean
            ) => {
                if (containsPii) {
                    return
                }
                switch (level) {
                    case LogLevel.Error:
                        console.error(message)
                        return
                    case LogLevel.Info:
                        console.info(message)
                        return
                    case LogLevel.Verbose:
                        console.debug(message)
                        return
                    case LogLevel.Warning:
                        console.warn(message)
                        return
                }
            },
        },
    },
}

const msalInstance = new PublicClientApplication(msalConfig)
const basicAuthParameters = {
    scopes: ['user.read'],
    extraScopesToConsent: ['https://management.azure.com/user_impersonation'],
}

let account: AccountInfo | null

function getAccount(): AccountInfo | null {
    // need to call getAccount here?
    const cache = msalInstance.getTokenCache()
    const currentAccounts = msalInstance.getAllAccounts()

    if (currentAccounts === null) {
        console.log('No accounts detected')
        return null
    }

    if (currentAccounts.length > 1) {
        // Add choose account code here
        console.log(
            'Multiple accounts detected, need to add choose account code.'
        )
        return currentAccounts[0]
    } else if (currentAccounts.length === 1) {
        return currentAccounts[0]
    } else {
        return null
    }
}

export async function loginSilent(): Promise<AccountInfo | null> {
    if (!account) {
        account = getAccount()
    }
    return account
}

export async function login(resource?: string) {
    const auth = await msalInstance.loginPopup(
        resource ? { scopes: [resource] } : basicAuthParameters
    )
    if (auth && auth.account) {
        account = auth.account
    } else {
        account = getAccount()
    }
    return auth
}

export async function logout() {
    await msalInstance.logoutPopup({
        postLogoutRedirectUri: process.env['REACT_APP_AAD_APP_REDIRECT_URI'],
        mainWindowRedirectUri: process.env['REACT_APP_AAD_APP_REDIRECT_URI'],
    })
}

export async function getToken(resource: string) {
    try {
        if (!account) {
            throw new Error('Account not found')
        }
        const authResult = await msalInstance.acquireTokenSilent({
            scopes: [resource],
            account,
        })
        return authResult.accessToken
    } catch (e) {
        console.log(e)
        return (await login(resource)).accessToken
    }
}

export async function getHubKeys(hubId: string, policyName: string) {
    const armToken = await getToken(
        'https://management.azure.com/user_impersonation'
    )
    const params = {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${armToken}`,
        },
    }

    const hubResp = await fetch(
        `https://management.azure.com${hubId}/IoTHubKeys/${policyName}/listkeys?api-version=${API_VERSIONS.IoTHubArm}`,
        params
    )
    return hubResp.json()
}

export async function getDPSKeys(dpsId: string, policyName: string) {
    const armToken = await getToken(
        'https://management.azure.com/user_impersonation'
    )
    const params = {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${armToken}`,
        },
    }

    const dpsResp = await fetch(
        `https://management.azure.com${dpsId}/keys/${policyName}/listkeys?api-version=${API_VERSIONS.DPS}`,
        params
    )
    return dpsResp.json()
}

export async function getDPSEnrollmentKeys(
    dpsHost: string,
    sasToken: string
): Promise<{ primaryKey: string; secondaryKey: string }> {
    const params = {
        method: 'POST',
        crossDomain: true,
        headers: {
            Authorization: sasToken,
            'Content-Type': 'application/json',
            Accept: '*/*',
            Host: dpsHost,
        },
        body: JSON.stringify({
            query: '*',
        }),
    }
    const resp = await axios.post(
        `https://${dpsHost}/enrollmentGroups/query?api-version=${API_VERSIONS.DPSData}`,
        {
            query: '*',
        },
        {
            withCredentials: false,
            headers: {
                Authorization: sasToken,
                'Content-Type': 'application/json',
            },
        }
    )
    const listResp = await fetch(
        `https://${dpsHost}/enrollmentGroups/query?api-version=${API_VERSIONS.DPSData}`,
        params
    )
    const groups = await listResp.json()
    const group = groups.find((g: any) => g.attestation.type === 'symmetricKey')
    if (!group) {
        throw new ApiError(
            'Failed to query DPS',
            'Cannot find an enrollment group with symmetric keys.'
        )
    }
    const enrollMentResp = await fetch(
        `https://${dpsHost}/enrollmentGroups/${group.enrollmentGroupId}attestationmechanism?api-version=${API_VERSIONS.DPSData}`,
        params
    )
    return (await enrollMentResp.json()).symmetricKey
}

export async function listDPSs() {
    const armToken = await getToken(
        'https://management.azure.com/user_impersonation'
    )
    const params = {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${armToken}`,
        },
    }
    const subResp = await fetch(
        `https://management.azure.com/subscriptions?api-version=${API_VERSIONS.ResourceManager}`,
        params
    )
    const subs = (await subResp.json()).value
    const resources = await Promise.all(
        subs.map(async (sub: any) => {
            const resResp = await fetch(
                `https://management.azure.com/subscriptions/${sub.subscriptionId}/resources?api-version=${API_VERSIONS.ResourceManager}&$filter=resourceType eq 'Microsoft.Devices/provisioningServices'`,
                params
            )
            const resources = (await resResp.json()).value
            return resources.map((r: any) => ({
                ...r,
                dpsLink: `https://portal.azure.com/#@${sub.tenantId}/resource${r.id}`,
            }))
        })
    )
    const data = await Promise.all(
        resources.flat().map(async (res: any) => {
            const resResp = await fetch(
                `https://management.azure.com${res.id}?api-version=${API_VERSIONS.DPS}`,
                params
            )
            const data = await resResp.json()
            return { ...data, dpsLink: res.dpsLink }
        })
    )
    return data
}

export async function listHubs() {
    const armToken = await getToken(
        'https://management.azure.com/user_impersonation'
    )
    const params = {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${armToken}`,
        },
    }
    const subResp = await fetch(
        `https://management.azure.com/subscriptions?api-version=${API_VERSIONS.ResourceManager}`,
        params
    )
    const subs = (await subResp.json()).value
    const resources = await Promise.all(
        subs.map(async (sub: any) => {
            const resResp = await fetch(
                `https://management.azure.com/subscriptions/${sub.subscriptionId}/resources?api-version=${API_VERSIONS.ResourceManager}&$filter=resourceType eq 'Microsoft.Devices/IotHubs'`,
                params
            )
            const resources = (await resResp.json()).value
            return resources.map((r: any) => ({
                ...r,
                hubLink: `https://portal.azure.com/#@${sub.tenantId}/resource${r.id}`,
            }))
        })
    )
    const data = await Promise.all(
        resources.flat().map(async (res: any) => {
            const resResp = await fetch(
                `https://management.azure.com${res.id}?api-version=${API_VERSIONS.IoTHubArm}`,
                params
            )
            const data = await resResp.json()
            return { ...data, hubLink: res.hubLink }
        })
    )
    return data
}

export async function listDevicesInHub(
    hubHost: string,
    sasToken: string
): Promise<any[]> {
    const params = {
        method: 'POST',
        headers: {
            Authorization: sasToken,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            query: 'select * from devices',
        }),
    }
    const listResp = await fetch(
        `https://${hubHost}/devices/query?api-version=${API_VERSIONS.IoTHubData}`,
        params
    )
    return listResp.json()
}

export async function invokeCommand(
    hubHost: string,
    sasToken: string,
    deviceId: string,
    idScope: string
) {
    const params = {
        method: 'POST',
        headers: {
            Authorization: sasToken,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            methodName: 'DeviceMove',
            payload: idScope,
        }),
    }
    const cmdResp = await fetch(
        `https://${hubHost}/twins/${deviceId}/methods?api-version=${API_VERSIONS.IoTHubData}`,
        params
    )
    if (!cmdResp.ok && cmdResp.status === 404) {
        throw new ApiError(
            'IoT Hub error',
            `Device ${deviceId} not found or not online.`
        )
    }
    return cmdResp.json()
}

export async function listCentralApps() {
    const armToken = await getToken(
        'https://management.azure.com/user_impersonation'
    )
    const params = {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${armToken}`,
        },
    }
    const subResp = await fetch(
        `https://management.azure.com/subscriptions?api-version=${API_VERSIONS.ResourceManager}`,
        params
    )
    const subs = (await subResp.json()).value
    const resources = await Promise.all(
        subs.map(async (sub: any) => {
            const resResp = await fetch(
                `https://management.azure.com/subscriptions/${sub.subscriptionId}/providers/Microsoft.IoTCentral/iotApps?api-version=2021-06-01`,
                params
            )
            const resources = (await resResp.json()).value
            return resources
        })
    )
    return resources.flat()
}

export async function listDeviceGroups(appDomain: string) {
    const centralToken = await getToken(TOKEN_AUDIENCES.Central)
    const params = {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${centralToken}`,
        },
    }
    const groups = await fetch(
        `https://${appDomain}.azureiotcentral.com/api/deviceGroups?api-version=${API_VERSIONS.Central}`,
        params
    )
    return (await groups.json()).value
}

export async function createCentralEnrollment(
    appDomain: string,
    symmetricKey: { primaryKey: string; secondaryKey: string }
) {
    const centralToken = await getToken(TOKEN_AUDIENCES.Central)
    const params = {
        method: 'PUT',
        headers: {
            Authorization: `Bearer ${centralToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            displayName: 'MIGRATION_ENROLLMENT',
            enabled: true,
            type: 'iot',
            attestation: {
                type: 'symmetricKey',
                symmetricKey,
            },
        }),
    }
    const enrollmentGroup = await fetch(
        `https://${appDomain}.azureiotcentral.com/api/enrollmentGroups/${uuid()}?api-version=${
            API_VERSIONS.Central
        }`,
        params
    )
    if (!enrollmentGroup.ok) {
        if (enrollmentGroup.status === 409) return
    }
    return enrollmentGroup.json()
}

export async function getCentralIdScope(
    appDomain: string,
    centralToken?: string
) {
    // lack of support for getting id scope. creating a temp device to fetch it
    const bearer = centralToken || (await getToken(TOKEN_AUDIENCES.Central))

    const tempDevId = uuid()
    const createparams = {
        method: 'PUT',
        headers: {
            Authorization: `Bearer ${bearer}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            displayName: 'tempdev',
            enabled: true,
            simulated: false,
        }),
    }
    const tempDev = await fetch(
        `https://${appDomain}.azureiotcentral.com/api/devices/${tempDevId}?api-version=${API_VERSIONS.Central}`,
        createparams
    )
    if (!tempDev.ok) {
        throw new ApiError(
            'IoT Central error',
            'Cannot fetch Id Scope information'
        )
    }
    const getParams = {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${bearer}`,
        },
    }
    const creds = await fetch(
        `https://${appDomain}.azureiotcentral.com/api/devices/${tempDevId}/credentials?api-version=${API_VERSIONS.Central}`,
        getParams
    )
    if (!creds.ok) {
        throw new ApiError(
            'IoT Central error',
            'Cannot fetch Id Scope information'
        )
    }
    const idScope = (await creds.json()).idScope

    // delete device
    const deleteparams = {
        method: 'DELETE',
        headers: {
            Authorization: `Bearer ${bearer}`,
        },
    }
    const deleteDev = await fetch(
        `https://${appDomain}.azureiotcentral.com/api/devices/${tempDevId}?api-version=${API_VERSIONS.Central}`,
        deleteparams
    )
    if (!deleteDev.ok) {
        throw new ApiError(
            'IoT Central error',
            'Cannot delete temporary device'
        )
    }
    return idScope
}

export async function getCentralEnrollment(
    appDomain: string,
    centralToken?: string
): Promise<EnrollmentGroup> {
    const bearer = centralToken || (await getToken(TOKEN_AUDIENCES.Central))
    const getParams = {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${bearer}`,
        },
    }
    const enrollments = await fetch(
        `https://${appDomain}.azureiotcentral.com/api/enrollmentGroups?api-version=${API_VERSIONS.Central}`,
        getParams
    )
    if (!enrollments.ok) {
        throw new ApiError('IoT Central error', 'Cannot list enrollment groups')
    }
    const enrollmentGroups = (await enrollments.json()).value
    const attestation = enrollmentGroups.find(
        (e: any) => e.type === 'iot' && e.attestation.type === 'symmetricKey'
    )
    if (!attestation) {
        throw new ApiError(
            'IoT Central error',
            'Cannot find an enrollment group with symmetric keys attestation'
        )
    }
    return {
        idScope: await getCentralIdScope(appDomain, bearer),
        ...attestation.symmetricKey,
    }
}

export async function listJobs(appDomain: string) {
    const centralToken = await getToken(TOKEN_AUDIENCES.Central)
    const params = {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${centralToken}`,
        },
    }
    const jobs = await fetch(
        `https://${appDomain}.azureiotcentral.com/api/jobs?api-version=${API_VERSIONS.Central}`,
        params
    )
    const res: JobResult[] = (await jobs.json()).value
    return res.filter((r) => r.description === JOB_DESCRIPTION)
}

export async function listDeviceTemplates(appDomain: string) {
    const centralToken = await getToken(TOKEN_AUDIENCES.Central)
    const params = {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${centralToken}`,
        },
    }
    const templates = await fetch(
        `https://${appDomain}.azureiotcentral.com/api/deviceTemplates?api-version=${API_VERSIONS.Central}`,
        params
    )
    return (await templates.json()).value
}

/**
 *
 * @param appDomain
 * @param migrationData
 * @returns migrationStatus
 * @throws ApiError
 */
export async function createMigrationJob(
    appDomain: string,
    migrationData: JobPayload
) {
    const centralToken = await getToken(TOKEN_AUDIENCES.Central)
    const params = {
        method: 'PUT',
        body: JSON.stringify(migrationData),
        headers: {
            Authorization: `Bearer ${centralToken}`,
            'Content-Type': 'application/json',
        },
    }
    const job = await fetch(
        `https://${appDomain}.azureiotcentral.com/api/jobs/${uuid()}?api-version=${
            API_VERSIONS.Central
        }`,
        params
    )
    if (!job.ok) {
        const errbody = await job.json()
        let message = errbody.error.message
        if (job.status === 422) {
            //bad template
            message = `${message}\n.Make sure you have the "DeviceMigration" component in your model definition.\nCheck documentation for instructions.`
        }
        throw new ApiError(errbody.error.code, message)
    }
    return job.json()
}
