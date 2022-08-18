import {
    ActionButton,
    Coachmark,
    ConstrainMode,
    DetailsList,
    DetailsListLayoutMode,
    IColumn,
    Icon,
    IconButton,
    IDetailsListStyles,
    Modal,
    PrimaryButton,
    ProgressIndicator,
    SelectionMode,
    ShimmeredDetailsList,
    Stack,
    TextField,
} from '@fluentui/react'
import { useBoolean } from '@fluentui/react-hooks'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
    createCentralEnrollment,
    getHubKeys,
    invokeCommand,
    listCentralApps,
    listDevicesInHub,
    listJobs,
} from '../api'
import {
    ApiError,
    HubJob,
    HubJobStatus,
    JobResult,
    STORAGE_ITEM,
} from '../types'
import { generateSaSToken } from '../utils'
import enrollmentScreen from '../enrollment.png'

const gridStyles: Partial<IDetailsListStyles> = {
    root: {
        overflowX: 'hidden',
        selectors: {
            '& [role=grid]': {
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'start',
                height: '40vh',
            },
        },
    },
    contentWrapper: {
        flex: '1 1 auto',
    },
}

const centralColumns: IColumn[] = [
    {
        key: 'appname',
        name: 'Application',
        fieldName: 'appName',
        minWidth: 200,
    },
    {
        key: 'jobName',
        name: 'Migration Job',
        fieldName: 'displayName',
        minWidth: 200,
    },
    {
        key: 'groupName',
        name: 'DeviceGroup',
        fieldName: 'group',
        minWidth: 200,
    },
    {
        key: 'dpsName',
        name: 'DPS',
        minWidth: 200,
    },
    {
        key: 'centralTarget',
        name: 'IoT Central target application',
        minWidth: 200,
    },
    {
        key: 'jobStatus',
        name: 'Migration Status',
        fieldName: 'status',
        minWidth: 200,
    },
]

const hubColumns: IColumn[] = [
    {
        key: 'iothubname',
        name: 'IoTHub',
        fieldName: 'hubName',
        minWidth: 200,
        maxWidth: 200,
    },
    {
        key: 'appname',
        name: 'Application',
        fieldName: 'appHost',
        minWidth: 200,
        maxWidth: 200,
    },
    {
        key: 'jobStatus',
        name: 'Migration Status',
        fieldName: 'status',
        maxWidth: 200,
        minWidth: 200,
    },

    {
        key: 'progress',
        name: '',
        minWidth: 200,
        maxWidth: 200,
    },
]

function _onRenderCentralItemColumn(
    item?: JobResult,
    index?: number,
    column?: IColumn
) {
    const fieldContent = item?.[column?.fieldName as keyof JobResult] as string
    switch (column?.key) {
        case 'jobName':
            return (
                <a href={item?.jobLink} target='_blank' rel='noreferrer'>
                    {fieldContent}
                </a>
            )
        case 'dpsName':
            if (item?.data[0].value.dpsName) {
                return (
                    <a
                        href={item?.data[0].value.dpsId}
                        target='_blank'
                        rel='noreferrer'
                    >
                        {item?.data[0].value.dpsName}
                    </a>
                )
            }
            return null
        case 'centralTarget':
            if (
                item?.data[0].value.centralAppName &&
                item?.data[0].value.centralAppSubdomain
            ) {
                return (
                    <a
                        href={item?.data[0].value.centralAppName}
                        target='_blank'
                        rel='noreferrer'
                    >
                        {`https://${item?.data[0].value.centralAppSubdomain}.azureiotcentral.com`}
                    </a>
                )
            }
            return null
        case 'jobStatus':
            const progress = item?.progress!
            if (progress.pending > 0) {
                return (
                    <div className='flex horizontal between' id={item?.id}>
                        <span className='spaced-right'>Pending</span>

                        <Icon
                            iconName='Running'
                            className='icon'
                            style={{ color: 'grey' }}
                        />
                    </div>
                )
            } else if (progress.failed > 0) {
                return (
                    <div className='flex horizontal between' id={item?.id}>
                        <span className='spaced-right'>Failed</span>

                        <Icon
                            iconName='Error'
                            className='icon'
                            style={{ color: 'red' }}
                        />
                    </div>
                )
            }
            return (
                <div className='flex horizontal between' id={item?.id}>
                    <span className='spaced-right'>Completed</span>

                    <Icon
                        iconName='Completed'
                        className='icon'
                        style={{ color: 'green' }}
                    />
                </div>
            )
        default:
            return <span>{fieldContent}</span>
    }
}

