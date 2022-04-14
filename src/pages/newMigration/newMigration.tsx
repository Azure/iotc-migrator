import classnames from 'classnames/bind';
import React from 'react';
import { Link } from 'react-router-dom'
import { Controller, useForm } from 'react-hook-form';
import { TextField } from '@fluentui/react/lib/TextField';
import { ChoiceGroup, IChoiceGroupOption } from '@fluentui/react/lib/ChoiceGroup';
import { Dropdown } from '@fluentui/react/lib/Dropdown';
import { Checkbox } from '@fluentui/react/lib/Checkbox';
import { PrimaryButton } from '@fluentui/react';
import { CommandBar, ICommandBarItemProps } from '@fluentui/react/lib/CommandBar';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { ProgressIndicator } from '@fluentui/react/lib/ProgressIndicator';
import { getTextFieldStyles, dropdownStyles } from '../../styles/fluentStyles';
import usePromise from '../../hooks/usePromise';
import { AuthContext } from '../../context/authContext';
import { AppDataContext } from '../../context/appDataContext';

import { InlineMessage } from '../../controls/inlineMessage';
import { getDPS, getSubscriptionsApps, JobPayload, postJob } from '../../iotcAPI';
import { Config } from '../../config';
import { useAsyncCallback } from '../../hooks/useAsync';
const cx = classnames.bind(require('./newMigration.scss'));

const enum MigrationOptions {
  App = 'App',
  Hub = 'Hub'
}

const options: IChoiceGroupOption[] = [
  { key: MigrationOptions.Hub, text: 'Move to your own Azure IoT Hub' },
  { key: MigrationOptions.App, text: 'Move to another Azure IoT Central application' }
];

