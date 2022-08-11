export const JOB_DESCRIPTION = 'AUTOMATED-DEVICE-MOVE'

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
    deviceTemplateId: string
}

export type DPSSourceParams = {
    iothubs: {
        name: string
        host: string
        id: string
        sasToken: string
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
    dpsName: string
    dpsId: string
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
    status: string
    appName?: string
    jobLink?: string
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
    IoTHubArm: '2018-04-01',
    IoTHubData: '2020-05-31-preview',
}

export class ApiError extends Error {
    constructor(public title: string, message: string) {
        super(message)
    }
}
