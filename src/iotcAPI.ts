import axios from 'axios';
import { uuid } from 'uuidv4';
import { AuthContextInterface, Scopes } from './context/authContext';

interface IOTCentralResponse<T> {
    data: {
        value: T[];
    };
}


export interface DeviceGroup {
    id: string;
    displayName: string;
    organizations: string[];
}

export interface DeviceTemplate {
    id: string;
    types: string[];
    capabilityModel: Object;
    solutionModel: Object;
    displayName: string;
    etag: string;
}

export interface Job { }

export interface DPS {
    subscriptionId: string;
}

export interface AppSubs {
    subscriptionId: string;
    displayName: string;
}

export async function getGroups(authContext: AuthContextInterface): Promise<DeviceGroup[]> {
    try {
        const token = await authContext.getAccessToken(authContext.loginAccount, Scopes.Central);
        const res: IOTCentralResponse<DeviceGroup> = await axios(`https://${authContext.applicationHost}/api/preview/deviceGroups`, { headers: { 'Authorization': 'Bearer ' + token } });
        return res.data.value;
    } catch (error) {
        throw error;
    }
}

export async function getTemplates(authContext: AuthContextInterface): Promise<DeviceTemplate[]> {
    try {
        const token = await authContext.getAccessToken(authContext.loginAccount, Scopes.Central);
        const res: IOTCentralResponse<DeviceTemplate> = await axios(`https://${authContext.applicationHost}/api/preview/deviceTemplates`, { headers: { 'Authorization': 'Bearer ' + token } });
        return res.data.value;
    } catch (error) {
        throw error;
    }
}

export interface JobPayload {
    group: string;
    migrationName: string;
    migrationOption: 'App' | 'Hub';
    target: string;
    template: boolean;
}

export async function postJob(authContext: AuthContextInterface, payload: JobPayload): Promise<Job> {
    try {
        const token = await authContext.getAccessToken(authContext.loginAccount, Scopes.Central);
        const res: IOTCentralResponse<Job> = await axios.put(`https://${authContext.applicationHost}/api/jobs/${uuid()}?api-version=1.1-preview`,
            {
                displayName: payload.migrationName,
                description: 'AUTOMATED-DEVICE-MOVE',
                group: payload.group,
                data: [
                    {
                        type: 'CommandJobData',
                        target: payload.template,
                        path: 'DeviceMove',
                        value: payload.target
                    }
                ]
            },
            { headers: { 'Authorization': 'Bearer ' + token } }
        );

        return res.data;
    } catch (error) {
        throw error;
    }
}

export interface Row {
    key: string;
    id: string;
    name: string;
    dgroup: string;
    status: string;
}

export interface Col {
    key: string;
    name: string;
    fieldName: string;
    isResizable: boolean;
    minWidth: number;
}


export async function getJobs(authContext: AuthContextInterface) {
    try {
        const token = await authContext.getAccessToken();
        const res = await axios(`https://${authContext.applicationHost}/api/preview/jobs`,
            {
                headers: { 'Authorization': 'Bearer ' + token }
            });

        const rows: Row[] = [];
        for (const i in res.data.value) {
            const job = res.data.value[i];
            if (job.description && job.description.startsWith('AUTOMATED-DEVICE-MOVE')) {
                rows.push({
                    key: i,
                    id: job.id,
                    name: job.displayName,
                    dgroup: job.group,
                    status: job.status
                })
            }
        }
        const cols: Col[] = [
            { key: '1', name: 'Migration job name', fieldName: 'id', isResizable: true, minWidth: 150 },
            { key: '2', name: 'Device group', fieldName: 'dgroup', isResizable: true, minWidth: 150 },
            { key: '3', name: 'Status', fieldName: 'status', isResizable: true, minWidth: 150 }
        ]
        return { rows, cols };

    } catch (error) {
        throw error;
    }
}


interface App {
    key: string;
    text: string;
    app: Object;
    sub: Object;
}

export async function getDPS(authContext: AuthContextInterface) {
    try {
        const armToken = await authContext.getAccessToken(authContext.loginAccount, Scopes.ARM);
        let apps: App[] = [];
        const res: IOTCentralResponse<DPS> = await axios.get(`https://management.azure.com/subscriptions?api-version=2020-01-01`,
            {
                headers: { Authorization: 'Bearer ' + armToken }
            });
        const subs = res.data.value;
        if (!subs || subs.length === 0) {
            return apps;
        }
        for (const i in subs) {
            const sub = subs[i];
            const subscriptionResponse = await axios.get(`https://management.azure.com/subscriptions/${sub.subscriptionId}/providers/Microsoft.Devices/provisioningServices?api-version=2018-01-22`,
                {
                    headers: { Authorization: 'Bearer ' + armToken }
                });

            for (const i in subscriptionResponse.data.value) {
                const app = subscriptionResponse.data.value[i];
                apps.push({
                    key: app.properties.idScope,
                    text: app.properties.serviceOperationsHostName,
                    app,
                    sub
                });
            }

            return apps;
        }
    } catch (error) {
        throw error;
    }
}

export async function getSubscriptionsApps(authContext: AuthContextInterface) {
    try {
        const armToken = await authContext.getAccessToken(authContext.loginAccount, Scopes.ARM);
        let apps: App[] = [];
        const response: IOTCentralResponse<AppSubs> = await axios.get(`https://management.azure.com/subscriptions?api-version=2020-01-01`,
            {
                headers: { Authorization: 'Bearer ' + armToken }
            });
        const subs = response.data.value;
        if (!subs || subs.length === 0) {
            return apps;
        }
        for (const i in subs) {
            const sub = subs[i];
            const subscriptionResponse = await axios.get(`https://management.azure.com/subscriptions/${sub.subscriptionId}/providers/Microsoft.IoTCentral/IoTApps?api-version=2018-09-01`,
                {
                    headers: { Authorization: 'Bearer ' + armToken }
                });

            for (const i in subscriptionResponse.data.value) {
                const app = subscriptionResponse.data.value[i];
                apps.push({
                    key: app.properties.applicationId,
                    text: `(${sub.displayName}) - ${app.properties.displayName}`,
                    app,
                    sub
                })
            }
            return apps;
        }
    } catch (error) {
        throw error;
    }
}