export default React.memo<{
    setErrorMessage: (err: ApiError) => void
    gotoItemId?: string
}>(({ setErrorMessage, gotoItemId }) => {
    const [centralItems, setCentralItems] = useState<JobResult[]>([])
    const [hubItems, setHubItems] = useState<HubJob[]>(
        JSON.parse(localStorage.getItem(STORAGE_ITEM)!) || []
    )
    const [modalOpen, { setFalse: closeModal, setTrue: openModal }] =
        useBoolean(false)

    const [modalData, setModalData] = useState<{
        content: JSX.Element
        onDismiss: () => Promise<void> | void
    } | null>(null)

    const [coachmarkShown, { setFalse: hideCoachmark }] = useBoolean(
        !!gotoItemId
    )

    const progressStyles = useMemo(
        () => ({
            root: {
                display: 'flex',
                alignItems: 'center',
                height: '100%',
            },
            itemProgress: {
                width: '10em',
            },
        }),
        []
    )

    const changeStatus = useCallback((itemIdx, status) => {
        setHubItems((cur) => [
            ...cur.slice(0, itemIdx),
            {
                ...cur[itemIdx!],
                status,
            },
            ...cur.slice(itemIdx! + 1),
        ])
    }, [])

    const setEnrollment = useCallback((itemIdx, enrollment) => {
        setHubItems((cur) => [
            ...cur.slice(0, itemIdx),
            {
                ...cur[itemIdx!],
                enrollment: {
                    ...cur[itemIdx!].enrollment,
                    ...enrollment,
                },
            },
            ...cur.slice(itemIdx! + 1),
        ])
    }, [])

    const generateContent = useCallback(
        (hubItem: HubJob, idx: number) => (
            <div className='flex vertical center-horizontal'>
                <div className='bottom-margin'>
                    <span className='bold'>
                        Follow below instructions to complete job setup.
                        <br />
                        Do not close the browser window until the job gets into
                        "Completed" state!
                    </span>
                </div>
                <div className='bottom-margin'>
                    <span>
                        1. Open the DPS instance page on the Azure Portal (
                        <a
                            href={hubItem.dpsLink}
                            target='_blank'
                            rel='noreferrer'
                        >
                            Click here
                        </a>
                        ) .<br />
                        2. Head to the "Manage Enrollments" section on the left
                        menu.
                        <br />
                        3. Open the enrollment group associated with the
                        selected IoT Hub (see picture below).
                        <br />
                        4. Copy both primary and secondary keys and paste them
                        below.
                        <br />
                    </span>
                </div>
                <div className='modal-image center-horizontal'>
                    <img
                        alt='screen'
                        src={enrollmentScreen}
                        className='width100'
                    />
                </div>
                <Stack tokens={{ childrenGap: 15 }} className='flex vertical'>
                    <TextField
                        label='Primary Key'
                        type='password'
                        canRevealPassword
                        value={hubItem.enrollment?.primaryKey}
                        onChange={(_, primaryKey) =>
                            setEnrollment(idx, { primaryKey })
                        }
                    />
                    <TextField
                        label='Secondary Key'
                        type='password'
                        canRevealPassword
                        value={hubItem.enrollment?.secondaryKey}
                        onChange={(_, secondaryKey) =>
                            setEnrollment(idx, { secondaryKey })
                        }
                    />
                    <div className='center-horizontal'>
                        <PrimaryButton
                            className='button'
                            text='Start migration'
                            onClick={() => {
                                closeModal()
                            }}
                        />
                    </div>
                </Stack>
            </div>
        ),
        [closeModal, setEnrollment]
    )

    useEffect(() => {
        localStorage.setItem(STORAGE_ITEM, JSON.stringify(hubItems))
    }, [hubItems])

    const loadDevices = useCallback(
        async (hubJob: HubJob, itemIdx: number) => {
            const hubKeys = await getHubKeys(hubJob.hubId, 'iothubowner')
            const hubSas = generateSaSToken(
                hubJob.hubHost,
                hubKeys.primaryKey,
                'iothubowner'
            )
            const devices = await listDevicesInHub(hubJob.hubHost, hubSas)

            const targetEnrollment = await createCentralEnrollment(
                hubJob.appHost,
                hubJob.enrollment!
            )
            try {
                await Promise.all(
                    devices.map(async (device) => {
                        await invokeCommand(
                            hubJob.hubHost,
                            hubSas,
                            device.deviceId,
                            targetEnrollment.idScope
                        )
                    })
                )
                changeStatus(itemIdx, HubJobStatus.COMPLETED)
            } catch (ex) {
                setErrorMessage(ex as ApiError)
                changeStatus(itemIdx, HubJobStatus.FAILED)
            }
        },
        [changeStatus, setErrorMessage]
    )

    const _onRenderHubItemColumn = useCallback(
        (item?: HubJob, idx?: number, column?: IColumn) => {
            const fieldContent = item?.[column?.fieldName as keyof HubJob]
            switch (column?.key) {
                case 'jobStatus':
                    switch (fieldContent as HubJobStatus) {
                        case HubJobStatus.RUNNING:
                            return (
                                <div className='flex horizontal' id={item?.id}>
                                    <Icon
                                        iconName='Processing'
                                        className='icon spaced-right'
                                    />
                                    <span>Running</span>
                                </div>
                            )
                        case HubJobStatus.COMPLETED:
                            return (
                                <div className='flex horizontal' id={item?.id}>
                                    <Icon
                                        iconName='Completed'
                                        className='icon spaced-right'
                                        style={{ color: 'green' }}
                                    />
                                    <span>Completed</span>
                                </div>
                            )
                        case HubJobStatus.FAILED:
                            return (
                                <div className='flex horizontal' id={item?.id}>
                                    <Icon
                                        iconName='Error'
                                        className='icon spaced-right'
                                        style={{ color: 'red' }}
                                    />
                                    <span>Failed</span>
                                </div>
                            )
                        default:
                            return (
                                <ActionButton
                                    id={item?.id}
                                    iconProps={{ iconName: 'Play' }}
                                    onClick={async () => {
                                        setModalData({
                                            content: generateContent(
                                                item!,
                                                idx!
                                            ),
                                            onDismiss: async () => {
                                                changeStatus(
                                                    idx,
                                                    HubJobStatus.RUNNING
                                                )
                                                await loadDevices(item!, idx!)
                                                setModalData(null)
                                            },
                                        })
                                        openModal()
                                    }}
                                >
                                    Run
                                </ActionButton>
                            )
                    }
                case 'progress':
                    return (
                        item?.status === HubJobStatus.RUNNING && (
                            <ProgressIndicator styles={progressStyles} />
                        )
                    )
                case 'dpsName':
                    return (
                        <a
                            href={item?.dpsLink}
                            target='_blank'
                            rel='noreferrer'
                        >
                            {item?.dpsHost}
                        </a>
                    )
                default:
                    return (
                        <div
                            className='center-vertical height100'
                            id={item?.id}
                        >
                            <span className='webkit-vertical-align'>
                                {fieldContent}
                            </span>
                        </div>
                    )
            }
        },
        [changeStatus, generateContent, loadDevices, openModal, progressStyles]
    )

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
        setCentralItems(jobs.flat())
    }, [])

    useEffect(() => {
        fetchJobs()
    }, [fetchJobs])

    return (
        <div className='page'>
            <h2>Migration status</h2>
            <div className='formHeader center-vertical'>
                <span>
                    Watch all the migrations from IoT Central applications.
                </span>
                <IconButton
                    iconProps={{ iconName: 'Sync' }}
                    onClick={async () => {
                        setCentralItems([])
                        await fetchJobs()
                    }}
                />
            </div>
            <div className='width90'>
                <div className='bottom-margin'>
                    <DetailsList
                        columns={centralColumns}
                        items={centralItems}
                        styles={gridStyles}
                        skipViewportMeasures
                        layoutMode={DetailsListLayoutMode.fixedColumns}
                        // enableShimmer={centralItems.length === 0}
                        constrainMode={ConstrainMode.unconstrained}
                        selectionMode={SelectionMode.none}
                        onRenderItemColumn={_onRenderCentralItemColumn}
                    />
                </div>
                <div className='formHeader center-vertical'>
                    <span>
                        Watch and manage migrations from DPS and IoTHub.
                    </span>
                </div>
                <div className='bottom-margin'>
                    <DetailsList
                        columns={hubColumns}
                        items={hubItems}
                        layoutMode={DetailsListLayoutMode.fixedColumns}
                        skipViewportMeasures
                        selectionMode={SelectionMode.none}
                        constrainMode={ConstrainMode.unconstrained}
                        onRenderItemColumn={_onRenderHubItemColumn}
                        styles={gridStyles}
                    />
                </div>
            </div>
            {coachmarkShown && (
                <Coachmark
                    target={`#${gotoItemId}`}
                    onAnimationOpenEnd={hideCoachmark}
                />
            )}
            <Modal
                isOpen={modalOpen}
                onDismissed={async () => await modalData?.onDismiss()}
            >
                <div className='flex vertical spaced-left spaced-right padding1'>
                    {modalData?.content}
                </div>
            </Modal>
        </div>
    )
})