export default React.memo(function NewMigration() {

  const formRef = React.useRef<any>(null);
  const authContext = React.useContext(AuthContext);
  const appDataContext = React.useContext(AppDataContext);

  const { control, register, handleSubmit, watch, getValues } = useForm<JobPayload>();
  const optionWatch = watch('migrationOption', undefined);

  const [loadingTargets, targetsList, fetchTargetsError, fetchTargets] = usePromise();
  const [submittingJob, jobResult, submitError, createJob] = usePromise();

  const pageDisabled = !submittingJob && jobResult;

  const cmdSubmit = () => { formRef.current.click(); }

  const onSubmit = (data: any) => {
    createJob({ promiseFn: () => postJob(authContext, data) });
  }
  // const [onCreateJob, submitJobLoading, submitJobError] = useCreateJob(getValues(), authContext);


  const cmdBar: ICommandBarItemProps[] = React.useMemo(() => [{
    key: '1',
    text: 'Migrate',
    iconProps: {
      iconName: 'TurnRight'
    },
    onClick: cmdSubmit,
    disabled: !submittingJob && jobResult
  }], [jobResult, submittingJob]);

  const cmdBarNew: ICommandBarItemProps[] = React.useMemo(() => [{
    key: '1',
    text: 'New migration',
    iconProps: {
      iconName: 'Add'
    },
    onClick: cmdSubmit,
    disabled: !submittingJob && jobResult
  }], [jobResult, submittingJob]);

  React.useEffect(() => {
    if (optionWatch === MigrationOptions.App) {
      fetchTargets({ promiseFn: () => getSubscriptionsApps(authContext) });
    }
    if (optionWatch === MigrationOptions.Hub) {
      fetchTargets({ promiseFn: () => getDPS(authContext) });
    }
    // eslint-disable-next-line
  }, [authContext, optionWatch]);

  const error = submitError || fetchTargetsError || null;

  return (
    <div className={cx('workspace')}>
      <CommandBar className={cx('action-bar')} items={pageDisabled ? cmdBarNew : cmdBar} />
      {error && <MessageBar
        messageBarType={MessageBarType.error}
        isMultiline={true}>
        <p>{JSON.stringify(error?.response?.data?.error?.message || error.message || 'Something went wrong. Please try again')}</p>
      </MessageBar>}
      {pageDisabled && <MessageBar
        messageBarType={MessageBarType.success}
        isMultiline={false}>
        {`Migration job submitted with status ${jobResult.status}`}
        <Link to="/status">Migration status</Link>
        {' page to see progress of migration'}
      </MessageBar>}
      <div className={cx('workspace-container')}>
        <div className={cx('workspace-title')}>
          <h1 className={cx('title')}>New migration</h1>
          <p>{`Move devices from ${Config.applicationHost} to another Azure IoT Central application or to your own Azure IoT Hub.`}</p>
        </div>
        <div className={cx('workspace-content')}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className={cx('workspace-narrow')}>

              <div className={cx('field-group')}>
                <div className={cx('text-field')}>
                  <TextField
                    required={true}
                    disabled={pageDisabled}
                    autoComplete='off'
                    styles={getTextFieldStyles}
                    label='Name'
                    {...register('migrationName')}
                  />
                </div>
              </div>

              <div className={cx('field-group')}>
                <h3>Target devices</h3>
                <p>Choose the device group containing the devices to migrate.</p>
                <Controller
                  control={control}
                  name='group'
                  render={({ field }) =>
                    <Dropdown
                      {...field}
                      disabled={pageDisabled}
                      onChange={(_e, v: any) => { field.onChange(v.key) }}
                      required={true}
                      placeholder='Select a device group'
                      label='Device group'
                      options={appDataContext.groups || []}
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
                      onChange={(_e, v: any) => { field.onChange(v.key) }}
                      required={true}
                      placeholder='Select a device template'
                      label='Filter group by device template'
                      options={appDataContext.templates || []}
                      styles={dropdownStyles}
                    />
                  }
                />
              </div>

              <div className={cx('field-group')}>
                <h3>Migration options</h3>
                <Controller
                  control={control}
                  name='migrationOption'
                  render={({ field }) =>
                    <ChoiceGroup
                      {...field}
                      disabled={pageDisabled}
                      onChange={(_e, v: any) => { field.onChange(v.key) }}
                      options={options}
                      label='Select a migration option'
                      required={true}
                    />}
                />
                <div className={cx('progress-indicator')}>{optionWatch && loadingTargets && <ProgressIndicator />}</div>
              </div>

              {!!optionWatch && <>
                <div className={cx('field-group', { 'loading': optionWatch && loadingTargets })}>
                  <h3>Migration target</h3>
                  {optionWatch === MigrationOptions.Hub && <>
                    <p className={cx("no-margin-bottom")}>Choose the Device Provisioning Service (DPS) linked to an Azure IoT Hub where the devices will be moved.</p>
                    <p>You can set the same group SAS tokens in both IoT Hub and IoT Central so that your devices can connect to either solutions.</p>
                    <Controller
                      control={control}
                      name='target'
                      render={({ field }) =>
                        <Dropdown
                          {...field}
                          disabled={pageDisabled}
                          onChange={(_e, v: any) => { field.onChange(v.key) }}
                          required={true}
                          placeholder='Select a DPS'
                          label='Target DPS'
                          options={targetsList || []}
                          styles={dropdownStyles} />
                      }
                    />
                    <InlineMessage message="Please ensure that the device group enrollment or X.509 authentication details are copied from the Central application to this DPS instance" type="warning" />
                  </>}
                </div>
                {optionWatch === MigrationOptions.App &&
                  <div className={cx('field-group', 'no-margin-top', { 'loading': optionWatch && loadingTargets })}>
                    <p className={cx("no-margin-bottom")}>Choose the target application where the devices will be moved.</p>
                    <p>You can set the same group SAS tokens in both IoT Hub and IoT Central so that your devices can connect to either solutions.</p>
                    <Controller
                      control={control}
                      name='target'
                      render={({ field }) =>
                        <Dropdown
                          {...field}
                          disabled={pageDisabled}
                          onChange={(_e, v: any) => { field.onChange(v.key) }}
                          required={true}
                          placeholder='Select an application'
                          label='Target application'
                          options={targetsList || []}
                          styles={dropdownStyles} />
                      }
                    />
                    <h3>Device template</h3>
                    <Controller
                      control={control}
                      name='template'
                      defaultValue={false}
                      render={({ field }) =>
                        <Checkbox disabled={pageDisabled} label='Copy the associated device template' {...field} />
                      }
                    />
                  </div>}
              </>
              }
              <div className={cx('field-group')}>
                <PrimaryButton disabled={pageDisabled} type='submit' text='Migrate' />
                {/* this is hidden to allow the cmd bar to submit too */}
                <button hidden={true} ref={formRef} type='submit' />
              </div>
            </div>
          </form>
        </div>
      </div >
    </div >
  );
});

function useCreateJob(data, authContext) {
  return useAsyncCallback(async (signal) => {
    try {
      await postJob(authContext, data);
    } catch (error) {
      if (signal?.aborted) {
        return;
      }
      throw error;
    }
  }, [authContext, data]);
}