import {
    Checkbox,
    ChoiceGroup,
    Dropdown,
    IButtonStyles,
    Icon,
    IconButton,
    IDropdownOption,
    Label,
    Link,
    Modal,
    PrimaryButton,
    Spinner,
    SpinnerSize,
    Stack,
    TextField,
} from '@fluentui/react'
import { useId, useBoolean } from '@fluentui/react-hooks'
import React, { useState } from 'react'
import {
    listCentralApps,
    listDPSs,
    listDeviceGroups,
    listDeviceTemplates,
    createMigrationJob,
    listHubs,
    getDPSKeys,
} from '../api'
import {
    FormValues,
    MigrationMode,
    ServiceType,
    ApiError,
    JOB_DESCRIPTION,
    CentralSourceService,
    DPSSourceService,
    DPSSourceParams,
    DPSTargetService,
    RecursivePartial,
    CentralTargetService,
    STORAGE_ITEM,
    HubJob,
    HubJobStatus,
} from '../types'
import { filterHubs, findComponent, generateSaSToken } from '../utils'

const iconButtonStyles: Partial<IButtonStyles> = {
    root: {
        color: 'black',
        marginLeft: 'auto',
        marginTop: '4px',
        marginRight: '2px',
    },
    rootHovered: {
        color: 'black',
    },
}

const modeOptions = [
    { key: MigrationMode.ToHub, text: 'IoT Central -> IoT Hub' },
    { key: MigrationMode.Central, text: 'IoT Central -> IoT Central' },
    { key: MigrationMode.FromHub, text: 'IoT Hub -> IoT Central' },
]

function _onDataLoading(text: string, loadingInstances: boolean) {
    return (
        <Stack
            horizontal
            verticalAlign='center'
            horizontalAlign='space-between'
        >
            <span>{text}</span>
            <Spinner
                size={SpinnerSize.small}
                style={{ visibility: loadingInstances ? 'visible' : 'hidden' }}
            />
        </Stack>
    )
}

const _onDropDownOpen = async (
    fn: () => Promise<any[]>,
    setData: (data: any) => void,
    start: () => void,
    stop: () => void
) => {
    start()
    const data = await fn()

    stop()
    setData(
        data?.flat().map((r, idx) => ({
            key: r.id || `opt-${idx}`,
            text: r.name || r.displayName,
            data: r,
        }))
    )
}

