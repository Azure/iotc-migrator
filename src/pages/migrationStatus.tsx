import {
    DetailsList,
    IColumn,
    IconButton,
    SelectionMode,
    ShimmeredDetailsList,
} from '@fluentui/react'
import React, { useCallback, useEffect, useState } from 'react'
import { listCentralApps, listJobs } from '../api'
import { ApiError, JobResult } from '../types'

const columns: IColumn[] = [
    {
        key: 'appname',
        name: 'Application',
        fieldName: 'appName',
        minWidth: 16,
        maxWidth: 200,
    },
    {
        key: 'jobName',
        name: 'Migration Job',
        fieldName: 'displayName',
        maxWidth: 200,
        minWidth: 16,
    },
    {
        key: 'groupName',
        name: 'DeviceGroup',
        fieldName: 'group',
        maxWidth: 200,
        minWidth: 16,
    },
    {
        key: 'dpsName',
        name: 'DPS',
        maxWidth: 200,
        minWidth: 16,
    },
    {
        key: 'jobStatus',
        name: 'Migration Status',
        fieldName: 'status',
        maxWidth: 200,
        minWidth: 16,
    },
]

function _onRenderItemColumn(
    item?: JobResult,
    index?: number,
    column?: IColumn
) {
    const fieldContent = item?.[column?.fieldName as keyof JobResult] as string
    switch (column?.key) {
        case 'jobName':
            return (
                <a href={item?.jobLink} target='_blank'>
                    {fieldContent}
                </a>
            )
        case 'dpsName':
            return (
                <a href={item?.data[0].value.dpsId} target='_blank'>
                    {item?.data[0].value.dpsName}
                </a>
            )
        default:
            return <span>{fieldContent}</span>
    }
}

export default React.memo<{ setErrorMessage: (err: ApiError) => void }>(() => {
    const [items, setItems] = useState<JobResult[]>([])

    const fetchJobs = useCallback(async () => {
        const apps = await listCentralApps()
        const jobs = await Promise.all(
            apps.map(async (a) => {
                const appJobs: JobResult[] = (
                    await listJobs(a.properties.subdomain)
                )
                    .filter((job: JobResult) => job.id)
                    .map((job: JobResult) => ({
                        ...job,
                        appName: a.name,
                        jobLink: `https://${a.properties.subdomain}.azureiotcentral.com/jobs/instances/${job.id}`,
                    }))
                return appJobs
            })
        )
        setItems(jobs.flat())
    }, [])

    useEffect(() => {
        fetchJobs()
    }, [])

    return (
        <div className='page'>
            <h2>Migration status</h2>
            <div className='formHeader center-vertical'>
                <span>Watch all the IoT Central to IoT Hub migration processes.</span>
                <IconButton
                    iconProps={{ iconName: 'Sync' }}
                    onClick={async () => {
                        setItems([])
                        await fetchJobs()
                    }}
                />
            </div>
            <ShimmeredDetailsList
                columns={columns}
                items={items}
                enableShimmer={items.length === 0}
                selectionMode={SelectionMode.none}
                onRenderItemColumn={_onRenderItemColumn}
            />
        </div>
    )
})
