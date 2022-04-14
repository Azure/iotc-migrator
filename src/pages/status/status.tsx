import classnames from 'classnames/bind';

import React from 'react';
import { DetailsList, DetailsRow, ConstrainMode, SelectionMode, MessageBar, MessageBarType } from '@fluentui/react'
import { CommandBar, ICommandBarItemProps } from '@fluentui/react/lib/CommandBar';
import usePromise from '../../hooks/usePromise';
import { AuthContext } from '../../context/authContext';
import { AppDataContext } from '../../context/appDataContext';
import { ProgressIndicator } from '@fluentui/react/lib/ProgressIndicator';
import { getJobs, Row } from '../../iotcAPI';
import { useNavigate } from 'react-router-dom';
const cx = classnames.bind(require('./status.scss'));

function Status() {
  const authContext = React.useContext(AuthContext);
  const appDataContext = React.useContext(AppDataContext);
  const navigate = useNavigate();

  const [tableData, setTableData] = React.useState<Row[]>([]);
  const [loading, data, error, fetch] = usePromise();

  const newMigration = React.useCallback(() => {
    navigate('/');
  }, [navigate]);

  const cmdBar: ICommandBarItemProps[] = React.useMemo(() => [{
    key: '1',
    text: 'Refresh',
    iconProps: {
      iconName: 'Refresh'
    },
    onClick: () => { fetch({ promiseFn: () => getJobs(authContext) }); },
    disabled: false
  }, {
    key: '2',
    text: 'New migration',
    iconProps: {
      iconName: 'Add'
    },
    onClick: newMigration,
  }], [authContext, fetch, newMigration]);


  React.useEffect(() => {
    const intervalId = setInterval(async () => {
      const response = await fetch({ promiseFn: () => getJobs(authContext) });
      if (!!response) {
        setTableData(response);
      }
    }, 2000);

    return () => clearInterval(intervalId);
  }, [setTableData, fetch, authContext]);

  React.useEffect(() => {
    if (!data) { return; }
    setTableData(data);
  }, [data])

  const _onRenderRow = (props) => {
    if (!props) {
      return null;
    }
    return <DetailsRow {...props} className={cx('row')} />;
  };

  const cols = React.useMemo(() => {
    return [
      { key: '1', name: 'Migration job name', fieldName: 'id', isResizable: true, minWidth: 150, maxWidth: 350 },
      { key: '2', name: 'Device group', fieldName: 'dgroup', isResizable: true, minWidth: 150, maxWidth: 350 },
      { key: '3', name: 'Status', fieldName: 'status', isResizable: true, minWidth: 150, maxWidth: 350 }
    ];
  }, []);

  const _onRenderItemColumn = (item, _index, column) => {
    switch (column.fieldName) {
      case 'dgroup':
        const groupId = item.dgroup;
        const group = appDataContext.groups.find(g => g.key === groupId);

        return <a target='_blank' rel='noreferrer' href={`https://${authContext.applicationHost}/device-groups/${group?.key}`}>
          {group?.text}
        </a>;
      case 'id':
        return <a target='_blank' rel='noreferrer' href={`https://${authContext.applicationHost}/jobs/instances/${item[column.fieldName]}`}>
          {item.name}
        </a>;
      default:
        return <span>{item[column.fieldName]}</span>;
    }
  }

  return (
    <div className={cx('workspace')}>
      <CommandBar className={cx('action-bar')} items={cmdBar} />
      {error && <MessageBar
        messageBarType={MessageBarType.error}
        isMultiline={true}>
        <p>{JSON.stringify(error?.response?.data?.error?.message || error.message || 'Something went wrong. Please try again')}</p>
      </MessageBar>}
      <div className={cx('status-progress')}>{!!loading && <ProgressIndicator />}</div>
      <div className={cx('workspace-container')}>
        <div className={cx('workspace-title')}>
          <h1 className={cx('title')}>Migration status</h1>
          <p>Watch all the migration process for <span className={cx('app-name')}>{authContext.applicationHost}</span>.</p>
        </div>
        <div className={cx('workspace-content')}>
          <div className={cx('workspace-table', { 'status-padding': loading })}>
            <DetailsList
              compact={true}
              items={tableData}
              columns={cols}
              selectionMode={SelectionMode.none}
              constrainMode={ConstrainMode.unconstrained}
              onRenderRow={_onRenderRow}
              onRenderItemColumn={_onRenderItemColumn}
              setKey='set'
              className={cx('table')}
            />
          </div>
        </div>

      </div>
    </div>
  );
}

export default Status;