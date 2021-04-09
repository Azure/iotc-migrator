import './newMigration.scss';
import React from 'react';
import { Link } from 'react-router-dom'
import axios from 'axios';

import { Controller, useForm } from 'react-hook-form';
import { uuid } from 'uuidv4';

import { TextField } from '@fluentui/react/lib/TextField';
import { ChoiceGroup, IChoiceGroupOption } from '@fluentui/react/lib/ChoiceGroup';
import { Dropdown } from '@fluentui/react/lib/Dropdown';
import { Checkbox } from '@fluentui/react/lib/Checkbox';
import { PrimaryButton, MessageBarButton } from '@fluentui/react';
import { CommandBar, ICommandBarItemProps } from '@fluentui/react/lib/CommandBar';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { ProgressIndicator } from '@fluentui/react/lib/ProgressIndicator';

import { getTextFieldStyles, dropdownStyles } from '../../styles/fluentStyles';
import usePromise from '../../hooks/usePromise';
import { AuthContext } from '../../context/authContext';
import { AppDataContext } from '../../context/appDataContext';

import { InlineMessage } from '../../controls/inlineMessage';

/* Core */

enum MigrationOptions {
  App = '1',
  Hub = '2'
}

/* API */

function postJob(authContext: any, payload: any) {
  return new Promise(async (resolve, reject) => {
    const token = await authContext.getAccessToken();
    axios.put(`https://${authContext.applicationHost}/api/preview/jobs/${uuid()}`,
      {
        'displayName': payload.migrationName,
        'description': 'AUTOMATED-DEVICE-MOVE',
        'group': payload.group,
        'data': [
          {
            'type': 'CommandJobData',
            'target': payload.template,
            'path': 'DeviceMove',
            'value': payload.target
          }
        ]
      },
      { headers: { 'Authorization': 'Bearer ' + token } })
      .then((res: any) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  })
}

function getDPS(authContext: any) {
  return new Promise(async (resolve, reject) => {
    const armToken = await authContext.getArmAccessToken();
    let apps: any = [];
    axios.get(`https://management.azure.com/subscriptions?api-version=2020-01-01`, { headers: { Authorization: 'Bearer ' + armToken } })
      .then((res: any) => {
        const subs = res.data.value;
        for (const i in subs) {
          const sub = subs[i];
          axios.get(`https://management.azure.com/subscriptions/${sub.subscriptionId}/providers/Microsoft.Devices/provisioningServices?api-version=2018-01-22`, { headers: { Authorization: 'Bearer ' + armToken } })
            .then((res2: any) => {
              for (const i in res2.data.value) {
                const app = res2.data.value[i];
                apps.push({
                  key: app.properties.idScope,
                  text: `${app.properties.serviceOperationsHostName}`,
                  app, sub
                })
              }
              resolve(apps);
            })
            .catch((err) => {
              reject(err);
            });
        }
      })
      .catch((err) => {
        reject(err);
      });
  });
}

function getSubscriptionsApps(authContext: any) {
  return new Promise(async (resolve, reject) => {
    const armToken = await authContext.getArmAccessToken();
    let apps: any = [];
    axios.get(`https://management.azure.com/subscriptions?api-version=2020-01-01`, { headers: { Authorization: 'Bearer ' + armToken } })
      .then((res: any) => {
        const subs = res.data.value;
        for (const i in subs) {
          const sub = subs[i];
          axios.get(`https://management.azure.com/subscriptions/${sub.subscriptionId}/providers/Microsoft.IoTCentral/IoTApps?api-version=2018-09-01`, { headers: { Authorization: 'Bearer ' + armToken } })
            .then((res2: any) => {
              for (const i in res2.data.value) {
                const app = res2.data.value[i];
                apps.push({
                  key: app.properties.applicationId,
                  text: `(${sub.displayName}) - ${app.properties.displayName}`,
                  app, sub
                })
              }
              resolve(apps);
            })
            .catch((err) => {
              reject(err);
            });
        }
      })
      .catch((err) => {
        reject(err);
      });
  });
}

/* UX */

const options: IChoiceGroupOption[] = [
  { key: MigrationOptions.Hub, text: 'Move to your own Azure IoT Hub' },
  { key: MigrationOptions.App, text: 'Move to another Azure IoT Central application' }
];

const DeviceCount = (count: number) => {
  return <div className='device-count'>
    <span>{count}</span>
    <span>groups</span>
  </div>
}

/* Render */

function NewMigration() {

  const formRef = React.useRef<any>(null);
  const authContext: any = React.useContext(AuthContext);
  const appDataContext: any = React.useContext(AppDataContext);

  const { control, register, handleSubmit, watch } = useForm();
  const optionWatch = watch('migrationOption', undefined);
  const targetWatch = watch('target', undefined);

  const [loadingTargets, targetsList, fetchTargetsError, fetchTargets] = usePromise();
  const [, templatesList, fetchTemplatesError, fetchTemplates] = usePromise();
  const [, groupsList, fetchGroupsError, fetchGroups] = usePromise();
  const [submittingJob, jobResult, submitError, createJob] = usePromise();

  const pageDisabled = !submittingJob && jobResult;

  // ux hack to enable migrate button on the command bar
  const cmdSubmit = () => { formRef.current.click(); }

  const onSubmit = (data: any) => {
    createJob({ promiseFn: () => postJob(authContext, data) });
  }

  // construction only
  const cmdBar: ICommandBarItemProps[] = React.useMemo(() => [{
    key: '1',
    text: 'Migrate',
    iconProps: {
      iconName: 'TurnRight'
    },
    onClick: cmdSubmit,
    disabled: !submittingJob && jobResult
  }], []);

  const cmdBarNew: ICommandBarItemProps[] = React.useMemo(() => [{
    key: '1',
    text: 'New migration',
    iconProps: {
      iconName: 'Add'
    },
    onClick: cmdSubmit,
    disabled: !submittingJob && jobResult
  }], []);

  // initial mount render only
  const appData = React.useMemo(() => {
    const groups: any = [];
    for (const key in appDataContext.groups) {
      groups.push({ key: key, text: appDataContext.groups[key] })
    }

    const templates: any = [];
    for (const key in appDataContext.templates) {
      templates.push({ key: key, text: appDataContext.templates[key] })
    }

    return { templates, groups }
  }, [])

  // when option changes, change the target id
  React.useEffect(() => {
    if (!authContext.authenticated && (authContext.authenticated && optionWatch === undefined)) { return; }
    if (optionWatch === MigrationOptions.App) { fetchTargets({ promiseFn: () => getSubscriptionsApps(authContext) }); }
    if (optionWatch === MigrationOptions.Hub) { fetchTargets({ promiseFn: () => getDPS(authContext) }); }
  }, [authContext, optionWatch])

  const error = submitError || fetchGroupsError || fetchTemplatesError || fetchTargetsError || null;

  return (
    <div className='workspace'>
      <div className='workspace-container'>
        <CommandBar items={pageDisabled ? cmdBarNew : cmdBar} />
      </div>

      {error ? <>
        <MessageBar
          messageBarType={MessageBarType.error}
          isMultiline={true}>
          <p>{JSON.stringify(error?.response?.data?.error?.message || error.message || 'Something went wrong. Please try again')}</p>
        </MessageBar>
      </>
        : null}

      {pageDisabled ? <>
        <MessageBar
          messageBarType={MessageBarType.success}
          isMultiline={false}>
          {'Migration job submitted with status ' + jobResult.status + '. Use the'}<Link to="/status">Migration status</Link>{' page to see progress of migration'}</MessageBar>
      </>
        : null}

      <div className='workspace-title'>
        <h1>New migration</h1>
        <p>Move devices from App 1 to another Azure IoT Central application or to your own Azure IoT Hub.</p>
      </div>
      <div className='workspace-content'>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className='workspace-narrow'>
            <div className='field-group'>
              <div className='text-field'>
                <TextField disabled={pageDisabled} autoComplete='off' styles={getTextFieldStyles} label='Name' {...register('migrationName')} required={true} />
              </div>
            </div>

            <div className='field-group'>
              <h2>Target devices</h2>
              <p>Choose the device group containing the devices to migrate.</p>
              <Controller
                control={control}
                name='group'
                render={({ field }) =>
                  <Dropdown
                    {...field}
                    disabled={pageDisabled}
                    onChange={(e: any, v: any) => { field.onChange(v.key) }} required={true}
                    placeholder='Select a device group'
                    label='Device group'
                    options={appData.groups || []}
                    styles={dropdownStyles}
                  />
                }
              />
              <br />
              <p>Choose the device template that contains the device move Direct Method convention.</p>
              <Controller
                control={control}
                name='template'
                render={({ field }) =>
                  <Dropdown
                    {...field}
                    disabled={pageDisabled}
                    onChange={(e: any, v: any) => { field.onChange(v.key) }} required={true}
                    placeholder='Select a device template'
                    label='Filter group by device template'
                    options={appData.templates || []}
                    styles={dropdownStyles}
                  />
                }
              />
            </div>

            <div className='field-group'>
              <h2>Migration options</h2>
              <Controller
                control={control}
                name='migrationOption'
                render={({ field }) =>
                  <ChoiceGroup
                    {...field}
                    disabled={pageDisabled}
                    onChange={(e: any, v: any) => { field.onChange(v.key) }}
                    options={options}
                    label='Pick one'
                    required={true}
                  />}
              />
              {optionWatch && loadingTargets ? <ProgressIndicator /> : null}
            </div>

            {optionWatch === undefined ? null : <>
              <div className={'field-group ' + (optionWatch && loadingTargets ? 'loading' : '')}>
                <h2>Migration target</h2>

                {optionWatch === MigrationOptions.App ? <>
                  <p>Choose the target application where the devices will be moved.</p>
                  <Controller
                    control={control}
                    name='target'
                    render={({ field }) =>
                      <Dropdown
                        {...field}
                        disabled={pageDisabled}
                        onChange={(e: any, v: any) => { field.onChange(v.key) }}
                        required={true}
                        placeholder='Select an application'
                        label='Target application'
                        options={targetsList || []}
                        styles={dropdownStyles} />
                    }
                  />
                </> : null}

                {optionWatch === MigrationOptions.Hub ? <>
                  <p>Choose the Device Provisioning Service (DPS) linked to an Azure IoT Hub where the devices will be moved.</p>
                  <Controller
                    control={control}
                    name='target'
                    render={({ field }) =>
                      <Dropdown
                        {...field}
                        disabled={pageDisabled}
                        onChange={(e: any, v: any) => { field.onChange(v.key) }}
                        required={true}
                        placeholder='Select a DPS'
                        label='Target DPS'
                        options={targetsList || []}
                        styles={dropdownStyles} />
                    }
                  />
                  <InlineMessage message="Please ensure that the device group enrollment or X.509 authentication details are copied from the Central application to this DPS instance" type="warning" />
                </> : null}
              </div>

              {optionWatch === MigrationOptions.App ?
                <div className={'field-group ' + (optionWatch && loadingTargets ? 'loading' : '')}>
                  <h2>Device template</h2>
                  <Controller
                    control={control}
                    name='template'
                    defaultValue={false}
                    render={({ field }) =>
                      <Checkbox disabled={pageDisabled} label='Copy the associated device template' {...field} />
                    }
                  />
                </div>
                : null}
            </>
            }

            <div className='field-group'>
              <PrimaryButton disabled={pageDisabled} type='submit' text='Migrate' />
              {/* this is hidden to allow the cmd bar to submit too */}
              <button hidden={true} ref={formRef} type='submit' />
            </div>

          </div>
        </form>
      </div>
    </div >
  );
}

export default NewMigration;