export default React.memo<{
    setErrorMessage: (err: ApiError) => void
    goToStatus: (jobId: string) => void
}>(({ setErrorMessage, goToStatus }) => {
    const nameId = useId()
    const modeId = useId()
    const centralAppsId = useId()
    const centralAppsId2 = useId()
    const dpsId = useId()
    const deviceGroupsId = useId()
    const deviceTemplateId = useId()

    const [values, setValues] = useState<FormValues>({
        name: '',
        mode: MigrationMode.ToHub,
        source: {
            type: ServiceType.Central,
            id: '',
        } as CentralSourceService,
        target: { type: ServiceType.DPS, id: '' } as DPSTargetService,
    })
    const [submitting, { setTrue: startSubmit, setFalse: stopSubmit }] =
        useBoolean(false)

    const [modalOpen, { setFalse: closeModal, setTrue: openModal }] =
        useBoolean(false)

    const [modalData, setModalData] = useState<JSX.Element | null>(null)

    //#region DROPDOWN ITEMS LOADING STATE
    const [
        loadingApps,
        { setTrue: startLoadingApps, setFalse: stopLoadingApps },
    ] = useBoolean(false)
    const [
        loadingDPSs,
        { setTrue: startLoadingDPSs, setFalse: stopLoadingDPSs },
    ] = useBoolean(false)
    const [
        loadingGroups,
        { setTrue: startLoadingGroups, setFalse: stopLoadingGroups },
    ] = useBoolean(false)
    const [
        loadingTemplates,
        { setTrue: startLoadingTemplates, setFalse: stopLoadingTemplates },
    ] = useBoolean(false)

    const [
        loadingHubs,
        { setTrue: startLoadingHubs, setFalse: stopLoadingHubs },
    ] = useBoolean(false)
    //#endregion

    //#region DROPDOWN ITEMS STATE
    const [centralApps, setCentralApps] = React.useState<IDropdownOption[]>([])
    const [DPSs, setDPSs] = React.useState<IDropdownOption[]>([])
    const [deviceGroups, setDeviceGroups] = React.useState<IDropdownOption[]>(
        []
    )
    const [deviceTemplates, setDeviceTemplates] = React.useState<
        IDropdownOption[]
    >([])
    //#endregion

    //#region DATA LOADING CALLBACK
    const onCentralAppLoading = React.useCallback(() => {
        return _onDataLoading(
            'Select an IoT Central application...',
            loadingApps
        )
    }, [loadingApps])

    const onDPSLoading = React.useCallback(() => {
        return _onDataLoading('Select an IoT DPS instance...', loadingDPSs)
    }, [loadingDPSs])

    const onDeviceGroupLoading = React.useCallback(() => {
        return _onDataLoading('Select a device group...', loadingGroups)
    }, [loadingGroups])

    const onTemplatesLoading = React.useCallback(() => {
        return _onDataLoading('Select a device template...', loadingTemplates)
    }, [loadingTemplates])
    //#endregion

    //#region DROPDOWNS IN OPENING STATE
    const onCentralDropDownOpen = React.useCallback(async () => {
        if (centralApps.length === 0) {
            await _onDropDownOpen(
                listCentralApps,
                setCentralApps,
                startLoadingApps,
                stopLoadingApps
            )
        }
    }, [centralApps, startLoadingApps, stopLoadingApps])

    const onDpsDropDownOpen = React.useCallback(async () => {
        if (DPSs.length === 0) {
            await _onDropDownOpen(
                listDPSs,
                setDPSs,
                startLoadingDPSs,
                stopLoadingDPSs
            )
        }
    }, [DPSs, startLoadingDPSs, stopLoadingDPSs])

    const onDeviceGroupDropDownOpen = React.useCallback(async () => {
        await _onDropDownOpen(
            () => {
                return listDeviceGroups(values.source.id)
            },
            setDeviceGroups,
            startLoadingGroups,
            stopLoadingGroups
        )
    }, [startLoadingGroups, stopLoadingGroups, values.source])

    const onDeviceTemplateDropDownOpen = React.useCallback(async () => {
        await _onDropDownOpen(
            () => {
                const appId =
                    values.mode === MigrationMode.ToHub
                        ? values.source.id
                        : values.target.id
                return listDeviceTemplates(appId)
            },
            setDeviceTemplates,
            startLoadingTemplates,
            stopLoadingTemplates
        )
    }, [startLoadingTemplates, stopLoadingTemplates, values])

    //#endregion

    //#region SET VALUES
    const setCentralSourceService = React.useCallback(
        (source: RecursivePartial<CentralSourceService>) => {
            setValues((cur) => ({
                ...cur,
                source: {
                    ...cur.source,
                    ...source,
                    type: ServiceType.Central,
                    params: {
                        ...cur.source.params,
                        ...source.params,
                    },
                } as CentralSourceService,
            }))
        },
        [setValues]
    )

    const setCentralTargetService = React.useCallback(
        (target: RecursivePartial<CentralTargetService>) => {
            setValues((cur) => ({
                ...cur,
                target: {
                    ...cur.target,
                    ...target,
                    type: ServiceType.Central,
                    params: {
                        ...cur.target.params,
                        ...target.params,
                    },
                } as CentralTargetService,
            }))
        },
        [setValues]
    )

    const setDPSTargetService = React.useCallback(
        (target: RecursivePartial<DPSTargetService>) => {
            setValues((cur) => ({
                ...cur,
                target: {
                    ...cur.target,
                    ...target,
                    type: ServiceType.DPS,
                    params: {
                        ...cur.target.params,
                        ...target.params,
                    },
                } as DPSTargetService,
            }))
        },
        [setValues]
    )

    const setDPSSourceService = React.useCallback(
        (source: RecursivePartial<DPSSourceService>) => {
            setValues((cur) => ({
                ...cur,
                source: {
                    ...cur.source,
                    ...source,
                    type: ServiceType.DPS,
                    params: {
                        ...cur.source.params,
                        ...source.params,
                    },
                } as DPSSourceService,
            }))
        },
        [setValues]
    )

    const selectSourceHub = React.useCallback(
        (hubIndex: number, selected: boolean) => {
            setValues((cur) => {
                const iothubs = (cur.source.params as DPSSourceParams).iothubs
                return {
                    ...cur,
                    type: ServiceType.Central,
                    source: {
                        ...cur.source,
                        params: {
                            ...cur.source.params,
                            iothubs: [
                                ...iothubs.slice(0, hubIndex),
                                { ...iothubs[hubIndex], selected },
                                ...iothubs.slice(hubIndex + 1),
                            ],
                        },
                    } as DPSSourceService,
                }
            })
        },
        [setValues]
    )
    //#endregion
    //#region GENERAL CALLBACKS
    const onDeviceTemplateSelected = React.useCallback(
        async (template) => {
            const { capabilityModel } = template
            const migrationComponent = findComponent(
                capabilityModel,
                'dtmi:azureiot:DeviceMigration;1'
            )
            if (!migrationComponent) {
                setErrorMessage(
                    new ApiError(
                        'Invalid device template',
                        'The selected device template does not contain the Device Migration component.\nPlease include the component as descrived in the documentation.'
                    )
                )
            } else {
                setCentralSourceService({
                    params: {
                        deviceTemplateId: template['@id'],
                        componentName: migrationComponent.name,
                    },
                })
            }
        },
        [setErrorMessage, setCentralSourceService]
    )

    const onSourceDPSSelected = React.useCallback(
        async (dpsData) => {
            startLoadingHubs()
            const availableHubs = await listHubs()
            const associatedHubNames = dpsData.data.properties.iotHubs.map(
                (h: any) => h.name
            )
            const associatedHubs = filterHubs(availableHubs, associatedHubNames)
            setDPSSourceService({
                id: dpsData?.key as string,
                params: {
                    dpsHost: dpsData.data.properties.serviceOperationsHostName,
                    dpsLink: dpsData.data.dpsLink,
                    idScope: dpsData.data.properties.idScope,
                    iothubs: await Promise.all(
                        associatedHubs.map(async (h: any) => ({
                            name: h.name,
                            host: h.properties.hostName,
                            id: h.id,
                            selected: false,
                        }))
                    ),
                },
            })
            stopLoadingHubs()
        },
        [startLoadingHubs, stopLoadingHubs, setDPSSourceService]
    )

    const onSubmit = React.useCallback(async () => {
        if (
            values.source.type === ServiceType.Central &&
            values.target.type === ServiceType.DPS
        ) {
            // create migration job
            try {
                await createMigrationJob(values.source.id, {
                    displayName: values.name,
                    group: values.source.params.groupId,
                    description: JOB_DESCRIPTION,
                    data: [
                        {
                            type: 'command',
                            target: values.source.params.deviceTemplateId,
                            path: `${values.source.params.componentName}.DeviceMove`,
                            value: values.target.params,
                        },
                    ],
                })
            } catch (err) {
                setErrorMessage(err as ApiError)
            }
        } else if (
            values.source.type === ServiceType.DPS &&
            values.target.type === ServiceType.Central
        ) {
            // set data in local storage and show message to the user
            const currentStorage: HubJob[] =
                JSON.parse(localStorage.getItem(STORAGE_ITEM)!) || []
            const params = values.source.params as DPSSourceParams
            const id = `dps-to-central-${currentStorage.length}`
            params.iothubs
                .filter((h) => h.selected)
                .map((h) =>
                    currentStorage.push({
                        id,
                        hubName: h.name,
                        hubHost: h.host,
                        hubId: h.id,
                        dpsLink: params.dpsLink,
                        dpsId: values.source.id,
                        dpsIdScope: params.idScope,
                        dpsHost: params.dpsHost,
                        appHost: values.target.id,
                        status: HubJobStatus.PENDING,
                    })
                )
            localStorage.setItem(STORAGE_ITEM, JSON.stringify(currentStorage))
            setModalData(
                <div className='flex vertical center-horizontal'>
                    <div className='center-vertical bold'>
                        Ready
                        <IconButton
                            iconProps={{ iconName: 'Cancel' }}
                            styles={iconButtonStyles}
                            ariaLabel='Close popup modal'
                            onClick={closeModal}
                        />
                    </div>
                    <div className='bottom-margin'>
                        <span>
                            The migration job has been configured.<br/> Go to the
                            "Migration status" tab or {' '}
                            <Link
                                onClick={() => {
                                    closeModal()
                                    goToStatus(id)
                                }}
                            >
                                 click here
                            </Link>
                            {' '} to run the job.
                        </span>
                    </div>
                </div>
            )
            openModal()
        }
        stopSubmit()
    }, [values, setErrorMessage, stopSubmit])

    //#endregion
    return (
        <div className='page'>
            <h2>New Migration</h2>
            <div className='formHeader'>
                <span>
                    Move devices from an Azure IoT Central application to
                    another one or to an Azure IoT Hub and back.
                </span>
            </div>
            <div className='formInput'>
                <Label htmlFor={nameId} required>
                    Name
                </Label>
                <TextField
                    id={nameId}
                    name='name'
                    onChange={(_, name) =>
                        setValues((cur) => ({
                            ...cur,
                            name: name!,
                        }))
                    }
                    disabled={submitting}
                />
            </div>
            <div className='formInput'>
                <Label htmlFor={modeId}>Migration mode</Label>
                <ChoiceGroup
                    id={modeId}
                    options={modeOptions}
                    selectedKey={values.mode}
                    onChange={(_, mode) =>
                        setValues((cur) => ({
                            ...cur,
                            mode: MigrationMode[
                                mode?.key as keyof typeof MigrationMode
                            ],
                        }))
                    }
                    disabled={submitting}
                />
            </div>
            <div className='center-vertical'>
                <div className='spaced-right flex horizontal'>
                    {/** ----------------- SOURCE -------------------- */}
                    <div id='source' className='section'>
                        <Label htmlFor='source'>Source</Label>
                        {values.mode === MigrationMode.FromHub ? (
                            <>
                                <div className='formInput'>
                                    <Label htmlFor={dpsId} required>
                                        IoT DPS instance
                                    </Label>
                                    <Dropdown
                                        id={dpsId}
                                        options={DPSs}
                                        onRenderPlaceholder={onDPSLoading}
                                        disabled={submitting}
                                        onClick={onDpsDropDownOpen}
                                        onChange={async (_, val) => {
                                            await onSourceDPSSelected(val)
                                        }}
                                    />
                                </div>
                                {values.source.id &&
                                    (values.source as DPSSourceService).params
                                        .iothubs && (
                                        <Stack className='formInput'>
                                            <Label>Associated Hubs</Label>
                                            {(
                                                values.source as DPSSourceService
                                            ).params.iothubs.map(
                                                (iothub, idx) => (
                                                    <Checkbox
                                                        key={`hub-${idx}`}
                                                        label={iothub.name}
                                                        checked={
                                                            iothub.selected
                                                        }
                                                        onChange={(_, val) =>
                                                            selectSourceHub(
                                                                idx,
                                                                val!
                                                            )
                                                        }
                                                    />
                                                )
                                            )}
                                        </Stack>
                                    )}
                                {loadingHubs && (
                                    <Spinner
                                        size={SpinnerSize.medium}
                                        className='spaced-left'
                                    />
                                )}
                            </>
                        ) : (
                            <>
                                <div className='formInput'>
                                    <Label htmlFor={centralAppsId} required>
                                        IoT Central Application
                                    </Label>
                                    <Dropdown
                                        id={centralAppsId}
                                        options={centralApps}
                                        disabled={submitting}
                                        onRenderPlaceholder={
                                            onCentralAppLoading
                                        }
                                        onClick={onCentralDropDownOpen}
                                        onChange={(_, val) => {
                                            setCentralTargetService({
                                                id: val?.data.properties
                                                    .subdomain,
                                            })
                                            setDeviceGroups([])
                                            setDeviceTemplates([])
                                        }}
                                    />
                                </div>
                                <div className='formInput'>
                                    <Label htmlFor={deviceGroupsId} required>
                                        Device group
                                    </Label>
                                    <Dropdown
                                        id={deviceGroupsId}
                                        options={deviceGroups}
                                        onRenderPlaceholder={
                                            onDeviceGroupLoading
                                        }
                                        onClick={async () => {
                                            if (
                                                values.source.id &&
                                                !submitting
                                            ) {
                                                await onDeviceGroupDropDownOpen()
                                            }
                                        }}
                                        disabled={
                                            !values.source.id || submitting
                                        }
                                        onChange={(_, val) => {
                                            setCentralSourceService({
                                                params: {
                                                    groupId: val?.data.id,
                                                },
                                            })
                                            setDeviceTemplates([])
                                        }}
                                    />
                                </div>
                                <div className='formInput'>
                                    <Label htmlFor={deviceTemplateId} required>
                                        Filter by template
                                    </Label>
                                    <Dropdown
                                        id={deviceTemplateId}
                                        options={deviceTemplates}
                                        onRenderPlaceholder={onTemplatesLoading}
                                        onClick={async () => {
                                            if (
                                                values.source.id &&
                                                !submitting
                                            ) {
                                                await onDeviceTemplateDropDownOpen()
                                            }
                                        }}
                                        disabled={
                                            !values.source.id || submitting
                                        }
                                        onChange={(_, val) =>
                                            onDeviceTemplateSelected(val?.data)
                                        }
                                    />
                                </div>
                            </>
                        )}
                    </div>
                    <div className='center-vertical spaced-right spaced-left'>
                        <Icon
                            iconName='DoubleChevronRight'
                            className={`migration-arrow${
                                submitting ? '-disabled' : ''
                            }`}
                        />
                    </div>
                    {/** ----------------- TARGET -------------------- */}
                    <div id='target' className='section'>
                        <Label htmlFor='target'>Target</Label>
                        {values.mode === MigrationMode.ToHub ? (
                            <div className='formInput'>
                                <Label htmlFor={dpsId} required>
                                    IoT DPS instance
                                </Label>
                                <Dropdown
                                    id={dpsId}
                                    options={DPSs}
                                    onRenderPlaceholder={onDPSLoading}
                                    onClick={onDpsDropDownOpen}
                                    onChange={(_, val) => {
                                        setValues((cur) => ({
                                            ...cur,
                                            target: {
                                                type: ServiceType.DPS,
                                                id: val?.key as string,
                                                params: {
                                                    ...cur.target.params,
                                                    idScope:
                                                        val?.data.properties
                                                            .idScope,
                                                    dpsName: val?.data.name,
                                                    dpsId: val?.data.dpsLink,
                                                },
                                            },
                                        }))
                                    }}
                                    disabled={submitting}
                                />
                            </div>
                        ) : (
                            <>
                                <div className='formInput'>
                                    <Label htmlFor={centralAppsId2} required>
                                        IoT Central Application
                                    </Label>
                                    <Dropdown
                                        id={centralAppsId2}
                                        options={centralApps}
                                        onRenderPlaceholder={
                                            onCentralAppLoading
                                        }
                                        onClick={onCentralDropDownOpen}
                                        onChange={(_, val) => {
                                            setCentralTargetService({
                                                id: val?.data.properties
                                                    .subdomain,
                                            })
                                        }}
                                        disabled={submitting}
                                    />
                                </div>
                                <div className='formInput'>
                                    <Label htmlFor={deviceTemplateId}>
                                        Assign to template (optional)
                                    </Label>
                                    <Dropdown
                                        id={deviceTemplateId}
                                        options={deviceTemplates}
                                        onRenderPlaceholder={onTemplatesLoading}
                                        onClick={async () => {
                                            if (
                                                values.target.id &&
                                                !submitting
                                            ) {
                                                await onDeviceTemplateDropDownOpen()
                                            }
                                        }}
                                        disabled={
                                            !values.target.id || submitting
                                        }
                                        onChange={(_, val) => {
                                            setCentralTargetService({
                                                params: {
                                                    deviceTemplateId:
                                                        val?.data['@id'],
                                                },
                                            })
                                        }}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
            <div className='center-vertical bottom-margin'>
                <PrimaryButton
                    text='Migrate'
                    disabled={
                        submitting ||
                        !values.name ||
                        !values.source.id ||
                        !values.target.id
                    }
                    onClick={() => {
                        startSubmit()
                        onSubmit()
                    }}
                    className='spaced-right'
                />
                <PrimaryButton
                    text='Test'
                    onClick={async () => {
                        const keys = await getDPSKeys(
                            '/subscriptions/2efa8bb6-25bf-4895-ba64-33806dd00780/resourceGroups/paas/providers/Microsoft.Devices/provisioningServices/migratordps',
                            'provisioningserviceowner'
                        )
                        const sasToken = generateSaSToken(
                            'migratordps.azure-devices-provisioning.net',
                            keys.primaryKey,
                            'provisioningserviceowner'
                        )
                        console.log(sasToken)
                    }}
                    className='spaced-right'
                />
                {submitting && (
                    <Spinner
                        size={SpinnerSize.medium}
                        className='spaced-left'
                    />
                )}
            </div>
            <Modal isOpen={modalOpen}>
                <div className='flex vertical spaced-left spaced-right padding1'>
                    {modalData}
                </div>
            </Modal>
        </div>
    )
})
