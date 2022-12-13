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

//#region apitypes
type EnrollmentGroupResponse = {
    id: string
    displayName: string
    enabled: boolean
    type: 'iot' | 'iotEdge'
    attestation: {
        type: 'symmetricKey' | 'x509'
        symmetricKey?: {
            primaryKey: string
            secondaryKey: string
        }
        x509?: {
            signingCertificates: any
        }
    }
    etag: string
}
//#endregion

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

export async function getToken(resource: string, useHome?: boolean) {
    try {
        if (!account) {
            throw new Error('Account not found')
        }
        const homeTenant = account.homeAccountId.split('.')[1];
        if (useHome && homeTenant !== process.env['REACT_APP_AAD_APP_TENANT_ID']) {
            const auth = await msalInstance.loginPopup({
                authority: `https://login.microsoftonline.com/${homeTenant}`,
                scopes: [resource]
            });
            return auth.accessToken;
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

export async function createDpsEnrollment(
    dpsName: string,
    dpsId: string,
    enrollment: EnrollmentGroup,
    iotHubs: string[]
) {
    const enrollmentGroupId = uuid()
    const params = {
        method: 'PUT',
        headers: {
            Authorization: await getDPSKeys(dpsId, 'provisioningserviceowner'),
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            enrollmentGroupId,
            attestation: {
                type: 'symmetricKey',
                symmetricKey: {
                    primaryKey: enrollment.primaryKey,
                    secondaryKey: enrollment.secondaryKey,
                },
            },
            capabilities: {
                iotEdge: false,
            },
            reprovisionPolicy: {
                updateHubAssignment: true,
                migrateDeviceData: true,
            },
            allocationPolicy: 'hashed',
            iotHubs: [],
        }),
    }
    const resp = await fetch(
        `https://${dpsName}.azure-devices-provisioning.net/enrollmentGroups/${enrollmentGroupId}?api-version=${API_VERSIONS.DPSData}`,
        params
    )
    const data = await resp.json()
    if (!resp.ok) {
        throw new ApiError('Error working on DPS', data)
    }
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
    idScope: string,
    deviceTemplateId?: string
) {
    const params = {
        method: 'POST',
        headers: {
            Authorization: sasToken,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            methodName: 'DeviceMove',
            payload: { idScope, deviceTemplateId },
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

export async function listDeviceGroups(appSubdomain: string) {
    const centralToken = await getToken(TOKEN_AUDIENCES.Central, true)
    const params = {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${centralToken}`,
        },
    }
    const groups = await fetch(
        `https://${appSubdomain}.azureiotcentral.com/api/deviceGroups?api-version=${API_VERSIONS.Central}`,
        params
    )
    return (await groups.json()).value
}

export async function createCentralEnrollment(
    appSubdomain: string,
    symmetricKey: { primaryKey: string; secondaryKey: string }
): Promise<EnrollmentGroup> {
    const centralToken = await getToken(TOKEN_AUDIENCES.Central)
    let resp
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
        `https://${appSubdomain}.azureiotcentral.com/api/enrollmentGroups/${uuid()}?api-version=${API_VERSIONS.Central
        }`,
        params
    )
    if (!enrollmentGroup.ok) {
        if (enrollmentGroup.status === 409) {
            // fetch the group
            const params = {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${centralToken}`,
                },
            }
            const enrollmentGroups: { value: EnrollmentGroupResponse[] } =
                await (
                    await fetch(
                        `https://${appSubdomain}.azureiotcentral.com/api/enrollmentGroups?api-version=${API_VERSIONS.Central}`,
                        params
                    )
                ).json()
            resp = enrollmentGroups.value.find(
                (enrl) =>
                    enrl.type === 'iot' &&
                    enrl.attestation.type === 'symmetricKey' &&
                    enrl.attestation.symmetricKey?.primaryKey ===
                    symmetricKey.primaryKey &&
                    enrl.attestation.symmetricKey.secondaryKey ===
                    symmetricKey.secondaryKey
            )
            if (!resp) {
                throw new ApiError(
                    'IoT Central error',
                    'Cannot create enrollment group on target application'
                )
            }
        }
    } else {
        resp = await enrollmentGroup.json()
    }
    return {
        idScope: await _getCentralIdScope(appSubdomain, centralToken),
        ...resp.attestation.symmetricKey!,
    }
}

async function _getCentralIdScope(appSubdomain: string, centralToken?: string) {
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
        `https://${appSubdomain}.azureiotcentral.com/api/devices/${tempDevId}?api-version=${API_VERSIONS.Central}`,
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
        `https://${appSubdomain}.azureiotcentral.com/api/devices/${tempDevId}/credentials?api-version=${API_VERSIONS.Central}`,
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
        `https://${appSubdomain}.azureiotcentral.com/api/devices/${tempDevId}?api-version=${API_VERSIONS.Central}`,
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
    appSubdomain: string,
    centralToken?: string
) {
    const bearer = centralToken || (await getToken(TOKEN_AUDIENCES.Central))
    const getParams = {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${bearer}`,
        },
    }
    const enrollments = await fetch(
        `https://${appSubdomain}.azureiotcentral.com/api/enrollmentGroups?api-version=${API_VERSIONS.Central}`,
        getParams
    )
    if (!enrollments.ok) {
        throw new ApiError('IoT Central error', 'Cannot list enrollment groups')
    }
    const enrollmentGroups: EnrollmentGroupResponse[] = (
        await enrollments.json()
    ).value
    const group = enrollmentGroups.find(
        (e: any) => e.type === 'iot' && e.attestation.type === 'symmetricKey'
    )
    if (!group) {
        throw new ApiError(
            'IoT Central error',
            'Cannot find an enrollment group with symmetric keys attestation'
        )
    }
    return group.attestation.symmetricKey
}

export async function getCentralCredentials(
    appSubdomain: string,
    centralToken?: string
): Promise<EnrollmentGroup> {
    const bearer = centralToken || (await getToken(TOKEN_AUDIENCES.Central))
    const enrollment = await getCentralEnrollment(appSubdomain, bearer)
    return {
        idScope: await _getCentralIdScope(appSubdomain, bearer),
        ...enrollment!,
    }
}

export async function listJobs(appSubdomain: string) {
    const centralToken = await getToken(TOKEN_AUDIENCES.Central)
    const params = {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${centralToken}`,
        },
    }
    const jobs = await fetch(
        `https://${appSubdomain}.azureiotcentral.com/api/jobs?api-version=${API_VERSIONS.Central}`,
        params
    )
    const res: JobResult[] = (await jobs.json()).value
    return res.filter((r) => r.description === JOB_DESCRIPTION)
}

export async function listDeviceTemplates(appSubdomain: string) {
    const centralToken = await getToken(TOKEN_AUDIENCES.Central)
    const params = {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${centralToken}`,
        },
    }
    const templates = await fetch(
        `https://${appSubdomain}.azureiotcentral.com/api/deviceTemplates?api-version=${API_VERSIONS.Central}`,
        params
    )
    return (await templates.json()).value
}

/**
 *
 * @param appSubdomain
 * @param migrationData
 * @returns migrationStatus
 * @throws ApiError
 */
export async function createMigrationJob(
    appSubdomain: string,
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
        `https://${appSubdomain}.azureiotcentral.com/api/jobs/${uuid()}?api-version=${API_VERSIONS.Central
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
