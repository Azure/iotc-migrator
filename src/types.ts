export const JOB_DESCRIPTION = 'AUTOMATED-DEVICE-MOVE'
export const STORAGE_ITEM = 'hubJobs'

export enum MigrationMode {
    Central = 'Central',
    FromHub = 'FromHub',
    ToHub = 'ToHub',
}

export type RecursivePartial<T> = {
    [P in keyof T]?: RecursivePartial<T[P]>
}

export interface FormValues {
    name: string
    mode: MigrationMode
    source: SourceService
    target: TargetService
}

export enum ServiceType {
    Central = 'Central',
    DPS = 'Dps',
    DeviceGroup = 'DeviceGroup',
    DeviceTemplate = 'DeviceTemplate',
}

export type CentralSourceParams = {
    groupId: string
    deviceTemplateId: string
    componentName: string
}

export type CentralTargetParams = {
    idScope?: string
    deviceTemplateId?: string
}

export type DPSSourceParams = {
    dpsHost: string
    dpsLink: string
    idScope: string
    iothubs: {
        name: string
        host: string
        id: string
        selected: boolean
    }[]
}

export type DPSTargetParams = {
    idScope: string
    dpsName: string
    dpsId: string
}

export interface ServiceBase {
    id: string
    name: string
}

export interface CentralSourceService extends ServiceBase {
    type: ServiceType.Central
    params: CentralSourceParams
}

export interface DPSSourceService extends ServiceBase {
    type: ServiceType.DPS
    params: DPSSourceParams
}

export interface CentralTargetService extends ServiceBase {
    type: ServiceType.Central
    params: CentralTargetParams
}

export interface DPSTargetService extends ServiceBase {
    type: ServiceType.DPS
    params: DPSTargetParams
}

export type SourceService = CentralSourceService | DPSSourceService
export type TargetService = CentralTargetService | DPSTargetService

export type CommandPayload = {
    idScope: string
    dpsName?: string
    dpsId?: string
    centralAppName?: string
    centralAppSubdomain?: string
    deviceTemplateId?: string
}

export type EnrollmentGroup = {
    primaryKey: string
    secondaryKey: string
    idScope: string
}

export type JobPayload = {
    displayName: string
    group: string
    description: string
    data: [
        {
            type: string
            target: string
            path: string
            value: CommandPayload
        }
    ]
}

export type JobResult = {
    id: string
    displayName: string
    group: string
    description?: string
    data: {
        type: string
        target: string
        path: string
        value: CommandPayload
    }[]
    progress: {
        total: number
        completed: number
        failed: number
        pending: number
    }
    status: string
    appName?: string
    jobLink?: string
}

export enum HubJobStatus {
    PENDING = 'pending',
    RUNNING = 'running',
    COMPLETED = 'completed',
    FAILED = 'failed',
}

export type HubJob = {
    id: string
    hubName: string
    hubHost: string
    appHost: string
    hubId: string
    dpsLink: string
    dpsId: string
    dpsHost: string
    dpsIdScope: string
    status: HubJobStatus
    templateId?:string,
    enrollment?: {
        primaryKey: string
        secondaryKey: string
    }
}

export const TOKEN_AUDIENCES = {
    Arm: 'https://management.azure.com/user_impersonation',
    Central: 'https://apps.azureiotcentral.com/user_impersonation',
    IoTHub: 'https://iothubs.azure.net/.default',
}

export const API_VERSIONS = {
    Central: '2022-07-31',
    Central_Preview: '1.2-preview',
    ResourceManager: '2021-04-01',
    DPS: '2022-02-05',
    DPSData: '2021-06-01',
    IoTHubArm: '2018-04-01',
    IoTHubData: '2020-05-31-preview',
}

export class ApiError extends Error {
    constructor(public title: string, message: string) {
        super(message)
    }
}
